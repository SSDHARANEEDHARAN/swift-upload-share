import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, FileText, Plus, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ImagesToPDF = () => {
  const [user, setUser] = useState<any>(null);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImages(prev => [...prev, { file, preview: e.target?.result as string }]);
    };
    reader.readAsDataURL(file);
    setResult(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    setStatus("processing");
    setStatusMessage("Converting images to PDF...");

    try {
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = images[i].preview;
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = img.width / img.height;
        const pageRatio = pageWidth / pageHeight;

        let w, h;
        if (imgRatio > pageRatio) {
          w = pageWidth - 20;
          h = w / imgRatio;
        } else {
          h = pageHeight - 20;
          w = h * imgRatio;
        }

        pdf.addImage(images[i].preview, "JPEG", (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
      }

      const blob = pdf.output("blob");
      setResult(URL.createObjectURL(blob));
      setStatus("success");
      setStatusMessage(`Created PDF with ${images.length} page(s)`);
      toast.success("PDF created!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to create PDF");
      toast.error("Failed to create PDF");
    }
  };

  return (
    <ToolPageLayout title="Convert Images to PDF" description="Convert PNG, JPG, and other images to PDF quickly." user={user}>
      <div className="space-y-6">
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.preview} alt="" className="w-full h-24 object-cover rounded-lg border border-border" />
                <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => removeImage(i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <ImageDropzone onImageSelect={handleImageSelect} preview={null} />
        {images.length > 0 && (
          <Button onClick={handleConvert} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <FileText className="w-5 h-5" /> Create PDF ({images.length} images)
          </Button>
        )}
        <ProcessingStatus status={status} message={statusMessage} />
        {result && (
          <Button onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "images.pdf"; a.click(); }} className="w-full gap-2" variant="outline">
            <Download className="w-5 h-5" /> Download PDF
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ImagesToPDF;
