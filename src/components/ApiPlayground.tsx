import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type HttpMethod = "GET" | "POST" | "DELETE";

interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
}

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/upload",
    description: "Upload a file and receive a shareable link",
    body: [
      { name: "file", type: "File", required: true, description: "The file to upload" },
      { name: "expires_in", type: "number", required: false, description: "Expiration time in hours" },
      { name: "password", type: "string", required: false, description: "Optional password protection" },
    ],
  },
  {
    method: "GET",
    path: "/files/:token",
    description: "Get information about a shared file",
    params: [
      { name: "token", type: "string", required: true, description: "The share token" },
    ],
  },
  {
    method: "GET",
    path: "/download/:token",
    description: "Download a file using its share token",
    params: [
      { name: "token", type: "string", required: true, description: "The share token" },
      { name: "password", type: "string", required: false, description: "Password if file is protected" },
    ],
  },
  {
    method: "DELETE",
    path: "/files/:token",
    description: "Delete a file you uploaded",
    params: [
      { name: "token", type: "string", required: true, description: "The share token" },
    ],
  },
];

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  POST: "bg-green-500/20 text-green-500 border-green-500/30",
  DELETE: "bg-red-500/20 text-red-500 border-red-500/30",
};

export const ApiPlayground = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyValues, setBodyValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentEndpoint = endpoints.find(
    (e) => `${e.method} ${e.path}` === selectedEndpoint
  );

  const handleEndpointChange = (value: string) => {
    setSelectedEndpoint(value);
    setParamValues({});
    setBodyValues({});
    setResponse("");
  };

  const buildCurlCommand = () => {
    if (!currentEndpoint) return "";

    let path = currentEndpoint.path;
    currentEndpoint.params?.forEach((param) => {
      if (paramValues[param.name]) {
        path = path.replace(`:${param.name}`, paramValues[param.name]);
      }
    });

    const baseUrl = "https://api.risetolive.com/v1";
    let curl = `curl -X ${currentEndpoint.method} "${baseUrl}${path}"`;
    
    if (apiKey) {
      curl += ` \\\n  -H "Authorization: Bearer ${apiKey}"`;
    }

    if (currentEndpoint.method === "POST" && currentEndpoint.body) {
      curl += ` \\\n  -H "Content-Type: multipart/form-data"`;
      currentEndpoint.body.forEach((field) => {
        if (bodyValues[field.name]) {
          curl += ` \\\n  -F "${field.name}=${field.type === "File" ? "@" : ""}${bodyValues[field.name]}"`;
        }
      });
    }

    return curl;
  };

  const handleCopy = async () => {
    const curl = buildCurlCommand();
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    toast.success("cURL command copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async () => {
    if (!currentEndpoint) return;

    setIsLoading(true);
    
    // Simulate API response for demo purposes
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResponses: Record<string, object> = {
      "POST /upload": {
        success: true,
        share_url: "https://risetolive.com/download/abc123",
        share_token: "abc123",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      "GET /files/:token": {
        filename: "document.pdf",
        file_size: 1048576,
        file_type: "application/pdf",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        download_count: 5,
      },
      "GET /download/:token": {
        message: "File download would start here (binary stream)",
      },
      "DELETE /files/:token": {
        success: true,
        message: "File deleted successfully",
      },
    };

    const mockResponse = mockResponses[selectedEndpoint] || { error: "Unknown endpoint" };
    setResponse(JSON.stringify(mockResponse, null, 2));
    setIsLoading(false);
  };

  return (
    <section className="border border-border rounded-lg p-6 bg-card/50">
      <h2 className="text-xl font-semibold mb-4">API Playground</h2>
      <p className="text-muted-foreground mb-6">
        Test API endpoints interactively. Note: This is a demo environment with simulated responses.
      </p>

      <div className="space-y-6">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Endpoint Selection */}
        <div className="space-y-2">
          <Label>Endpoint</Label>
          <Select value={selectedEndpoint} onValueChange={handleEndpointChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an endpoint" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem
                  key={`${endpoint.method} ${endpoint.path}`}
                  value={`${endpoint.method} ${endpoint.path}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={methodColors[endpoint.method]}>
                      {endpoint.method}
                    </Badge>
                    <span>{endpoint.path}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentEndpoint && (
            <p className="text-sm text-muted-foreground">{currentEndpoint.description}</p>
          )}
        </div>

        {/* Parameters */}
        {currentEndpoint?.params && currentEndpoint.params.length > 0 && (
          <div className="space-y-4">
            <Label>Path / Query Parameters</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {currentEndpoint.params.map((param) => (
                <div key={param.name} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={param.name} className="text-sm">
                      {param.name}
                    </Label>
                    {param.required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                  <Input
                    id={param.name}
                    placeholder={param.description}
                    value={paramValues[param.name] || ""}
                    onChange={(e) =>
                      setParamValues({ ...paramValues, [param.name]: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Body */}
        {currentEndpoint?.body && currentEndpoint.body.length > 0 && (
          <div className="space-y-4">
            <Label>Request Body</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {currentEndpoint.body.map((field) => (
                <div key={field.name} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={field.name} className="text-sm">
                      {field.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({field.type})
                      </span>
                    </Label>
                    {field.required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                  <Input
                    id={field.name}
                    placeholder={field.description}
                    value={bodyValues[field.name] || ""}
                    onChange={(e) =>
                      setBodyValues({ ...bodyValues, [field.name]: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* cURL Preview */}
        {currentEndpoint && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>cURL Command</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{buildCurlCommand()}</pre>
            </div>
          </div>
        )}

        {/* Send Button */}
        {currentEndpoint && (
          <Button
            onClick={handleSendRequest}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <Label>Response</Label>
            <Textarea
              value={response}
              readOnly
              className="font-mono text-sm min-h-[200px] bg-muted"
            />
          </div>
        )}
      </div>
    </section>
  );
};
