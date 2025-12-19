import { useCallback, useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageDropzoneProps {
  onImageSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  preview?: string | null;
  onClear?: () => void;
}

export const ImageDropzone = ({ 
  onImageSelect, 
  accept = "image/*",
  maxSize = 10 * 1024 * 1024,
  preview,
  onClear
}: ImageDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > maxSize) {
        setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
        return;
      }
      onImageSelect(file);
    }
  }, [onImageSelect, maxSize]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
        return;
      }
      onImageSelect(file);
    }
  }, [onImageSelect, maxSize]);

  if (preview) {
    return (
      <div className="relative">
        <img 
          src={preview} 
          alt="Preview" 
          className="w-full max-h-96 object-contain rounded-xl border border-border"
        />
        {onClear && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
        ${isDragging 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
        }
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">
            Drop your image here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports JPG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
};
