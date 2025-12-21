import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path ?? "");
    const expectedBytes = Number(body?.expectedBytes ?? NaN);

    if (!path || path.length > 1024 || path.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Number.isFinite(expectedBytes) || expectedBytes <= 0) {
      return new Response(JSON.stringify({ error: "Invalid expectedBytes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: obj, error: objErr } = await supabaseAdmin
      .schema("storage")
      .from("objects")
      .select("metadata")
      .eq("bucket_id", "transfers")
      .eq("name", path)
      .maybeSingle();

    if (objErr) {
      console.error("verify-upload objErr", objErr);
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actualBytesRaw = (obj as any)?.metadata?.size;
    const actualBytes = typeof actualBytesRaw === "number" ? actualBytesRaw : Number(actualBytesRaw);

    if (!obj || !Number.isFinite(actualBytes)) {
      return new Response(JSON.stringify({ ok: false, reason: "not_found", actualBytes: null }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ok = actualBytes === expectedBytes;

    if (!ok) {
      // Best-effort cleanup of bad object to avoid broken share links.
      await supabaseAdmin.storage.from("transfers").remove([path]).catch(() => undefined);

      return new Response(
        JSON.stringify({ ok: false, reason: "size_mismatch", actualBytes }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, actualBytes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("verify-upload error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
