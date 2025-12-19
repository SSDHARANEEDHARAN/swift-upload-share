import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

const ImageToText = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedText("");
    setStatus("idle");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedText("");
    setStatus("idle");
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Extracting text from image...");

    try {
      const result = await Tesseract.recognize(selectedFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setStatusMessage(`Recognizing text... ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      setExtractedText(result.data.text);
      setStatus("success");
      setStatusMessage("Text extracted successfully!");
      toast.success("Text extracted!");
    } catch (error: any) {
      setStatus("error");
      setStatusMessage(error.message || "Failed to extract text");
      toast.error("Failed to extract text");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Text copied to clipboard!");
  };

  return (
    <ToolPageLayout
      title="Image to Text (OCR)"
      description="Extract text from images using optical character recognition. Supports multiple languages."
      user={user}
    >
      <div className="space-y-6">
        <ImageDropzone 
          onImageSelect={handleImageSelect} 
          preview={preview}
          onClear={handleClear}
        />

        {selectedFile && !extractedText && (
          <Button
            onClick={handleExtract}
            disabled={status === "processing"}
            className="w-full gap-2"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Extract Text
          </Button>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {extractedText && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Extracted Text</h3>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
            <Textarea
              value={extractedText}
              readOnly
              className="min-h-[200px] bg-secondary/50 font-mono text-sm"
            />
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ImageToText;
