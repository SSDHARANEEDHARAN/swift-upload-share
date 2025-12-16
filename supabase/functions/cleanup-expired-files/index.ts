import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
};

// Secret for authenticating cron/scheduled calls
const CLEANUP_SECRET = Deno.env.get("CLEANUP_SECRET") || "default-cleanup-secret-change-me";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate the cleanup secret to prevent unauthorized access
    const providedSecret = req.headers.get("x-cleanup-secret");
    if (providedSecret !== CLEANUP_SECRET) {
      console.warn("Unauthorized cleanup attempt - invalid or missing secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
      throw new Error("Failed to fetch expired files");
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
    let errorCount = 0;

    // Delete from storage first
    for (const file of expiredFiles) {
      try {
        const { error: storageError } = await supabase.storage
          .from("transfers")
          .remove([file.storage_path]);

        if (storageError) {
          console.error(`Storage delete failed for file ${file.id}`);
          errorCount++;
        } else {
          storageDeletedCount++;
        }
      } catch (err: any) {
        console.error(`Storage delete exception for file ${file.id}`);
        errorCount++;
      }
    }

    // Delete from database
    const { error: deleteError, count } = await supabase
      .from("files")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (deleteError) {
      console.error("Error deleting from database:", deleteError.message);
      errorCount++;
    } else {
      deletedCount = count || expiredFiles.length;
    }

    // Return sanitized result (no internal details)
    const result = {
      message: "Cleanup completed",
      filesProcessed: expiredFiles.length,
      storageDeleted: storageDeletedCount,
      databaseDeleted: deletedCount,
      hasErrors: errorCount > 0,
    };

    console.log("Cleanup result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    // Log error details server-side only, return generic message to client
    console.error("Cleanup function error:", error.message);
    return new Response(
      JSON.stringify({ error: "Cleanup operation failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
