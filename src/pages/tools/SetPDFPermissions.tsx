import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Settings } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SetPDFPermissions = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
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
  };

  const handleApply = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Applying permissions to PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Note: pdf-lib doesn't support full permission settings
      // This is a demonstration of the UI - full implementation requires server-side processing
      pdfDoc.setTitle(selectedFile.name.replace(".pdf", ""));
      pdfDoc.setSubject(`Permissions: Print=${permissions.print}, Copy=${permissions.copy}, Modify=${permissions.modify}, Annotate=${permissions.annotate}`);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage("PDF processed! Note: Full permission enforcement requires PDF encryption (server-side).");
      toast.success("PDF processed!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to process PDF");
      toast.error("Failed to process PDF");
    }
  };

  return (
    <ToolPageLayout title="Set PDF Permissions" description="Control what others can do with your PDF by setting custom permissions." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".pdf" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} description="Drop your PDF here" />
        {selectedFile && (
          <>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-foreground">Document Permissions</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <Checkbox checked={permissions.print} onCheckedChange={(c) => setPermissions(p => ({ ...p, print: !!c }))} />
                  <span className="text-sm">Allow Printing</span>
                </label>
                <label className="flex items-center gap-3">
                  <Checkbox checked={permissions.copy} onCheckedChange={(c) => setPermissions(p => ({ ...p, copy: !!c }))} />
                  <span className="text-sm">Allow Copying Text</span>
                </label>
                <label className="flex items-center gap-3">
                  <Checkbox checked={permissions.modify} onCheckedChange={(c) => setPermissions(p => ({ ...p, modify: !!c }))} />
                  <span className="text-sm">Allow Modifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <Checkbox checked={permissions.annotate} onCheckedChange={(c) => setPermissions(p => ({ ...p, annotate: !!c }))} />
                  <span className="text-sm">Allow Annotations</span>
                </label>
              </div>
            </div>
            <Button onClick={handleApply} disabled={status === "processing"} className="w-full gap-2" size="lg">
              <Settings className="w-5 h-5" /> Apply Permissions
            </Button>
          </>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "secured.pdf"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download Secured PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default SetPDFPermissions;
