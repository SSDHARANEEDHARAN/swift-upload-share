import { useState, useEffect, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Share2, ChevronDown, ChevronUp, File, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

interface FileInfo {
  id: string;
  filename: string;
  file_size: number;
  file_type: string | null;
}

interface UploadBatch {
  batch_id: string;
  share_token: string;
  created_at: string;
  file_count: number;
  total_size: number;
  is_finalized: boolean;
  files: FileInfo[];
}

const Upload = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const loadHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('id, batch_id, share_token, created_at, file_size, file_type, filename, is_finalized')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const batchMap = new Map<string, UploadBatch>();
      data?.forEach((file) => {
        if (!batchMap.has(file.batch_id)) {
          batchMap.set(file.batch_id, {
            batch_id: file.batch_id,
            share_token: file.share_token,
            created_at: file.created_at,
            file_count: 0,
            total_size: 0,
            is_finalized: file.is_finalized,
            files: [],
          });
        }
        const batch = batchMap.get(file.batch_id)!;
        batch.file_count++;
        batch.total_size += file.file_size;
        batch.files.push({
          id: file.id,
          filename: file.filename,
          file_size: file.file_size,
          file_type: file.file_type,
        });
      });

      setBatches(Array.from(batchMap.values()));
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Set a timeout to ensure we don't hang forever
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);
          if (session?.user) {
            loadHistory(session.user.id);
          }
        }
      })
      .catch((error) => {
        console.error("Auth session error:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          loadHistory(session.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadHistory]);

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/download/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const deleteBatch = async (batchId: string, files: FileInfo[]) => {
    try {
      const { data: fileData } = await supabase
        .from('files')
        .select('storage_path')
        .eq('batch_id', batchId);
      
      if (fileData && fileData.length > 0) {
        const paths = fileData.map(f => f.storage_path);
        await supabase.storage.from('transfers').remove(paths);
      }

      const { error } = await supabase
        .from('files')
        .delete()
        .eq('batch_id', batchId);

      if (error) throw error;

      setBatches(prev => prev.filter(b => b.batch_id !== batchId));
      toast.success("Batch deleted successfully!");
    } catch {
      toast.error("Failed to delete batch");
    }
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const handleUploadComplete = useCallback(() => {
    if (user) {
      loadHistory(user.id);
    }
  }, [user, loadHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header user={null} />
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4 animate-fade-in-up">
              Upload & Share
            </h1>
            <p className="text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Share files quickly and securely with anyone
            </p>
            {!user && (
              <p className="text-sm text-muted-foreground mt-2 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                No login needed for files up to 500MB
              </p>
            )}
          </div>
          
          {/* Upload Component */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <FileUpload user={user} onUploadComplete={handleUploadComplete} />
          </div>

          {/* Recent Uploads */}
          {user && batches.length > 0 && (
            <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-2xl font-display font-bold mb-6">Recent Uploads</h2>
              <div className="space-y-3">
                {batches.slice(0, 5).map((batch) => {
                  const isExpanded = expandedBatches.has(batch.batch_id);
                  return (
                    <Card key={batch.batch_id} className="overflow-hidden hover:border-primary/30 transition-all">
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleBatch(batch.batch_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {batch.file_count} file{batch.file_count > 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatFileSize(batch.total_size)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {format(new Date(batch.created_at), 'MMM d, HH:mm')}
                            </span>
                            <Button
                              onClick={() => copyLink(batch.share_token)}
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                            >
                              <Share2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Copy</span>
                            </Button>
                            <Button
                              onClick={() => deleteBatch(batch.batch_id, batch.files)}
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t bg-muted/30 px-4 py-3">
                          <div className="space-y-1">
                            {batch.files.map((file) => (
                              <div 
                                key={file.id} 
                                className="flex items-center gap-2 p-2 rounded-md bg-background/50 text-sm"
                              >
                                <File className="w-3 h-3 text-primary shrink-0" />
                                <span className="flex-1 truncate">{file.filename}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatFileSize(file.file_size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
              {batches.length > 5 && (
                <Button
                  onClick={() => navigate('/history')}
                  variant="link"
                  className="mt-4 w-full"
                >
                  View all {batches.length} uploads →
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Upload;
