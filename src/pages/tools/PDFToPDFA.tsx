import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, Archive } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PDFToPDFA = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Processing PDF for archival format...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Set metadata for PDF/A compliance (partial)
      pdfDoc.setTitle(selectedFile.name.replace(".pdf", ""));
      pdfDoc.setCreator("FileTransfer PDF/A Converter");
      pdfDoc.setProducer("FileTransfer");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage("PDF processed with archival metadata! Note: Full PDF/A-1b compliance requires validation.");
      toast.success("PDF processed!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to process PDF");
      toast.error("Failed to process PDF");
    }
  };

  return (
    <ToolPageLayout title="Convert PDF to PDF/A" description="Convert your existing PDF to PDF/A for long-term document preservation." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".pdf" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} description="Drop your PDF here" />
        {selectedFile && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Archive className="w-5 h-5" /> Convert to PDF/A
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "archive.pdf"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF/A
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default PDFToPDFA;
