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
      console.log('Loading files with token:', token);
      
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('share_token', token);

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Database error:', error);
        setError(true);
        toast.error("Database error loading files");
        return;
      }

      if (!data || data.length === 0) {
        console.error('No files found with token:', token);
        setError(true);
        toast.error("No files found with this link");
        return;
      }

      // Check if any file is expired
      const anyExpired = data.some(file => 
        file.expires_at && new Date(file.expires_at) < new Date()
      );
      
      if (anyExpired) {
        console.error('Files expired');
        setError(true);
        toast.error("One or more files have expired");
        return;
      }

      console.log('Files loaded successfully:', data.length);
      setFileData(data);
    } catch (err) {
      console.error('Error loading file:', err);
      setError(true);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!fileData || fileData.length === 0) return;

    setDownloading(true);
    try {
      // Download all files
      for (const file of fileData) {
        const { data, error } = await supabase.storage
          .from('transfers')
          .download(file.storage_path);

        if (error) throw error;

        // Create download link
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Small delay between downloads
        if (fileData.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Update download count
        await supabase
          .from('files')
          .update({ download_count: file.download_count + 1 })
          .eq('id', file.id);
      }

      toast.success(`${fileData.length} file${fileData.length > 1 ? 's' : ''} downloaded!`);
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
            <h2 className="text-2xl font-bold mb-2">
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
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{formatFileSize(fileData.reduce((sum: number, f: any) => sum + f.file_size, 0))}</span>
              <span>•</span>
              <span>{fileData[0].download_count} downloads</span>
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
                Download {fileData.length > 1 ? 'All Files' : 'File'}
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Uploaded {new Date(fileData[0].created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Download;
