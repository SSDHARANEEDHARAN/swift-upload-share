import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, Minimize2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompressPDF = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
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

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus("idle");
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Compressing PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Compress by removing unused objects and optimizing
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const blob = new Blob([compressedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResult({ url, size: blob.size });
      setStatus("success");
      setStatusMessage(`Compressed from ${(selectedFile.size / 1024).toFixed(1)}KB to ${(blob.size / 1024).toFixed(1)}KB`);
      toast.success("PDF compressed!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to compress PDF");
      toast.error("Failed to compress PDF");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.url;
    link.download = "compressed.pdf";
    link.click();
  };

  return (
    <ToolPageLayout title="Compress PDF" description="Instantly compress your PDF files to reduce their size." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".pdf" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={handleClear} description="Drop your PDF here" />
        {selectedFile && (
          <Button onClick={handleCompress} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Minimize2 className="w-5 h-5" /> Compress PDF
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download Compressed PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default CompressPDF;
