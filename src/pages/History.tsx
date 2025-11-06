import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UploadBatch {
  batch_id: string;
  share_token: string;
  created_at: string;
  file_count: number;
  total_size: number;
  is_finalized: boolean;
}

const History = () => {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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
        .select('batch_id, share_token, created_at, file_size, is_finalized')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group files by batch
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
          });
        }
        const batch = batchMap.get(file.batch_id)!;
        batch.file_count++;
        batch.total_size += file.file_size;
      });

      setBatches(Array.from(batchMap.values()));
    } catch (error: any) {
      console.error('History load error:', error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/download/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          size="sm"
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Upload
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] bg-clip-text text-transparent">
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
            <Button onClick={() => navigate('/')}>Upload Files</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <Card key={batch.batch_id} className="p-6 hover:shadow-[var(--shadow-glow)] transition-all">
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
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(batch.created_at), 'PPp')}
                      </div>
                      <div>
                        {(batch.total_size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyLink(batch.share_token)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
