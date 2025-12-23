import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CodeExamplesProps {
  endpoint: string;
  method: string;
  hasBody?: boolean;
  bodyExample?: string;
  queryParams?: string;
}

export const CodeExamples = ({ 
  endpoint, 
  method, 
  hasBody = false, 
  bodyExample = "",
  queryParams = ""
}: CodeExamplesProps) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const baseUrl = "https://api.risetolive.com/v1";
  const fullUrl = `${baseUrl}${endpoint}${queryParams}`;

  const curlExample = hasBody
    ? `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: ${method === 'POST' && endpoint === '/upload' ? 'multipart/form-data' : 'application/json'}" \\
  ${bodyExample ? `-d '${bodyExample}'` : ''}`
    : `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

  const jsExample = hasBody
    ? `const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  ${bodyExample ? `body: JSON.stringify(${bodyExample})` : ''}
});

const data = await response.json();
console.log(data);`
    : `const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const data = await response.json();
console.log(data);`;

  const pythonExample = hasBody
    ? `import requests

response = requests.${method.toLowerCase()}(
    "${fullUrl}",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    ${bodyExample ? `json=${bodyExample.replace(/"/g, "'")}` : ''}
)

print(response.json())`
    : `import requests

response = requests.${method.toLowerCase()}(
    "${fullUrl}",
    headers={
        "Authorization": "Bearer YOUR_API_KEY"
    }
)

print(response.json())`;

  const copyToClipboard = async (code: string, tab: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedTab(tab);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-2 text-sm text-muted-foreground">Code Examples</h4>
      <Tabs defaultValue="curl" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
        </TabsList>
        
        <TabsContent value="curl" className="relative">
          <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => copyToClipboard(curlExample, "curl")}
            >
              {copiedTab === "curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="whitespace-pre-wrap">{curlExample}</pre>
          </div>
        </TabsContent>
        
        <TabsContent value="javascript" className="relative">
          <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => copyToClipboard(jsExample, "javascript")}
            >
              {copiedTab === "javascript" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="whitespace-pre-wrap">{jsExample}</pre>
          </div>
        </TabsContent>
        
        <TabsContent value="python" className="relative">
          <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => copyToClipboard(pythonExample, "python")}
            >
              {copiedTab === "python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="whitespace-pre-wrap">{pythonExample}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
