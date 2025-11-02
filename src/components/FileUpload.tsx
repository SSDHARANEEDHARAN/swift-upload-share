import { useState, useCallback } from "react";
import { Upload, Link2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "react-qr-code";

export const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(0);

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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setShareLink("");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShareLink("");
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setUploadSpeed(0);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${fileName}`;

      const startTime = Date.now();
      const fileSizeMB = file.size / (1024 * 1024);

      // Fast progress animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return Math.min(prev + 25, 95);
        });

        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const speed = fileSizeMB / elapsed;
          setUploadSpeed(speed);
        }
      }, 100);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('transfers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      setProgress(98);

      if (uploadError) throw uploadError;

      // Insert file metadata
      const { data: fileData, error: dbError } = await supabase
        .from('files')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: filePath,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      const link = `${window.location.origin}/download/${fileData.share_token}`;
      setShareLink(link);
      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Upload failed. Please try again.");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    setShareLink("");
    setProgress(0);
  };

  return (
    <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-card)]">
      {!shareLink ? (
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}
              ${file ? 'bg-muted/30' : ''}
            `}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className={`w-16 h-16 mx-auto mb-4 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
              {file ? (
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: 1GB
                  </p>
                </div>
              )}
            </label>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {uploadSpeed > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {uploadSpeed.toFixed(2)} MB/s
                </p>
              )}
            </div>
          )}

          <Button
            onClick={uploadFile}
            disabled={!file || uploading}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] hover:opacity-90 transition-opacity"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Upload Complete!</h3>
            <p className="text-muted-foreground">Your file is ready to share</p>
          </div>
          
          <div className="bg-background border rounded-lg p-6 mb-4">
            <div className="flex justify-center mb-4">
              <QRCode value={shareLink} size={200} />
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Share this link</p>
            <p className="text-sm font-mono break-all mb-3 text-foreground">{shareLink}</p>
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={reset}
            variant="outline"
            className="w-full"
          >
            Upload Another File
          </Button>
        </div>
      )}
    </Card>
  );
};
