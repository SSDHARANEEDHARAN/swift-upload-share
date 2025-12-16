import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role key for admin access to delete files
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of expired files...");

    // Find all expired files
    const { data: expiredFiles, error: selectError } = await supabase
      .from("files")
      .select("id, storage_path, filename")
      .lt("expires_at", new Date().toISOString());

    if (selectError) {
      console.error("Error fetching expired files:", selectError.message);
      throw selectError;
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      console.log("No expired files found");
      return new Response(
        JSON.stringify({ message: "No expired files to clean up", deleted: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${expiredFiles.length} expired files to delete`);

    let deletedCount = 0;
    let storageDeletedCount = 0;
    const errors: string[] = [];

    // Delete from storage first
    for (const file of expiredFiles) {
      try {
        const { error: storageError } = await supabase.storage
          .from("transfers")
          .remove([file.storage_path]);

        if (storageError) {
          errors.push(`Storage delete failed for ${file.filename}: ${storageError.message}`);
        } else {
          storageDeletedCount++;
        }
      } catch (err: any) {
        errors.push(`Storage delete exception for ${file.filename}: ${err.message}`);
      }
    }

    // Delete from database
    const { error: deleteError, count } = await supabase
      .from("files")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (deleteError) {
      console.error("Error deleting from database:", deleteError.message);
      errors.push(`Database delete failed: ${deleteError.message}`);
    } else {
      deletedCount = count || expiredFiles.length;
    }

    const result = {
      message: "Cleanup completed",
      filesProcessed: expiredFiles.length,
      storageDeleted: storageDeletedCount,
      databaseDeleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Cleanup result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Cleanup function error:", error.message);
    return new Response(
      JSON.stringify({ error: "Cleanup failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
