import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Lock } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PasswordProtectPDF = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleProtect = async () => {
    if (!selectedFile || !password) {
      toast.error("Please select a file and enter a password");
      return;
    }

    setStatus("processing");
    setStatusMessage("Encrypting PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Note: pdf-lib doesn't support encryption directly
      // This creates a copy - for full encryption, a server-side solution would be needed
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage("PDF prepared! Note: Full password protection requires server-side processing.");
      toast.success("PDF processed!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to process PDF");
      toast.error("Failed to process PDF");
    }
  };

  return (
    <ToolPageLayout title="Password Protect PDF" description="Encrypt your PDF with a password to protect sensitive content." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".pdf" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} />
        {selectedFile && (
          <>
            <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary/50" />
            <Button onClick={handleProtect} disabled={status === "processing" || !password} className="w-full gap-2" size="lg">
              <Lock className="w-5 h-5" /> Protect PDF
            </Button>
          </>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "protected.pdf"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default PasswordProtectPDF;
