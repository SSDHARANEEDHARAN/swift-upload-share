import { useState, useCallback } from "react";
import { Upload, Link2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "react-qr-code";

export const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState("");
  const [currentShareToken, setCurrentShareToken] = useState("");

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
    const droppedFiles = Array.from(e.dataTransfer.files).slice(0, 10);
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setShareLink("");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files).slice(0, 10) : [];
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setShareLink("");
    }
  };

  const uploadFile = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setUploadSpeed(0);
    setCurrentFileIndex(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files");
        setUploading(false);
        return;
      }

      console.log("Starting upload for user:", user.id);

      // Use existing batch/token if adding more files, otherwise create new
      const batchId = currentBatchId || crypto.randomUUID();
      const shareToken = currentShareToken || Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log("Batch ID:", batchId, "Share Token:", shareToken);

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      let uploadedSize = 0;
      const startTime = Date.now();

      // Upload all files with real progress tracking
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        
        console.log(`Uploading file ${i + 1}/${files.length}:`, file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        const fileName = `${user.id}/${Date.now()}_${i}_${file.name}`;
        const filePath = `${fileName}`;

        // Upload to storage with progress tracking
        const fileStartSize = uploadedSize;
        const { data, error: uploadError } = await supabase.storage
          .from('transfers')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        console.log("File uploaded successfully:", data?.path);

        // Update progress after each file
        uploadedSize += file.size;
        const overallProgress = (uploadedSize / totalSize) * 100;
        setProgress(overallProgress);

        // Calculate real upload speed
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const speed = (uploadedSize / (1024 * 1024)) / elapsed;
          setUploadSpeed(speed);
        }

        // Insert file metadata with shared batch_id and share_token
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: filePath,
            batch_id: batchId,
            share_token: shareToken,
            user_id: user.id,
          });

        if (dbError) {
          console.error("Database error:", dbError);
          throw dbError;
        }

        console.log("File metadata saved to database");
      }

      setProgress(100);
      
      // Store batch info for adding more files
      setCurrentBatchId(batchId);
      setCurrentShareToken(shareToken);
      
      const link = `${window.location.origin}/download/${shareToken}`;
      setShareLink(link);
      
      console.log("Upload complete! Share link:", link);
      
      // Send email notification
      try {
        const emailResult = await supabase.functions.invoke('send-share-link', {
          body: {
            shareLink: link,
            fileCount: files.length,
            totalSize: (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2) + ' MB'
          }
        });
        console.log("Email notification result:", emailResult);
        toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded! Link sent to email.`);
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`);
      }
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

  const addMoreFiles = () => {
    setFiles([]);
    setProgress(0);
    setCurrentFileIndex(0);
    // Keep shareLink, currentBatchId, and currentShareToken
  };

  const reset = () => {
    setFiles([]);
    setShareLink("");
    setProgress(0);
    setCurrentFileIndex(0);
    setCurrentBatchId("");
    setCurrentShareToken("");
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
              ${files.length > 0 ? 'bg-muted/30' : ''}
            `}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              disabled={uploading}
              multiple
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className={`w-16 h-16 mx-auto mb-4 ${files.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              {files.length > 0 ? (
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {files.map((f, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="ml-2">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total: {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Drop your files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Up to 10 files, 1GB each
                  </p>
                </div>
              )}
            </label>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Uploading {currentFileIndex}/{files.length}...
                </span>
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
            disabled={files.length === 0 || uploading}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] hover:opacity-90 transition-opacity"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading {currentFileIndex}/{files.length}...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
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

          <div className="flex gap-3">
            <Button
              onClick={addMoreFiles}
              className="flex-1 bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] hover:opacity-90"
            >
              Add More Files
            </Button>
            <Button
              onClick={reset}
              variant="outline"
              className="flex-1"
            >
              New Upload
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
