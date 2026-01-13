import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createPdfFromText, downloadBlob } from "@/lib/pdf-utils";

const WordToPDF = () => {
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
    setStatusMessage("Converting Word document to PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer });
      
      const blob = await createPdfFromText(mammothResult.value);
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage("Word document converted to PDF!");
      toast.success("Conversion complete!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to convert document");
      toast.error("Failed to convert document");
    }
  };

  const handleDownload = () => {
    if (result) {
      const a = document.createElement("a");
      a.href = result;
      a.download = "converted.pdf";
      a.click();
    }
  };

  return (
    <ToolPageLayout title="Convert Word to PDF" description="Convert your DOC or DOCX files to Adobe PDF format seamlessly." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".doc,.docx" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} description="Drop your Word document here" />
        {selectedFile && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <FileText className="w-5 h-5" /> Convert to PDF
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default WordToPDF;
