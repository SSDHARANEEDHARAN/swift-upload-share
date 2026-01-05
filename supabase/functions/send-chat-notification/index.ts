import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatNotificationRequest {
  type: "invitation" | "expiring" | "new_message";
  recipientEmail: string;
  recipientName: string;
  inviterName?: string;
  senderName?: string;
  roomName?: string;
  expiresIn?: string;
  messagePreview?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, inviterName, senderName, roomName, expiresIn, messagePreview }: ChatNotificationRequest = await req.json();

    let subject: string;
    let html: string;

    if (type === "invitation") {
      subject = `${inviterName} invited you to a chat!`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px;">Chat Invitation</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${recipientName},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            <strong>${inviterName}</strong> has invited you to join "${roomName || 'a chat room'}".
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Log in to your account to accept the invitation and start chatting!
          </p>
          <a href="${Deno.env.get("SITE_URL") || "https://swift-upload-share.lovable.app"}" 
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Open Chat
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 24px;">
            Best regards,<br>Swift Upload & Share Team
          </p>
        </div>
      `;
    } else if (type === "new_message") {
      subject = `New message from ${senderName} in ${roomName || 'Chat'}`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px;">💬 New Message</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${recipientName},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            <strong>${senderName}</strong> sent a message in "${roomName || 'Chat'}":
          </p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;">
            <p style="color: #333; font-size: 16px; margin: 0; font-style: italic;">
              "${messagePreview || 'New message'}"
            </p>
          </div>
          <a href="${Deno.env.get("SITE_URL") || "https://swift-upload-share.lovable.app"}" 
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Reply Now
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 24px;">
            Best regards,<br>Swift Upload & Share Team
          </p>
        </div>
      `;
    } else {
      subject = "Your chat is about to expire!";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px;">⚠️ Chat Expiring Soon</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${recipientName},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your chat "${roomName || 'Chat Room'}" has been inactive and will be <strong>deleted in ${expiresIn}</strong>.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Send a message to keep the chat active!
          </p>
          <a href="${Deno.env.get("SITE_URL") || "https://swift-upload-share.lovable.app"}" 
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Open Chat
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 24px;">
            Best regards,<br>Swift Upload & Share Team
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Swift Upload <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Chat notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending chat notification:", error);
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
