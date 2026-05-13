import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Share2, ChevronDown, ChevronUp, File, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { copyToClipboard } from "@/lib/clipboard";

type FileTypeFilter = "all" | "image" | "video" | "audio" | "pdf" | "document" | "archive" | "other";

const matchesFilter = (mime: string | null | undefined, filename: string, filter: FileTypeFilter) => {
  if (filter === "all") return true;
  const m = (mime || "").toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (filter) {
    case "image":
      return m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"].includes(ext);
    case "video":
      return m.startsWith("video/") || ["mp4", "mov", "webm", "mkv", "avi"].includes(ext);
    case "audio":
      return m.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext);
    case "pdf":
      return m === "application/pdf" || ext === "pdf";
    case "document":
      return (
        m.includes("word") ||
        m.includes("excel") ||
        m.includes("spreadsheet") ||
        m.includes("presentation") ||
        m === "text/plain" ||
        ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "rtf", "csv"].includes(ext)
      );
    case "archive":
      return ["zip", "rar", "7z", "tar", "gz"].includes(ext) || m.includes("zip") || m.includes("compressed");
    case "other":
      return !matchesFilter(mime, filename, "image") &&
        !matchesFilter(mime, filename, "video") &&
        !matchesFilter(mime, filename, "audio") &&
        !matchesFilter(mime, filename, "pdf") &&
        !matchesFilter(mime, filename, "document") &&
        !matchesFilter(mime, filename, "archive");
  }
};

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

const History = () => {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view history");
      navigate('/');
      return;
    }
    setUser(session.user);
    loadHistory(session.user.id);
  };

  const loadHistory = async (userId: string) => {
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
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/download/${token}`;
    const ok = await copyToClipboard(link);
    if (ok) toast.success("Link copied to clipboard!");
    else toast.error("Couldn't copy automatically. Long-press the link to copy.");
  };

  const deleteBatch = async (batchId: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header user={user} />
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-9 w-32 mb-6" />
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2 text-foreground">
              Upload History
            </h1>
            <p className="text-muted-foreground">
              View and manage your uploaded file batches
            </p>
          </div>

          {batches.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No uploads yet</h3>
              <p className="text-muted-foreground mb-4">
                Start uploading files to see your history here
              </p>
              <Button onClick={() => navigate('/upload')}>Upload Files</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => {
                const isExpanded = expandedBatches.has(batch.batch_id);
                return (
                  <Card key={batch.batch_id} className="overflow-hidden hover:border-primary/30 transition-all">
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => toggleBatch(batch.batch_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-lg">
                              {batch.file_count} file{batch.file_count > 1 ? 's' : ''}
                            </h3>
                            {batch.is_finalized && (
                              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                                Finalized
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(batch.created_at), 'PPp')}
                            </div>
                            <div>
                              {formatFileSize(batch.total_size)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={() => copyLink(batch.share_token)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            Copy Link
                          </Button>
                          <Button
                            onClick={() => deleteBatch(batch.batch_id)}
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t bg-muted/30 px-6 py-4">
                        <div className="space-y-2">
                          {batch.files.map((file) => (
                            <div 
                              key={file.id} 
                              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                            >
                              <File className="w-4 h-4 text-primary shrink-0" />
                              <span className="flex-1 truncate font-medium text-sm">
                                {file.filename}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatFileSize(file.file_size)}
                              </span>
                              {file.file_type && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                                  {file.file_type.split('/')[1]?.toUpperCase() || file.file_type}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default History;
