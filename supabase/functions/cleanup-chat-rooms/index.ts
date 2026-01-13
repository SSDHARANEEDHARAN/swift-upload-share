import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cleanup-secret',
};

const INACTIVITY_DAYS = 5;
const WARNING_HOURS = 5;

// Secret for authenticating cleanup calls - uses same secret as cleanup-expired-files
const CLEANUP_SECRET = Deno.env.get("CLEANUP_SECRET");

if (!CLEANUP_SECRET) {
  console.error("CLEANUP_SECRET environment variable must be set");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate the cleanup secret to prevent unauthorized access
    const providedSecret = req.headers.get("x-cleanup-secret");
    if (!CLEANUP_SECRET || providedSecret !== CLEANUP_SECRET) {
      console.warn("Unauthorized cleanup attempt - invalid or missing secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const warningThreshold = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const deleteThreshold = new Date(now.getTime() - (INACTIVITY_DAYS * 24 + WARNING_HOURS) * 60 * 60 * 1000);

    console.log("Starting chat room cleanup...");
    console.log("Warning threshold:", warningThreshold.toISOString());
    console.log("Delete threshold:", deleteThreshold.toISOString());

    // Delete rooms that have been inactive past the warning period
    const { data: deletedRooms, error: deleteError } = await supabase
      .from('chat_rooms')
      .delete()
      .lt('last_activity_at', deleteThreshold.toISOString())
      .not('warning_shown_at', 'is', null)
      .select();

    if (deleteError) {
      console.error("Error deleting rooms:", deleteError);
    } else {
      console.log("Deleted rooms:", deletedRooms?.length || 0);
    }

    // Mark rooms for warning that are inactive
    const { data: warnedRooms, error: warnError } = await supabase
      .from('chat_rooms')
      .update({ warning_shown_at: now.toISOString() })
      .lt('last_activity_at', warningThreshold.toISOString())
      .is('warning_shown_at', null)
      .select();

    if (warnError) {
      console.error("Error warning rooms:", warnError);
    } else {
      console.log("Warned rooms:", warnedRooms?.length || 0);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedRooms?.length || 0,
        warned: warnedRooms?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
