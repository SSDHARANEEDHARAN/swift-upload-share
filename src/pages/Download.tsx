import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download as DownloadIcon, FileIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Download = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadFileData();
  }, [token]);

  useEffect(() => {
    if (fileData && !downloading) {
      downloadFile();
    }
  }, [fileData]);

  const loadFileData = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        setError(true);
        return;
      }

      // Check if file is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError(true);
        toast.error("This file has expired");
        return;
      }

      setFileData(data);
    } catch (err) {
      console.error('Error loading file:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!fileData) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('transfers')
        .download(fileData.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update download count
      await supabase
        .from('files')
        .update({ download_count: fileData.download_count + 1 })
        .eq('id', fileData.id);

      toast.success("Download started!");
    } catch (err) {
      console.error('Download error:', err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center p-4">
        <Card className="p-12 text-center shadow-[var(--shadow-card)]">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading file...</p>
        </Card>
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-md shadow-[var(--shadow-card)]">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">File Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This file doesn't exist or has expired.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Upload a File
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-[var(--shadow-card)]">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <FileIcon className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">{fileData.filename}</h2>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{formatFileSize(fileData.file_size)}</span>
              <span>•</span>
              <span>{fileData.download_count} downloads</span>
            </div>
          </div>

          <Button
            onClick={downloadFile}
            disabled={downloading}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] hover:opacity-90 transition-opacity"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download File
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Uploaded {new Date(fileData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Download;
