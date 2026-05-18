import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  Download, 
  FileText, 
  Clock, 
  Trash2, 
  ExternalLink,
  BarChart3,
  HardDrive,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildShareLink } from "@/lib/share-url";

interface FileRecord {
  id: string;
  filename: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
  expires_at: string | null;
  download_count: number;
  share_token: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalDownloads: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchUserFiles(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserFiles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFiles(data || []);
      
      // Calculate stats
      const totalSize = data?.reduce((acc, file) => acc + file.file_size, 0) || 0;
      const totalDownloads = data?.reduce((acc, file) => acc + (file.download_count || 0), 0) || 0;
      
      setStats({
        totalFiles: data?.length || 0,
        totalSize,
        totalDownloads,
      });
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from("transfers").remove([storagePath]);
      
      // Delete from database
      const { error } = await supabase.from("files").delete().eq("id", fileId);
      if (error) throw error;

      setFiles(files.filter(f => f.id !== fileId));
      toast.success("File deleted");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Manage your files and view usage statistics.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                    <p className="text-2xl font-bold">{stats.totalFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Downloads</p>
                    <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Files Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Files</CardTitle>
              <Button asChild>
                <Link to="/upload" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload New
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No files uploaded yet</p>
                  <Button asChild>
                    <Link to="/upload">Upload your first file</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">File</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">Size</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground hidden md:table-cell">Uploaded</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground hidden md:table-cell">Downloads</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{file.filename}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">
                            {formatBytes(file.file_size)}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                            {format(new Date(file.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                            {file.download_count}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  navigator.clipboard.writeText(buildShareLink(file.share_token));
                                  toast.success("Link copied!");
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(file.id, file.filename)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
