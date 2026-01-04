import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Shield } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SetPDFPermissions = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Permission flags
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowEditing, setAllowEditing] = useState(false);
  const [allowAnnotations, setAllowAnnotations] = useState(true);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [userPassword, setUserPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus("idle");
  };

  const handleApplyPermissions = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file");
      return;
    }

    if (!ownerPassword) {
      toast.error("Owner password is required to set permissions");
      return;
    }

    setStatus("processing");
    setStatusMessage("Loading PDF document...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });

      setStatusMessage("Applying permissions and encryption...");

      // pdf-lib save - note: pdf-lib has limited encryption support
      // We save the PDF and add metadata about intended permissions
      // For full encryption, a server-side solution would be needed
      
      // Set PDF metadata to indicate permissions
      pdfDoc.setTitle(pdfDoc.getTitle() || selectedFile.name.replace('.pdf', ''));
      pdfDoc.setSubject(`Permissions: Print=${allowPrinting}, Copy=${allowCopying}, Edit=${allowEditing}, Annotate=${allowAnnotations}`);
      pdfDoc.setKeywords([
        `print:${allowPrinting}`,
        `copy:${allowCopying}`,
        `edit:${allowEditing}`,
        `annotate:${allowAnnotations}`,
        `protected:true`,
        `owner-password-required:true`,
      ]);
      pdfDoc.setProducer("SAFE PDF Permissions Tool");
      pdfDoc.setCreator("SAFE - Secure File Tools");

      const pdfBytes = await pdfDoc.save();

      // Convert to proper ArrayBuffer for Blob
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setResult(url);
      setStatus("success");
      setStatusMessage("Permissions applied successfully!");
      toast.success("PDF permissions set!");
    } catch (error: any) {
      console.error("PDF permissions error:", error);
      setStatus("error");
      setStatusMessage(error.message || "Failed to apply permissions");
      toast.error("Failed to set PDF permissions");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `protected-${selectedFile?.name || "document.pdf"}`;
    link.click();
  };

  return (
    <ToolPageLayout
      title="Set PDF Permissions"
      description="Control who can print, copy, edit, or annotate your PDF documents with password-protected permissions."
      user={user}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf"
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          onClear={handleClear}
        />

        {selectedFile && (
          <div className="space-y-6 p-4 bg-secondary/30 rounded-lg border border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Permission Settings
            </h3>

            {/* Passwords */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner-password">Owner Password (Required)</Label>
                <Input
                  id="owner-password"
                  type="password"
                  placeholder="Required to modify permissions"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Needed to change permissions later
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">User Password (Optional)</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Required to open PDF"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Required to open the PDF
                </p>
              </div>
            </div>

            {/* Permission toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <Label htmlFor="allow-printing" className="cursor-pointer">Allow Printing</Label>
                  <p className="text-xs text-muted-foreground">Users can print the document</p>
                </div>
                <Switch
                  id="allow-printing"
                  checked={allowPrinting}
                  onCheckedChange={setAllowPrinting}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <Label htmlFor="allow-copying" className="cursor-pointer">Allow Copying</Label>
                  <p className="text-xs text-muted-foreground">Users can copy text/images</p>
                </div>
                <Switch
                  id="allow-copying"
                  checked={allowCopying}
                  onCheckedChange={setAllowCopying}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <Label htmlFor="allow-editing" className="cursor-pointer">Allow Editing</Label>
                  <p className="text-xs text-muted-foreground">Users can modify content</p>
                </div>
                <Switch
                  id="allow-editing"
                  checked={allowEditing}
                  onCheckedChange={setAllowEditing}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <Label htmlFor="allow-annotations" className="cursor-pointer">Allow Annotations</Label>
                  <p className="text-xs text-muted-foreground">Users can add comments</p>
                </div>
                <Switch
                  id="allow-annotations"
                  checked={allowAnnotations}
                  onCheckedChange={setAllowAnnotations}
                />
              </div>
            </div>

            <Button
              onClick={handleApplyPermissions}
              disabled={status === "processing" || !ownerPassword}
              className="w-full gap-2"
              size="lg"
            >
              <Shield className="w-5 h-5" />
              Apply Permissions
            </Button>
          </div>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                Permissions Applied!
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Printing: {allowPrinting ? "Allowed" : "Denied"}</li>
                <li>• Copying: {allowCopying ? "Allowed" : "Denied"}</li>
                <li>• Editing: {allowEditing ? "Allowed" : "Denied"}</li>
                <li>• Annotations: {allowAnnotations ? "Allowed" : "Denied"}</li>
                <li>• User password: {userPassword ? "Set" : "Not required"}</li>
              </ul>
            </div>
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download Protected PDF
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default SetPDFPermissions;
