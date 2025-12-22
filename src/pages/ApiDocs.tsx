import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ApiPlayground } from "@/components/ApiPlayground";

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-4">API Documentation</h1>
        <p className="text-muted-foreground mb-8">
          Integrate Rise to Live file sharing capabilities into your applications.
        </p>

        <div className="space-y-8">
          {/* Authentication */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using a Bearer token. Include your API key in the Authorization header.
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </div>
          </section>

          {/* Base URL */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Base URL</h2>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <code>https://api.risetolive.com/v1</code>
            </div>
          </section>

          {/* Upload Endpoint */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">POST</Badge>
              <h2 className="text-xl font-semibold">/upload</h2>
            </div>
            <p className="text-muted-foreground mb-4">Upload a file and receive a shareable link.</p>
            
            <h3 className="font-medium mb-2">Request Body (multipart/form-data)</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm mb-4">
              <pre>{`file: File (required)
expires_in: number (optional, hours)
password: string (optional)`}</pre>
            </div>

            <h3 className="font-medium mb-2">Response</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "success": true,
  "share_url": "https://risetolive.com/download/abc123",
  "share_token": "abc123",
  "expires_at": "2024-01-15T12:00:00Z"
}`}</pre>
            </div>
          </section>

          {/* Get File Info */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">GET</Badge>
              <h2 className="text-xl font-semibold">/files/:token</h2>
            </div>
            <p className="text-muted-foreground mb-4">Get information about a shared file.</p>

            <h3 className="font-medium mb-2">Response</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "filename": "document.pdf",
  "file_size": 1048576,
  "file_type": "application/pdf",
  "created_at": "2024-01-14T10:00:00Z",
  "expires_at": "2024-01-15T12:00:00Z",
  "download_count": 5
}`}</pre>
            </div>
          </section>

          {/* Download Endpoint */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">GET</Badge>
              <h2 className="text-xl font-semibold">/download/:token</h2>
            </div>
            <p className="text-muted-foreground mb-4">Download a file using its share token.</p>

            <h3 className="font-medium mb-2">Query Parameters</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm mb-4">
              <pre>{`password: string (if file is password protected)`}</pre>
            </div>

            <h3 className="font-medium mb-2">Response</h3>
            <p className="text-muted-foreground">Returns the file as a binary stream with appropriate Content-Type headers.</p>
          </section>

          {/* Delete Endpoint */}
          <section className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-red-500/20 text-red-500 border-red-500/30">DELETE</Badge>
              <h2 className="text-xl font-semibold">/files/:token</h2>
            </div>
            <p className="text-muted-foreground mb-4">Delete a file you uploaded.</p>

            <h3 className="font-medium mb-2">Response</h3>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <pre>{`{
  "success": true,
  "message": "File deleted successfully"
}`}</pre>
            </div>
          </section>

          {/* Rate Limits */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Upload: 100 requests per hour</li>
              <li>Download: 1000 requests per hour</li>
              <li>File Info: 500 requests per hour</li>
            </ul>
          </section>

          {/* Error Codes */}
          <section className="border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Error Codes</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex gap-4">
                <code className="font-mono text-foreground">400</code>
                <span>Bad Request - Invalid parameters</span>
              </div>
              <div className="flex gap-4">
                <code className="font-mono text-foreground">401</code>
                <span>Unauthorized - Invalid or missing API key</span>
              </div>
              <div className="flex gap-4">
                <code className="font-mono text-foreground">404</code>
                <span>Not Found - File does not exist or has expired</span>
              </div>
              <div className="flex gap-4">
                <code className="font-mono text-foreground">429</code>
                <span>Too Many Requests - Rate limit exceeded</span>
              </div>
              <div className="flex gap-4">
                <code className="font-mono text-foreground">500</code>
                <span>Internal Server Error</span>
              </div>
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
