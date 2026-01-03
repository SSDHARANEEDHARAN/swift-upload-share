import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AIStatusBanner } from "@/components/AIStatusBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Palette, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIError, handleAIError } from "@/hooks/useAIErrorHandler";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80";

const RecolorImage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fromColor, setFromColor] = useState("");
  const [toColor, setToColor] = useState("");
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
    setFromColor("");
    setToColor("");
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
    } catch (error) {
      setStatus("error");
      setStatusMessage("Failed to load sample image");
      toast.error("Failed to load sample image");
    }
  };

  const handleRecolor = async () => {
    if (!imagePreview || !fromColor.trim() || !toColor.trim()) {
      toast.error("Please upload an image and specify colors to swap");
      return;
    }

    setAiError(null);
    setStatus("processing");
    setStatusMessage(`Changing ${fromColor} to ${toColor}...`);

    try {
      const { data, error } = await supabase.functions.invoke("recolor-image", {
        body: { image: imagePreview, fromColor: fromColor.trim(), toColor: toColor.trim() },
      });

      if (error) {
        const errorBody = error.message || "";
        if (errorBody.includes("429") || errorBody.includes("rate limit")) {
          throw { message: "Rate limit exceeded. Please try again later.", status: 429 };
        }
        if (errorBody.includes("402") || errorBody.includes("credits")) {
          throw { message: "AI credits exhausted. Please add credits to continue.", status: 402 };
        }
        throw error;
      }

      if (data?.error) {
        throw { message: data.error };
      }

      if (data.image) {
        const imageUrl = data.image.startsWith("data:")
          ? data.image
          : data.image.startsWith("http")
            ? data.image
            : `data:image/png;base64,${data.image}`;
        setResult(imageUrl);
        setStatus("success");
        setStatusMessage("Image recolored successfully!");
        setAiError(null);
        toast.success("Image recolored successfully!");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Recolor error:", error);
      const parsed = handleAIError(error, setStatus as any, setStatusMessage);
      setAiError(parsed);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = "recolored-image.png";
    link.click();
  };

  return (
    <ToolPageLayout
      title="Recolor Image with AI"
      description="Easily replace the color of any object in your image using our free online AI photo recolor tool. Quickly select and swap colors in seconds."
      user={user}
    >
      <div className="space-y-6">
        <AIStatusBanner error={aiError} onRetry={handleRecolor} />

        {!selectedImage && (
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

        <ImageDropzone onImageSelect={handleImageSelect} preview={imagePreview} onClear={handleClear} />

        {imagePreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Original Color</label>
                <Input
                  placeholder="e.g., red, blue, green..."
                  value={fromColor}
                  onChange={(e) => setFromColor(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">New Color</label>
                <Input
                  placeholder="e.g., purple, gold, pink..."
                  value={toColor}
                  onChange={(e) => setToColor(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            </div>

            <Button
              onClick={handleRecolor}
              disabled={status === "processing" || !fromColor.trim() || !toColor.trim()}
              className="w-full gap-2"
              size="lg"
            >
              <Palette className="w-5 h-5" />
              Recolor Image
            </Button>
          </div>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Recolored Image</h3>
            <img
              src={result}
              alt="Recolored result"
              className="w-full max-h-96 object-contain rounded-xl border border-border"
            />
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download Recolored Image
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default RecolorImage;
