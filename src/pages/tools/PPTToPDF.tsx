import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileDropzone } from "@/components/FileDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PPTToPDF = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Processing PowerPoint file...");

    // Note: Full PPT to PDF conversion requires server-side processing
    // This is a placeholder that shows the limitation
    setTimeout(() => {
      setStatus("error");
      setStatusMessage("Full PowerPoint to PDF conversion requires server-side processing. Please use a dedicated converter service.");
      toast.info("This feature requires server-side processing for full fidelity conversion.");
    }, 1500);
  };

  return (
    <ToolPageLayout title="Convert PowerPoint to PDF" description="Quickly and easily convert your PPT presentations to PDF—online and free." user={user}>
      <div className="space-y-6">
        <FileDropzone accept=".ppt,.pptx" onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={() => { setSelectedFile(null); setStatus("idle"); }} description="Drop your PowerPoint file here" />
        {selectedFile && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Presentation className="w-5 h-5" /> Convert to PDF
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
      </div>
    </ToolPageLayout>
  );
};

export default PPTToPDF;
