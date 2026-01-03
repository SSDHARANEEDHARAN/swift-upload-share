import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AIStatusBanner } from "@/components/AIStatusBanner";
import { Button } from "@/components/ui/button";
import { Video, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIError, handleAIError } from "@/hooks/useAIErrorHandler";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

const ImageToVideo = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ description: string; note: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [aiError, setAiError] = useState<AIError | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setResult(null);
    setAiError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setStatus("idle");
    setStatusMessage("");
    setAiError(null);
  };

  const handleUseSampleImage = async () => {
    setStatus("processing");
    setStatusMessage("Loading sample image...");

    try {
      const response = await fetch(SAMPLE_IMAGE_URL);
      const blob = await response.blob();
      const file = new File([blob], "sample-image.jpg", { type: "image/jpeg" });

      setSelectedImage(file);
      setImagePreview(SAMPLE_IMAGE_URL);
      setStatus("idle");
      setStatusMessage("");
      setAiError(null);
      toast.success("Sample image loaded!");
    } catch (_error) {
      setStatus("error");
      setStatusMessage("Failed to load sample image");
      toast.error("Failed to load sample image");
    }
  };

  const handleGenerateVideo = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image");
      return;
    }

    setAiError(null);
    setStatus("processing");
    setStatusMessage("Analyzing image for video generation...");

    try {
      const { data, error } = await supabase.functions.invoke("image-to-video", {
        body: { image: imagePreview },
      });

      if (error) throw error;

      setResult({
        description: data.description,
        note: data.note,
      });
      setStatus("success");
      setStatusMessage("Video analysis complete!");
      setAiError(null);
      toast.success("Video generation analysis complete!");
    } catch (error: any) {
      console.error("Video generation error:", error);
      const parsed = handleAIError(error, setStatus as any, setStatusMessage);
      setAiError(parsed);
    }
  };

  return (
    <ToolPageLayout
      title="Image to Video AI"
      description="Turn your static images into captivating, high-quality videos in just a few simple steps with our powerful AI Video Generator."
      user={user}
    >
      <div className="space-y-6">
        <AIStatusBanner error={aiError} onRetry={handleGenerateVideo} />

        {!selectedImage && (
          <Button
            variant="outline"
            onClick={handleUseSampleImage}
            className="w-full gap-2"
            disabled={status === "processing"}
          >
            <ImageIcon className="w-5 h-5" />
            Use Sample Image
          </Button>
        )}

        <ImageDropzone onImageSelect={handleImageSelect} preview={imagePreview} onClear={handleClear} />

        {imagePreview && (
          <Button onClick={handleGenerateVideo} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Video className="w-5 h-5" />
            Generate Video
          </Button>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Video Generation Plan</h3>
            <div className="bg-secondary/30 rounded-xl p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Animation Description</h4>
                <p className="text-foreground whitespace-pre-wrap">{result.description}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary">{result.note}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ImageToVideo;
