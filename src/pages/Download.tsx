import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Download as DownloadIcon, FileIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
    if (!token || !/^[a-f0-9]{32}$/.test(token)) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_files_by_share_token', { 
        p_share_token: token 
      });

      if (error) {
        setError(true);
        toast.error("File not found or has expired");
        return;
      }

      if (!data || data.length === 0) {
        setError(true);
        toast.error("No files found with this link");
        return;
      }

      setFileData(data);
    } catch (err) {
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
      for (const file of fileData) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('transfers')
          .createSignedUrl(file.storage_path, 3600);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to generate download URL');
        }

        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedFilename = file.filename
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/^\.+/, '')
          .slice(0, 150) || 'download';
        a.download = sanitizedFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (fileData.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await supabase.rpc('increment_download_count', { file_id: file.id });
      }

      toast.success(`${fileData.length} file${fileData.length > 1 ? 's' : ''} downloaded!`);
    } catch (err) {
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

            <Button
              onClick={downloadFile}
              disabled={downloading}
              className="w-full h-12 text-base"
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
