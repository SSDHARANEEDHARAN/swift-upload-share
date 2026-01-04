import { useState, useEffect, useCallback } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AIStatusBanner } from "@/components/AIStatusBanner";
import { Button } from "@/components/ui/button";
import { Download, Eraser, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pipeline, env } from "@huggingface/transformers";
import { parseAIError, type AIError } from "@/hooks/useAIErrorHandler";

// Configure for browser use
env.allowLocalModels = false;
env.useBrowserCache = true;

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80";

const RemoveBackground = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
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
      toast.success("Sample image loaded!");
    } catch (error) {
      setStatus("error");
      setStatusMessage("Failed to load sample image");
      toast.error("Failed to load sample image");
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleRemoveBackground = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image");
      return;
    }

    setStatus("processing");
    setStatusMessage("Loading AI model... This may take a moment on first use.");

    try {
      // Load the segmentation model
      const segmenter = await pipeline(
        "image-segmentation",
        "Xenova/segformer-b0-finetuned-ade-512-512",
        { device: "webgpu" }
      );

      setStatusMessage("Processing image...");

      // Process the image
      const results = await segmenter(imagePreview);
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        throw new Error("Failed to segment image");
      }

      // Load original image
      const img = await loadImage(imagePreview);
      
      // Create canvas for output
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find the main subject mask (usually the largest non-background segment)
      const subjectMask = results.find((r: any) => 
        r.label && !r.label.toLowerCase().includes('wall') && 
        !r.label.toLowerCase().includes('floor') &&
        !r.label.toLowerCase().includes('ceiling') &&
        !r.label.toLowerCase().includes('sky')
      ) || results[0];

      if (subjectMask && subjectMask.mask) {
        // Apply mask to alpha channel (invert for background removal)
        for (let i = 0; i < subjectMask.mask.data.length; i++) {
          const alpha = Math.round((1 - subjectMask.mask.data[i]) * 255);
          data[i * 4 + 3] = 255 - alpha;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Convert to blob URL
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed to create blob")), "image/png");
      });
      
      const resultUrl = URL.createObjectURL(blob);
      setResult(resultUrl);
      setStatus("success");
      setStatusMessage("Background removed successfully!");
      toast.success("Background removed!");
    } catch (error: any) {
      console.error("Background removal error:", error);
      const parsedError = parseAIError(error);
      setAiError(parsedError);
      setStatus("error");
      setStatusMessage(parsedError.message);
      toast.error("Failed to remove background. Try a different image.");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = "no-background.png";
    link.click();
  };

  return (
    <ToolPageLayout
      title="Remove Image Background"
      description="Remove image backgrounds immediately with our free AI Background removal tool—no software needed. It's fast, free, easy, and lets you change your image background in seconds."
      user={user}
    >
      <div className="space-y-6">
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

        <ImageDropzone
          onImageSelect={handleImageSelect}
          preview={imagePreview}
          onClear={handleClear}
        />

        {imagePreview && (
          <Button
            onClick={handleRemoveBackground}
            disabled={status === "processing"}
            className="w-full gap-2"
            size="lg"
          >
            <Eraser className="w-5 h-5" />
            Remove Background
          </Button>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        <AIStatusBanner error={aiError} onRetry={handleRemoveBackground} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Result (Transparent Background)</h3>
            <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlZWUiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlZWUiLz4KPC9zdmc+')] rounded-xl border border-border overflow-hidden">
              <img
                src={result}
                alt="Background removed"
                className="w-full max-h-96 object-contain"
              />
            </div>
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download PNG (Transparent)
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default RemoveBackground;
