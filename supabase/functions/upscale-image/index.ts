import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "transfers";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

const extFromContentType = (contentType: string) => {
  const ct = contentType.toLowerCase();
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  return "bin";
};

const decodeBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

async function prepareFetchableImageUrl(
  supabaseAdmin: any,
  image: string,
): Promise<{ url: string; cleanupPath: string | null }> {
  let bytes: Uint8Array;
  let contentType = "application/octet-stream";

  if (image.startsWith("data:")) {
    const commaIndex = image.indexOf(",");
    if (commaIndex === -1) throw new Error("Invalid image data URL");

    const header = image.slice(0, commaIndex);
    const base64 = image.slice(commaIndex + 1);

    const mimeMatch = header.match(/^data:(.*?);base64$/);
    if (!mimeMatch) throw new Error("Invalid image data URL header");

    contentType = mimeMatch[1] || contentType;
    bytes = decodeBase64(base64);
  } else if (image.startsWith("http://") || image.startsWith("https://")) {
    const resp = await fetch(image, { redirect: "follow" });
    if (!resp.ok) {
      throw new Error(`Failed to fetch image (${resp.status})`);
    }
    contentType = resp.headers.get("content-type") || contentType;
    bytes = new Uint8Array(await resp.arrayBuffer());
  } else {
    throw new Error("Invalid image format. Provide a data URL or http(s) URL.");
  }

  if (bytes.byteLength > 15 * 1024 * 1024) {
    throw new Error("Image is too large (max 15MB)");
  }

  const ext = extFromContentType(contentType);
  const path = `ai-temp/${crypto.randomUUID()}.${ext}`;

  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const uploadBody = new Blob([ab], { type: contentType });
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, uploadBody, { contentType, upsert: true });

  if (uploadError) {
    console.error("prepareFetchableImageUrl uploadError", uploadError);
    throw new Error("Failed to stage image for AI processing");
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error("prepareFetchableImageUrl signError", signError);
    await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw new Error("Failed to create a temporary image URL");
  }

  return { url: signed.signedUrl, cleanupPath: path };
}

async function authenticateUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please sign in to use AI features." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !data?.user) {
    console.error("Auth validation failed:", error);
    return new Response(
      JSON.stringify({ error: "Invalid or expired authentication token. Please sign in again." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return { userId: data.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let cleanupPath: string | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user before processing
    const authResult = await authenticateUser(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userId } = authResult;
    console.log("Authenticated user:", userId);

    const { image, scale = 2 } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "Image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Upscaling image with scale:", scale);

    const prepared = await prepareFetchableImageUrl(supabaseAdmin, image);
    cleanupPath = prepared.cleanupPath;

    // Use Lovable AI Gateway with image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Upscale and enhance this image to ${scale}x resolution. Maintain all details, improve sharpness, and enhance quality while keeping the original content exactly the same. Create a high-resolution, detailed version.`,
              },
              {
                type: "image_url",
                image_url: { url: prepared.url },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Failed to upscale image");
    }

    const data = await response.json();
    console.log("Image upscaled successfully");

    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in response. Full response:", JSON.stringify(data));
      throw new Error("No image generated. The AI model may not have produced an image for this prompt.");
    }

    return new Response(JSON.stringify({ image: generatedImage, scale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in upscale-image function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    if (cleanupPath) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin.storage.from(BUCKET).remove([cleanupPath]).catch(() => undefined);
      }
    }
  }
});
