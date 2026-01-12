import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FileRow = {
  id: string;
  filename: string;
  file_size: number;
  file_type: string | null;
  storage_path: string;
  batch_id: string | null;
  created_at: string | null;
  expires_at: string | null;
  download_count: number | null;
  user_id: string | null;
  share_token: string;
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
    const shareToken = String(body?.shareToken ?? "");

    if (!/^[a-f0-9]{32}$/.test(shareToken)) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: rows, error: dbError } = await supabaseAdmin
      .from("files")
      .select(
        "id, filename, file_size, file_type, storage_path, batch_id, created_at, expires_at, download_count, user_id, share_token",
      )
      .eq("share_token", shareToken)
      .order("created_at", { ascending: true });

    if (dbError) {
      console.error("download-manifest dbError", dbError);
      return new Response(JSON.stringify({ error: "Failed to load files" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const activeRows = (rows ?? []).filter((r: FileRow) => {
      if (!r.expires_at) return true;
      return new Date(r.expires_at).getTime() > now;
    });

    if (activeRows.length === 0) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const files = [] as Array<
      Omit<FileRow, "share_token"> & {
        downloadUrl: string;
        urlExpiresInSeconds: number;
      }
    >;

    for (const file of activeRows) {
      // Longer expiry for large files:
      // - Files > 1GB: 24 hours (for very large downloads)
      // - Files > 100MB: 6 hours
      // - Otherwise: 1 hour
      const isVeryLargeFile = file.file_size > 1024 * 1024 * 1024;
      const isLargeFile = file.file_size > 100 * 1024 * 1024;
      const urlExpiresInSeconds = isVeryLargeFile ? 24 * 60 * 60 : isLargeFile ? 6 * 60 * 60 : 60 * 60;
      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from("transfers")
        .createSignedUrl(file.storage_path, urlExpiresInSeconds);

      if (signedErr || !signed?.signedUrl) {
        console.error("download-manifest signedErr", signedErr);
        return new Response(JSON.stringify({ error: "Failed to create download URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { share_token: _ignore, ...rest } = file;

      files.push({
        ...rest,
        downloadUrl: signed.signedUrl,
        urlExpiresInSeconds,
      });
    }

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("download-manifest error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
