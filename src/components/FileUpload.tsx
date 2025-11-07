import { useState, useCallback } from "react";
import { Upload, Link2, Check, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadProps {
  user?: any;
}

export const FileUpload = ({ user }: FileUploadProps) => {
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
  const [isFinalized, setIsFinalized] = useState(false);

  const MAX_SIZE_ANONYMOUS = 200 * 1024 * 1024; // 200MB
  const MAX_SIZE_AUTHENTICATED = 1024 * 1024 * 1024; // 1GB
  const maxSize = user ? MAX_SIZE_AUTHENTICATED : MAX_SIZE_ANONYMOUS;

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

    // Check file size limits
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > maxSize) {
      const maxSizeMB = user ? "1GB" : "200MB";
      toast.error(`Total file size exceeds ${maxSizeMB} limit. ${user ? '' : 'Login to share up to 1GB!'}`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadSpeed(0);
    setCurrentFileIndex(0);

    try {
      // Use existing batch/token if adding more files, otherwise create new
      const batchId = currentBatchId || crypto.randomUUID();
      const shareToken = currentShareToken || Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      let uploadedSize = 0;
      const startTime = Date.now();

      // Upload all files with real progress tracking
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        
        const fileName = user ? `${user.id}/${Date.now()}_${i}_${file.name}` : `anonymous/${Date.now()}_${i}_${file.name}`;
        const filePath = `${fileName}`;

        // Upload to storage
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

        // Insert file metadata
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: filePath,
            batch_id: batchId,
            share_token: shareToken,
            user_id: user?.id || null,
          });

        if (dbError) {
          console.error("Database error:", dbError);
          throw dbError;
        }
      }

      setProgress(100);
      
      // Store batch info for adding more files
      setCurrentBatchId(batchId);
      setCurrentShareToken(shareToken);
      
      const link = `${window.location.origin}/download/${shareToken}`;
      setShareLink(link);
      
      // Send email notification if user is logged in
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-share-link', {
            body: {
              shareLink: link,
              fileCount: files.length,
              totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB'
            }
          });
          toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded! Link sent to ${user.email}`);
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`);
        }
      } else {
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

  const finalizeBatch = async () => {
    if (!currentBatchId) return;
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_finalized: true })
        .eq('batch_id', currentBatchId);

      if (error) throw error;
      
      setIsFinalized(true);
      toast.success("Batch finalized! No more files can be added to this link.");
    } catch (error) {
      console.error('Finalize error:', error);
      toast.error("Failed to finalize batch.");
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
  };

  const reset = () => {
    setFiles([]);
    setShareLink("");
    setProgress(0);
    setCurrentFileIndex(0);
    setCurrentBatchId("");
    setCurrentShareToken("");
    setIsFinalized(false);
  };

  return (
    <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-elevated)] backdrop-blur-sm bg-card/95 animate-fade-in-up border-2">
      {!user && (
        <Alert className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 animate-fade-in-up">
          <AlertDescription className="text-sm">
            Anonymous uploads limited to <span className="font-bold text-primary">200MB</span>. 
            <span className="font-semibold text-accent ml-1">Login to share up to 1GB!</span>
          </AlertDescription>
        </Alert>
      )}
      
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
                    Up to 10 files, {user ? '1GB' : '200MB'} total
                  </p>
                </div>
              )}
            </label>
          </div>

          {uploading && (
            <div className="flex flex-col items-center space-y-4">
              <CircularProgress value={progress} size={140} strokeWidth={10} />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Uploading {currentFileIndex}/{files.length}
                </p>
                {uploadSpeed > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {uploadSpeed.toFixed(2)} MB/s
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={uploadFile}
            disabled={files.length === 0 || uploading}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-accent to-[hsl(310,80%,70%)] hover:opacity-90 hover:scale-[1.02] transition-all shadow-[var(--shadow-glow)]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading {currentFileIndex}/{files.length}...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Go {files.length > 0 ? `with ${files.length} File${files.length > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-[hsl(310,80%,70%)]/20 flex items-center justify-center animate-pulse-glow backdrop-blur-sm border-2 border-primary/30">
            <Check className="w-12 h-12 text-primary" />
          </div>
          <div className="animate-fade-in-up">
            <h3 className="text-3xl font-display font-bold mb-3 bg-gradient-to-r from-primary via-accent to-[hsl(310,80%,70%)] bg-clip-text text-transparent">
              Upload Complete!
            </h3>
            <p className="text-lg text-muted-foreground">Your files are ready to share</p>
          </div>
          
          <div className="bg-gradient-to-br from-background via-card to-muted/30 border-2 border-primary/20 rounded-2xl p-8 mb-6 shadow-[var(--shadow-elevated)]">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <QRCode value={shareLink} size={200} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-5 border border-border shadow-lg">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">Share this link</p>
            <p className="text-sm font-mono break-all mb-4 text-foreground bg-background/50 p-3 rounded-lg border">{shareLink}</p>
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full h-12 font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
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

          {!isFinalized && (
            <div className="flex gap-3">
              <Button
                onClick={addMoreFiles}
                className="flex-1 h-12 font-semibold bg-gradient-to-r from-primary via-accent to-[hsl(310,80%,70%)] hover:opacity-90 hover:scale-[1.02] transition-all shadow-[var(--shadow-glow)]"
              >
                Add More Files
              </Button>
              <Button
                onClick={finalizeBatch}
                variant="outline"
                className="flex-1 h-12 font-semibold gap-2 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                Done
              </Button>
            </div>
          )}

          {isFinalized && (
            <Button
              onClick={reset}
              className="w-full h-12 font-semibold bg-gradient-to-r from-primary via-accent to-[hsl(310,80%,70%)] hover:opacity-90 hover:scale-[1.02] transition-all shadow-[var(--shadow-glow)]"
            >
              New Upload
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
