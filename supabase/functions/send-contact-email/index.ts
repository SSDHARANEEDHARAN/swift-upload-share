import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Sanitize HTML to prevent XSS in emails
const sanitizeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Input length limits
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 10000;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Extract and validate types
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate lengths
    if (name.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Name must be ${MAX_NAME_LENGTH} characters or less` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (email.length > MAX_EMAIL_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Email must be ${MAX_EMAIL_LENGTH} characters or less` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or less` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format with stricter regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize all user inputs to prevent XSS in email HTML
    const safeName = sanitizeHtml(name);
    const safeEmail = sanitizeHtml(email);
    const safeSubject = sanitizeHtml(subject);
    const safeMessage = sanitizeHtml(message);

    console.log(`Sending contact email from ${safeName}`);

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "Rise to Live <onboarding@resend.dev>",
      to: ["tharaneetharanss@gmail.com"],
      reply_to: email, // Use original email for reply-to (not displayed in HTML)
      subject: `[Contact Form] ${safeSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h3 style="margin-top: 0;">Message:</h3>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            This email was sent from the Rise to Live contact form.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send confirmation to user
    await resend.emails.send({
      from: "Rise to Live <onboarding@resend.dev>",
      to: [email], // Use original email for delivery
      subject: "We received your message!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for contacting us, ${safeName}!</h2>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your message:</strong></p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p>Best regards,<br>The Rise to Live Team</p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    // Return generic error message to avoid leaking internal details
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
