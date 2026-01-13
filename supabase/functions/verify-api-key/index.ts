import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApiKeyRecord {
  id: string;
  user_id: string;
  expires_at: string | null;
  is_revoked: boolean;
  request_count: number | null;
  rate_limit: number | null;
  rate_limit_reset_at: string | null;
}

/**
 * Hashes an API key using SHA-256.
 */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies an API key and returns the associated user information.
 * Also handles rate limiting and usage tracking.
 */
async function verifyApiKey(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  authHeader: string | null
): Promise<{ valid: true; userId: string; keyId: string } | { valid: false; error: string; status: number }> {
  // Check for Bearer token with rtl_ prefix
  if (!authHeader?.startsWith("Bearer rtl_")) {
    return { valid: false, error: "Invalid API key format. Expected: Bearer rtl_<key>", status: 401 };
  }

  const providedKey = authHeader.replace("Bearer ", "");
  
  // Validate key format
  if (providedKey.length < 20 || providedKey.length > 100) {
    return { valid: false, error: "Invalid API key format", status: 401 };
  }

  // Extract prefix and compute hash
  const keyPrefix = providedKey.substring(0, 8);
  const keyHash = await hashKey(providedKey);

  // Look up the API key
  const { data, error: lookupError } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, expires_at, is_revoked, request_count, rate_limit, rate_limit_reset_at")
    .eq("key_hash", keyHash)
    .eq("key_prefix", keyPrefix)
    .single();

  if (lookupError || !data) {
    console.log("API key lookup failed:", lookupError?.message || "Key not found");
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  // Cast the data to our expected type
  const apiKey = data as ApiKeyRecord;

  // Check if key is revoked
  if (apiKey.is_revoked) {
    return { valid: false, error: "API key has been revoked", status: 401 };
  }

  // Check if key is expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired", status: 401 };
  }

  // Check rate limit (reset monthly)
  const now = new Date();
  let requestCount = apiKey.request_count || 0;
  const rateLimit = apiKey.rate_limit || 1000;
  const resetAt = apiKey.rate_limit_reset_at ? new Date(apiKey.rate_limit_reset_at) : null;

  // Reset counter if we've passed the reset time
  if (resetAt && now > resetAt) {
    requestCount = 0;
  }

  // Enforce rate limit
  if (requestCount >= rateLimit) {
    return { 
      valid: false,
      error: `Rate limit exceeded. Limit: ${rateLimit} requests per month`, 
      status: 429 
    };
  }

  // Calculate next reset time (first day of next month)
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Update usage tracking
  const { error: updateError } = await supabaseAdmin
    .from("api_keys")
    .update({
      last_used_at: now.toISOString(),
      request_count: requestCount + 1,
      rate_limit_reset_at: nextReset.toISOString(),
    })
    .eq("id", apiKey.id);

  if (updateError) {
    console.error("Failed to update API key usage:", updateError.message);
    // Don't fail the request for tracking errors
  }

  return { valid: true, userId: apiKey.user_id, keyId: apiKey.id };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the API key from Authorization header
    const authHeader = req.headers.get("Authorization");

    // Verify the API key
    const result = await verifyApiKey(supabaseAdmin, authHeader);

    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return success with user info
    return new Response(
      JSON.stringify({
        valid: true,
        userId: result.userId,
        keyId: result.keyId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("verify-api-key error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
