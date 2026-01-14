import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ApiPlayground } from "@/components/ApiPlayground";
import { CodeExamples } from "@/components/CodeExamples";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

const ApiDocs = () => {
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-4">THARANEETHARAN API Documentation</h1>
        <p className="text-muted-foreground mb-8">
          Integrate THARANEETHARAN secure file sharing capabilities into your applications with our REST API.
        </p>

        <div className="space-y-8">
          {/* Quick Start */}
          <section className="border border-border rounded-lg p-6 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Quick Start
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Generate an API key from your dashboard below</li>
              <li>Include the API key in the Authorization header</li>
              <li>Make requests to the endpoints documented below</li>
              <li>Handle responses and errors appropriately</li>
            </ol>
          </section>

          {/* API Key Manager */}
          <ApiKeyManager />

          {/* Authentication */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using a Bearer token. Include your API key in the Authorization header.
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </div>
            <Alert className="mt-4 border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Keep your API key secure. Never expose it in client-side code or public repositories.
              </AlertDescription>
            </Alert>
          </section>

          {/* Base URL */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Base URL</h2>
            <p className="text-muted-foreground mb-4">
              All API endpoints are relative to the base URL:
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-sm break-all">
              <code>{baseUrl}</code>
            </div>
          </section>

          {/* Upload Endpoint */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">POST</Badge>
              <h2 className="text-xl font-semibold">/verify-upload</h2>
            </div>
            <p className="text-muted-foreground mb-4">Verify and finalize a file upload.</p>
            
            <h3 className="font-medium mb-2">Request Body (JSON)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm mb-4">
              <pre>{`{
  "share_token": "string (required)",
  "file_size": "number (required)",
  "filename": "string (required)"
}`}</pre>
            </div>

            <h3 className="font-medium mb-2">Response (200 OK)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "success": true,
  "share_url": "https://safe.app/download/abc123def456",
  "share_token": "abc123def456789",
  "expires_at": "2026-01-08T12:00:00Z"
}`}</pre>
            </div>

            <CodeExamples 
              endpoint="/verify-upload" 
              method="POST" 
              hasBody={true}
              bodyExample='{"share_token": "abc123", "file_size": 1048576, "filename": "document.pdf"}'
            />
          </section>

          {/* Download Manifest */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">POST</Badge>
              <h2 className="text-xl font-semibold">/download-manifest</h2>
            </div>
            <p className="text-muted-foreground mb-4">Get file information and download URLs for a share token.</p>

            <h3 className="font-medium mb-2">Request Body (JSON)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm mb-4">
              <pre>{`{
  "share_token": "string (required)"
}`}</pre>
            </div>

            <h3 className="font-medium mb-2">Response (200 OK)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "files": [
    {
      "filename": "document.pdf",
      "file_size": 1048576,
      "file_type": "application/pdf",
      "download_url": "https://...",
      "created_at": "2026-01-01T10:00:00Z",
      "expires_at": "2026-01-08T10:00:00Z"
    }
  ],
  "total_size": 1048576,
  "file_count": 1
}`}</pre>
            </div>

            <CodeExamples 
              endpoint="/download-manifest" 
              method="POST"
              hasBody={true}
              bodyExample='{"share_token": "abc123def456789"}'
            />
          </section>

          {/* Send Share Link */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">POST</Badge>
              <h2 className="text-xl font-semibold">/send-share-link</h2>
            </div>
            <p className="text-muted-foreground mb-4">Send a file share link to recipients via email.</p>

            <h3 className="font-medium mb-2">Request Body (JSON)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm mb-4">
              <pre>{`{
  "recipients": ["email1@example.com", "email2@example.com"],
  "share_url": "https://safe.app/download/abc123",
  "message": "Optional message to recipients",
  "sender_name": "John Doe"
}`}</pre>
            </div>

            <h3 className="font-medium mb-2">Response (200 OK)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "success": true,
  "sent_count": 2,
  "message": "Share link sent to 2 recipients"
}`}</pre>
            </div>

            <CodeExamples 
              endpoint="/send-share-link" 
              method="POST" 
              hasBody={true}
              bodyExample='{"recipients": ["user@example.com"], "share_url": "https://safe.app/download/abc123"}'
            />
          </section>

          {/* Rate Limits */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
            <p className="text-muted-foreground mb-4">
              API rate limits help ensure fair usage and service stability.
            </p>
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Upload / Verify</span>
                <Badge variant="outline">100 requests/hour</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Download Manifest</span>
                <Badge variant="outline">500 requests/hour</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Send Share Link</span>
                <Badge variant="outline">50 requests/hour</Badge>
              </div>
            </div>
            <Alert className="mt-4 border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Rate limit headers are included in all responses: <code className="text-xs">X-RateLimit-Remaining</code>, <code className="text-xs">X-RateLimit-Reset</code>
              </AlertDescription>
            </Alert>
          </section>

          {/* Error Codes */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Error Codes</h2>
            <p className="text-muted-foreground mb-4">
              The API uses standard HTTP status codes to indicate success or failure.
            </p>
            <div className="space-y-3">
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-green-500 font-bold w-12">200</code>
                <span className="text-muted-foreground">Success - Request completed successfully</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-amber-500 font-bold w-12">400</code>
                <span className="text-muted-foreground">Bad Request - Invalid or missing parameters</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-red-500 font-bold w-12">401</code>
                <span className="text-muted-foreground">Unauthorized - Invalid or missing API key</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-amber-500 font-bold w-12">402</code>
                <span className="text-muted-foreground">Payment Required - Credits exhausted</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-red-500 font-bold w-12">404</code>
                <span className="text-muted-foreground">Not Found - Resource does not exist or has expired</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-orange-500 font-bold w-12">429</code>
                <span className="text-muted-foreground">Too Many Requests - Rate limit exceeded</span>
              </div>
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                <code className="font-mono text-red-500 font-bold w-12">500</code>
                <span className="text-muted-foreground">Internal Server Error - Something went wrong</span>
              </div>
            </div>

            <h3 className="font-medium mt-6 mb-2">Error Response Format</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}`}</pre>
            </div>
          </section>

          {/* API Playground */}
          <ApiPlayground />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ApiDocs;
