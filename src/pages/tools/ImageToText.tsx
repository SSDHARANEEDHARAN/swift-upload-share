import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Copy, FileText, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1586339949216-35c2747cc36d?w=800&q=80";

const ImageToText = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedText("");
    setStatus("idle");
    setProgress(0);
    
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
    setProgress(0);
  };

  const handleUseSampleImage = async () => {
    setStatus("processing");
    setStatusMessage("Loading sample image...");
    setProgress(0);
    
    try {
      const response = await fetch(SAMPLE_IMAGE_URL);
      const blob = await response.blob();
      const file = new File([blob], "sample-image.jpg", { type: "image/jpeg" });
      
      setSelectedFile(file);
      setPreview(SAMPLE_IMAGE_URL);
      setStatus("idle");
      setStatusMessage("");
      toast.success("Sample image loaded!");
    } catch (error) {
      setStatus("error");
      setStatusMessage("Failed to load sample image");
      toast.error("Failed to load sample image");
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setStatusMessage("Initializing OCR...");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(selectedFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const progressValue = Math.round(m.progress * 100);
            setProgress(progressValue);
            setStatusMessage(`Recognizing text... ${progressValue}%`);
          } else if (m.status === "loading tesseract core") {
            setStatusMessage("Loading OCR engine...");
            setProgress(10);
          } else if (m.status === "initializing tesseract") {
            setStatusMessage("Initializing...");
            setProgress(20);
          } else if (m.status === "loading language traineddata") {
            setStatusMessage("Loading language data...");
            setProgress(30);
          } else if (m.status === "initializing api") {
            setStatusMessage("Preparing...");
            setProgress(40);
          }
        },
      });

      setExtractedText(result.data.text);
      setStatus("success");
      setStatusMessage("Text extracted successfully!");
      setProgress(100);
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
        {!selectedFile && (
          <Button
            variant="outline"
            onClick={handleUseSampleImage}
            className="w-full gap-2"
            disabled={status === "processing"}
          >
            <Image className="w-5 h-5" />
            Use Sample Image
          </Button>
        )}

        <ImageDropzone 
          onImageSelect={handleImageSelect} 
          preview={preview}
          onClear={handleClear}
        />

        {selectedFile && !extractedText && status !== "processing" && (
          <Button
            onClick={handleExtract}
            className="w-full gap-2"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Extract Text
          </Button>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CircularProgress value={progress} size={100} />
            <p className="text-muted-foreground text-sm animate-pulse">{statusMessage}</p>
          </div>
        )}

        {status === "success" || status === "error" ? (
          <ProcessingStatus status={status} message={statusMessage} />
        ) : null}

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
