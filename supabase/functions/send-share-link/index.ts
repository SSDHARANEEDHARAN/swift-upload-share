import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareLinkRequest {
  shareLink: string;
  fileCount: number;
  totalSize: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareLink, fileCount, totalSize }: ShareLinkRequest = await req.json();

    console.log("Sending share link email:", { shareLink, fileCount, totalSize });

    const emailResponse = await resend.emails.send({
      from: "File Transfer <onboarding@resend.dev>",
      to: ["tharaneetharanss@gmail.com"],
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-share-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
