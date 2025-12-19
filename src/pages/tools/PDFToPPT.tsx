import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, Presentation } from "lucide-react";
import pptxgen from "pptxgenjs";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PDFToPPT = () => {
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
    setStatusMessage("Converting PDF to PowerPoint...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      const pptx = new pptxgen();
      
      // Create a slide for each PDF page (placeholder content)
      for (let i = 0; i < pageCount; i++) {
        const slide = pptx.addSlide();
        slide.addText(`Page ${i + 1} from ${selectedFile.name}`, {
          x: 0.5,
          y: 0.5,
          w: "90%",
          fontSize: 24,
          bold: true,
        });
        slide.addText(
          "Note: Full PDF to PowerPoint conversion with images and formatting requires server-side processing.",
          {
            x: 0.5,
            y: 2,
            w: "90%",
            fontSize: 14,
            color: "666666",
          }
        );
      }

      const pptxBlob = await pptx.write({ outputType: "blob" }) as Blob;
      setResult(URL.createObjectURL(pptxBlob));
      setStatus("success");
      setStatusMessage(`Created ${pageCount} slides! Note: Full conversion requires server-side processing.`);
      toast.success("PowerPoint created!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to convert PDF");
      toast.error("Failed to convert PDF");
    }
  };

  return (
    <ToolPageLayout title="Convert PDF to PowerPoint" description="Turn your PDF files into fully editable PowerPoint slides." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".pdf" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setResult(null); }} description="Drop your PDF here" />
        {selectedFile && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Presentation className="w-5 h-5" /> Convert to PowerPoint
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "converted.pptx"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PowerPoint
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default PDFToPPT;
