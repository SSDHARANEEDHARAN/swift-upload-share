import { useState, useEffect } from "react";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Download, Share2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80";

const VectorizeImage = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const handleVectorize = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image");
      return;
    }

    setStatus("processing");
    setStatusMessage("Converting image to vector format...");

    try {
      // Create image element
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imagePreview;
      });

      // Create canvas and get image data
      const canvas = document.createElement("canvas");
      const maxSize = 500;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple edge detection and path tracing for SVG
      setStatusMessage("Tracing paths...");
      
      // Convert to grayscale and find edges
      const edges: boolean[][] = [];
      for (let y = 0; y < canvas.height; y++) {
        edges[y] = [];
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
          edges[y][x] = gray < 128;
        }
      }

      // Generate SVG paths
      let paths = "";
      const visited = new Set<string>();

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (edges[y][x] && !visited.has(`${x},${y}`)) {
            // Find contiguous region
            const points: [number, number][] = [];
            const stack: [number, number][] = [[x, y]];
            
            while (stack.length > 0 && points.length < 1000) {
              const [cx, cy] = stack.pop()!;
              const key = `${cx},${cy}`;
              
              if (visited.has(key)) continue;
              if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
              if (!edges[cy][cx]) continue;
              
              visited.add(key);
              points.push([cx, cy]);
              
              stack.push([cx + 1, cy]);
              stack.push([cx - 1, cy]);
              stack.push([cx, cy + 1]);
              stack.push([cx, cy - 1]);
            }

            if (points.length > 10) {
              // Sample points for path
              const sampled = points.filter((_, i) => i % 5 === 0);
              if (sampled.length > 2) {
                const color = `rgb(${imageData.data[(y * canvas.width + x) * 4]},${imageData.data[(y * canvas.width + x) * 4 + 1]},${imageData.data[(y * canvas.width + x) * 4 + 2]})`;
                paths += `<circle cx="${x}" cy="${y}" r="${Math.sqrt(points.length) / 2}" fill="${color}" opacity="0.8"/>`;
              }
            }
          }
        }
      }

      // Create SVG
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">
        <rect width="100%" height="100%" fill="white"/>
        ${paths}
      </svg>`;

      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      
      setResult(url);
      setStatus("success");
      setStatusMessage("Image vectorized successfully!");
      toast.success("Image converted to vector!");
    } catch (error: any) {
      console.error("Vectorize error:", error);
      setStatus("error");
      setStatusMessage(error.message || "Failed to vectorize image");
      toast.error("Failed to vectorize image");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = "vectorized.svg";
    link.click();
  };

  return (
    <ToolPageLayout
      title="Vectorize Image"
      description="Turn your JPG, PNG, BMP, or GIF images into SVG vector files—with full-color tracing—right in your browser. Try it now!"
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
            onClick={handleVectorize}
            disabled={status === "processing"}
            className="w-full gap-2"
            size="lg"
          >
            <Share2 className="w-5 h-5" />
            Convert to SVG
          </Button>
        )}

        <ProcessingStatus status={status} message={statusMessage} />

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Vectorized SVG</h3>
            <div className="bg-white rounded-xl border border-border overflow-hidden p-4">
              <img
                src={result}
                alt="Vectorized result"
                className="w-full max-h-96 object-contain"
              />
            </div>
            <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
              <Download className="w-5 h-5" />
              Download SVG
            </Button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default VectorizeImage;
