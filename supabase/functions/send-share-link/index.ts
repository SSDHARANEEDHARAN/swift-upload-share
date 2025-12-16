import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Allowed origins for CORS - restrict to your domains
const allowedOrigins = [
  "https://uwioiguiqznpxizeekpi.lovableproject.com",
  "https://uwioiguiqznpxizeekpi.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

// Input validation schema
const ShareLinkRequestSchema = z.object({
  shareLink: z.string().url("Invalid share link URL"),
  fileCount: z.number().int().positive("File count must be positive"),
  totalSize: z.string().min(1, "Total size is required"),
});

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client and get user from token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Unable to verify user or user has no email" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = ShareLinkRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { shareLink, fileCount, totalSize } = validationResult.data;

    const emailResponse = await resend.emails.send({
      from: "File Transfer <onboarding@resend.dev>",
      to: [user.email],
      subject: `File Transfer Complete - ${fileCount} file${fileCount > 1 ? 's' : ''} ready`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6; }
              .link-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .share-link { word-break: break-all; color: #8B5CF6; font-size: 14px; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 6px; display: block; margin: 15px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; }
              .stat { text-align: center; }
              .stat-value { font-size: 24px; font-weight: bold; color: #8B5CF6; }
              .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">✓ Upload Complete!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your files are ready to share</p>
              </div>
              
              <div class="content">
                <div class="info-box">
                  <div class="stats">
                    <div class="stat">
                      <div class="stat-value">${fileCount}</div>
                      <div class="stat-label">File${fileCount > 1 ? 's' : ''}</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">${totalSize}</div>
                      <div class="stat-label">Total Size</div>
                    </div>
                  </div>
                </div>

                <div class="link-box">
                  <h2 style="margin-top: 0; color: #1f2937;">Your Share Link</h2>
                  <p style="color: #6b7280; margin-bottom: 15px;">
                    Use this link to access and download your files. This link is valid for 7 days.
                  </p>
                  <code class="share-link">${shareLink}</code>
                  <a href="${shareLink}" class="button">Open Files</a>
                </div>

                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    <strong style="color: #1f2937;">📌 Quick Tips:</strong><br>
                    • Files will be available for 7 days<br>
                    • Share this link with anyone who needs access<br>
                    • Recipients don't need to create an account<br>
                    • Downloads are tracked automatically
                  </p>
                </div>
              </div>

              <div class="footer">
                <p>This is an automated notification from File Transfer</p>
                <p>Powered by File Transfer System</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
