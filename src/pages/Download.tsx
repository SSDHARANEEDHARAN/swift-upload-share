import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Download as DownloadIcon, FileIcon, Loader2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Download = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileData, setFileData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    loadFileData();
  }, [token]);

  // Countdown timer effect
  useEffect(() => {
    if (!fileData || fileData.length === 0) return;
    
    const expiresAt = new Date(fileData[0].expires_at);
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} min`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes} min, ${seconds} sec`);
      } else {
        setTimeRemaining(`${seconds} seconds`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [fileData]);

  const loadFileData = async () => {
    if (!token || !/^[a-f0-9]{32}$/.test(token)) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("download-manifest", {
        body: { shareToken: token },
      });

      if (error) {
        console.error("Manifest error:", error);
        setError(true);
        toast.error("File not found or has expired");
        return;
      }

      const files = (data as any)?.files as any[] | undefined;

      if (!files || files.length === 0) {
        setError(true);
        toast.error("No files found with this link");
        return;
      }

      setFileData(files);
    } catch (err) {
      console.error("Load error:", err);
      setError(true);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!token || isExpired) return;

    setDownloading(true);
    setDownloadProgress(0);
    setCurrentFileIndex(0);

    try {
      // Always fetch fresh signed URLs right before downloading.
      const { data, error } = await supabase.functions.invoke("download-manifest", {
        body: { shareToken: token },
      });

      if (error) {
        console.error("Manifest error:", error);
        throw new Error("File not found or has expired");
      }

      const files = ((data as any)?.files as any[] | undefined) ?? [];
      if (files.length === 0) throw new Error("File not found or has expired");

      setFileData(files);

      const totalSize = files.reduce((sum: number, f: any) => sum + f.file_size, 0);
      let downloadedSize = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);

        if (!file.downloadUrl) {
          throw new Error("Missing download URL");
        }

        // Download with progress tracking using XHR with retry
        const blob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", file.downloadUrl);
          xhr.responseType = "blob";
          xhr.timeout = 0; // No timeout for large files

          xhr.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const fileProgress = event.loaded;
              const currentTotal = downloadedSize + fileProgress;
              const overallProgress = (currentTotal / totalSize) * 100;
              setDownloadProgress(Math.min(overallProgress, 99));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else if (xhr.status === 400 || xhr.status === 403) {
              // Signed URL expired, need to refresh
              reject(new Error("Link expired. Please refresh the page and try again."));
            } else {
              reject(new Error(`Download failed (${xhr.status}). Please try again.`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error. Check your connection and try again.")));
          xhr.addEventListener("timeout", () => reject(new Error("Download timed out. Please try again.")));
          xhr.send();
        });

        downloadedSize += file.file_size;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const sanitizedFilename = file.filename
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/^\.+/, "")
          .slice(0, 150) || "download";
        a.download = sanitizedFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (files.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Best-effort analytics only (never block downloads).
        try {
          await supabase.rpc("increment_download_count", { file_id: file.id });
        } catch (e) {
          console.warn("Failed to increment download count", e);
        }
      }

      setDownloadProgress(100);
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} downloaded!`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading file...</p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="p-12 text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-display font-bold mb-2">File Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This file doesn't exist or has expired.
            </p>
            <Button asChild>
              <Link to="/upload">Upload a File</Link>
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 pt-24">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileIcon className="w-10 h-10 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold mb-2">
                {fileData.length === 1 ? fileData[0].filename : `${fileData.length} Files`}
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                {fileData.map((file: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate max-w-[200px]">{file.filename}</span>
                    <span className="text-muted-foreground ml-2">{formatFileSize(file.file_size)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{formatFileSize(fileData.reduce((sum: number, f: any) => sum + f.file_size, 0))}</span>
                  <span>•</span>
                  <span>{fileData[0].download_count} downloads</span>
                </div>
                {fileData[0].user_id && (
                  <div className="text-xs bg-primary/10 px-3 py-1 rounded-full text-primary">
                    Uploaded by verified user
                  </div>
                )}
              </div>
            </div>

            {/* Expiration countdown timer with color indicators */}
            {(() => {
              const expiresAt = new Date(fileData[0].expires_at);
              const diff = expiresAt.getTime() - Date.now();
              const isUrgent = diff < 60 * 60 * 1000; // Less than 1 hour
              const isWarning = diff < 24 * 60 * 60 * 1000; // Less than 1 day
              
              const colorClass = isExpired 
                ? 'bg-destructive/10 text-destructive border-destructive/30' 
                : isUrgent 
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' 
                  : isWarning 
                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' 
                    : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
              
              return (
                <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${colorClass}`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isExpired ? 'This link has expired' : `Expires in: ${timeRemaining}`}
                  </span>
                </div>
              );
            })()}

            {/* Download progress */}
            {downloading && (
              <div className="flex flex-col items-center space-y-3">
                <CircularProgress value={downloadProgress} size={100} strokeWidth={8} />
                <p className="text-sm text-muted-foreground">
                  Downloading {currentFileIndex}/{fileData.length}
                </p>
              </div>
            )}

            <Button
              onClick={downloadFile}
              disabled={downloading || isExpired}
              className="w-full h-12 text-base"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Downloading {Math.round(downloadProgress)}%
                </>
              ) : isExpired ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Link Expired
                </>
              ) : (
                <>
                  <DownloadIcon className="w-5 h-5 mr-2" />
                  Download {fileData.length > 1 ? 'All Files' : 'File'}
                </>
              )}
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Uploaded {new Date(fileData[0].created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Download;