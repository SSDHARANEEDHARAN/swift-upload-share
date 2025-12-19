import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditImage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
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
    setPrompt("");
    setStatus("idle");
  };

  const handleEdit = async () => {
    if (!imagePreview || !prompt.trim()) {
      toast.error("Please upload an image and enter an edit prompt");
      return;
    }

    setStatus("processing");
    setStatusMessage("Editing your image with AI...");

    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { image: imagePreview, prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data.image) {
        const imageUrl = data.image.startsWith("data:") 
          ? data.image 
          : `data:image/png;base64,${data.image}`;
        setResult(imageUrl);
        setStatus("success");
        setStatusMessage("Image edited successfully!");
        toast.success("Image edited successfully!");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Edit error:", error);
      setStatus("error");
      setStatusMessage(error.message || "Failed to edit image");
      toast.error("Failed to edit image");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = "edited-image.png";
    link.click();
  };

  return (
    <ToolPageLayout
      title="Edit Image with AI"
      description="Easily edit your photos with our AI Image editor. Simply upload an existing image & enter a prompt to modify & enhance any photo with AI."
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
            <Textarea
              placeholder="Describe how you want to edit the image... (e.g., 'Make it look like sunset', 'Add a rainbow', 'Make it more vibrant')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border"
            />

            <Button
              onClick={handleEdit}
              disabled={status === "processing" || !prompt.trim()}
              className="w-full gap-2"
              size="lg"
            >
              <Wand2 className="w-5 h-5" />
              Edit Image with AI
            </Button>
          </div>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Edited Image</h3>
            <img
              src={result}
              alt="Edited result"
              className="w-full max-h-96 object-contain rounded-xl border border-border"
            />
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download Edited Image
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default EditImage;
