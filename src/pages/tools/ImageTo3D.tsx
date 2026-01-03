import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AIStatusBanner } from "@/components/AIStatusBanner";
import { Button } from "@/components/ui/button";
import { Box, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIError, handleAIError } from "@/hooks/useAIErrorHandler";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80";

const ImageTo3D = () => {
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

  const handleGenerate3D = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image");
      return;
    }

    setAiError(null);
    setStatus("processing");
    setStatusMessage("Analyzing image for 3D model generation...");

    try {
      const { data, error } = await supabase.functions.invoke("image-to-3d", {
        body: { image: imagePreview },
      });

      if (error) throw error;

      setResult({
        description: data.description,
        note: data.note,
      });
      setStatus("success");
      setStatusMessage("3D analysis complete!");
      setAiError(null);
      toast.success("3D model analysis complete!");
    } catch (error: any) {
      console.error("3D generation error:", error);
      const parsed = handleAIError(error, setStatus as any, setStatusMessage);
      setAiError(parsed);
    }
  };

  return (
    <ToolPageLayout
      title="Convert Image to 3D Model"
      description="Generate a 3D model from any image for use in 3D rendering, CAD, or 3D printing applications. This tool analyzes your image to prepare it for 3D reconstruction."
      user={user}
    >
      <div className="space-y-6">
        <AIStatusBanner error={aiError} onRetry={handleGenerate3D} />

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
          <Button onClick={handleGenerate3D} disabled={status === "processing"} className="w-full gap-2" size="lg">
            <Box className="w-5 h-5" />
            Analyze for 3D
          </Button>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">3D Model Analysis</h3>
            <div className="bg-secondary/30 rounded-xl p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Object Description</h4>
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

export default ImageTo3D;
