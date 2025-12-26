import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find API keys expiring in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const now = new Date();

    const { data: expiringKeys, error: keysError } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, expires_at, user_id")
      .eq("is_revoked", false)
      .not("expires_at", "is", null)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", threeDaysFromNow.toISOString());

    if (keysError) {
      console.error("Error fetching expiring keys:", keysError);
      throw keysError;
    }

    if (!expiringKeys || expiringKeys.length === 0) {
      console.log("No expiring keys found");
      return new Response(
        JSON.stringify({ message: "No expiring keys found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${expiringKeys.length} expiring keys`);

    // Get user emails from profiles
    const userIds = [...new Set(expiringKeys.map(k => k.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Send notifications
    const notifications = [];
    for (const key of expiringKeys) {
      const profile = profileMap.get(key.user_id);
      if (!profile?.email) {
        console.log(`No email found for user ${key.user_id}`);
        continue;
      }

      const expiresAt = new Date(key.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      try {
        await resend.emails.send({
          from: "Rise to Live <onboarding@resend.dev>",
          to: [profile.email],
          subject: `API Key "${key.name}" expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">API Key Expiration Notice</h2>
              <p>Hi ${profile.display_name || 'there'},</p>
              <p>Your API key is about to expire:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Key Name:</strong> ${key.name}</p>
                <p><strong>Key Prefix:</strong> ${key.key_prefix}...</p>
                <p><strong>Expires:</strong> ${expiresAt.toLocaleDateString()} (${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} remaining)</p>
              </div>
              <p>To continue using our API without interruption, please generate a new API key before this one expires.</p>
              <p>Best regards,<br>The Rise to Live Team</p>
            </div>
          `,
        });
        notifications.push({ keyId: key.id, email: profile.email, status: "sent" });
        console.log(`Notification sent for key ${key.id} to ${profile.email}`);
      } catch (emailError: any) {
        console.error(`Failed to send email for key ${key.id}:`, emailError);
        notifications.push({ keyId: key.id, email: profile.email, status: "failed", error: emailError?.message || "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-expiring-keys function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
