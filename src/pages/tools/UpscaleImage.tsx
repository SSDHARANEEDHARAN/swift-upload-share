import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UpscaleImage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scale, setScale] = useState("2");
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

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
    setStatus("idle");
  };

  const handleUpscale = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image");
      return;
    }

    setStatus("processing");
    setStatusMessage(`Upscaling image to ${scale}x resolution...`);

    try {
      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: { image: imagePreview, scale: parseInt(scale) },
      });

      if (error) throw error;

      if (data.image) {
        const imageUrl = data.image.startsWith("data:") 
          ? data.image 
          : data.image.startsWith("http")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        setResult(imageUrl);
        setStatus("success");
        setStatusMessage(`Image upscaled to ${scale}x successfully!`);
        toast.success("Image upscaled successfully!");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Upscale error:", error);
      setStatus("error");
      setStatusMessage(error.message || "Failed to upscale image");
      toast.error("Failed to upscale image");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `upscaled-${scale}x.png`;
    link.click();
  };

  return (
    <ToolPageLayout
      title="Upscale Image with AI"
      description="Upscale your images for free to up to 4x their original size with the AI Image upscaler. Simply upload your original image and enhance within seconds."
      user={user}
    >
      <div className="space-y-6">
        <ImageDropzone
          onImageSelect={handleImageSelect}
          preview={imagePreview}
          onClear={handleClear}
        />

        {imagePreview && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">Scale Factor:</label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger className="w-32 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpscale}
              disabled={status === "processing"}
              className="w-full gap-2"
              size="lg"
            >
              <ZoomIn className="w-5 h-5" />
              Upscale Image
            </Button>
          </div>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Upscaled Image ({scale}x)</h3>
            <img
              src={result}
              alt="Upscaled result"
              className="w-full max-h-96 object-contain rounded-xl border border-border"
            />
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download Upscaled Image
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default UpscaleImage;
