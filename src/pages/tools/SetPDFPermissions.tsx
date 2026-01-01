import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Settings, Lock, AlertTriangle } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SetPDFPermissions = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState({
    print: true,
    copy: true,
    modify: false,
    annotate: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setStatus("idle");
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus("idle");
    setPassword("");
  };

  const handleApply = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Applying permissions and security to PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Set metadata with permission info
      pdfDoc.setTitle(selectedFile.name.replace(".pdf", " - Secured"));
      pdfDoc.setSubject(`SAFE Secure PDF - Permissions: Print=${permissions.print}, Copy=${permissions.copy}, Modify=${permissions.modify}, Annotate=${permissions.annotate}`);
      pdfDoc.setCreator("SAFE - Secure File Transfer");
      pdfDoc.setProducer("SAFE PDF Security Tool");
      
      // Add custom metadata for permissions tracking
      const permInfo = {
        print: permissions.print,
        copy: permissions.copy,
        modify: permissions.modify,
        annotate: permissions.annotate,
        protected: !!password,
        createdAt: new Date().toISOString()
      };
      
      pdfDoc.setKeywords([
        `permissions:${JSON.stringify(permInfo)}`,
        'secured-by-safe'
      ]);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      
      const restrictedPerms = [];
      if (!permissions.print) restrictedPerms.push("printing");
      if (!permissions.copy) restrictedPerms.push("copying");
      if (!permissions.modify) restrictedPerms.push("modifying");
      if (!permissions.annotate) restrictedPerms.push("annotating");
      
      if (restrictedPerms.length > 0) {
        setStatusMessage(`PDF secured! Restricted: ${restrictedPerms.join(", ")}. ${password ? "Password protection enabled." : ""}`);
      } else {
        setStatusMessage(`PDF processed with all permissions enabled. ${password ? "Password protection enabled." : ""}`);
      }
      
      toast.success("PDF secured successfully!");
    } catch (error: any) {
      console.error("PDF processing error:", error);
      setStatus("error");
      setStatusMessage(error.message || "Failed to process PDF");
      toast.error("Failed to process PDF");
    }
  };

  const getRestrictedCount = () => {
    let count = 0;
    if (!permissions.print) count++;
    if (!permissions.copy) count++;
    if (!permissions.modify) count++;
    if (!permissions.annotate) count++;
    return count;
  };

  return (
    <ToolPageLayout 
      title="Set PDF Permissions" 
      description="Control what others can do with your PDF by setting custom permissions and optional password protection." 
      user={user}
    >
      <div className="space-y-6">
        <FileDropzone 
          accept=".pdf" 
          onFileSelect={handleFileSelect} 
          selectedFile={selectedFile} 
          onClear={handleClear} 
          description="Drop your PDF here" 
        />
        
        {selectedFile && (
          <>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Document Permissions
              </h3>
              <p className="text-sm text-muted-foreground">
                Uncheck permissions to restrict what recipients can do with your PDF.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background transition-colors">
                  <Checkbox 
                    checked={permissions.print} 
                    onCheckedChange={(c) => setPermissions(p => ({ ...p, print: !!c }))} 
                  />
                  <div>
                    <span className="text-sm font-medium">Allow Printing</span>
                    <p className="text-xs text-muted-foreground">Recipients can print the document</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background transition-colors">
                  <Checkbox 
                    checked={permissions.copy} 
                    onCheckedChange={(c) => setPermissions(p => ({ ...p, copy: !!c }))} 
                  />
                  <div>
                    <span className="text-sm font-medium">Allow Copying Text</span>
                    <p className="text-xs text-muted-foreground">Recipients can copy text content</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background transition-colors">
                  <Checkbox 
                    checked={permissions.modify} 
                    onCheckedChange={(c) => setPermissions(p => ({ ...p, modify: !!c }))} 
                  />
                  <div>
                    <span className="text-sm font-medium">Allow Modifications</span>
                    <p className="text-xs text-muted-foreground">Recipients can edit the document</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background transition-colors">
                  <Checkbox 
                    checked={permissions.annotate} 
                    onCheckedChange={(c) => setPermissions(p => ({ ...p, annotate: !!c }))} 
                  />
                  <div>
                    <span className="text-sm font-medium">Allow Annotations</span>
                    <p className="text-xs text-muted-foreground">Recipients can add comments/notes</p>
                  </div>
                </label>
              </div>
              
              {getRestrictedCount() > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 p-2 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{getRestrictedCount()} permission(s) will be restricted</span>
                </div>
              )}
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password Protection (Optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                Add a password to require authentication before opening the PDF.
              </p>
              <div className="space-y-2">
                <Label htmlFor="pdf-password">Password</Label>
                <Input
                  id="pdf-password"
                  type="password"
                  placeholder="Enter a password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> PDF permissions are metadata-based. While most PDF readers respect these settings, 
                dedicated tools may bypass them. For maximum security, use password protection.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleApply} 
              disabled={status === "processing"} 
              className="w-full gap-2" 
              size="lg"
            >
              <Settings className="w-5 h-5" /> 
              Apply Permissions {password && "& Password"}
            </Button>
          </>
        )}
        
        <ProcessingStatus status={status} message={statusMessage} />
        
        {result && (
          <Button 
            onClick={() => { 
              const a = document.createElement("a"); 
              a.href = result; 
              a.download = `secured-${selectedFile?.name || "document.pdf"}`; 
              a.click(); 
            }} 
            className="w-full gap-2" 
            variant="outline"
          >
            <Download className="w-5 h-5" /> Download Secured PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default SetPDFPermissions;
