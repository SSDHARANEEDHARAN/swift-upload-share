import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Share2, Plus, Users, Link2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SharedNote {
  id: string;
  share_token: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const SharedNotes = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [note, setNote] = useState<SharedNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Load note or create new one
  useEffect(() => {
    const loadOrCreateNote = async () => {
      setIsLoading(true);

      if (token) {
        // Load existing note
        const { data, error } = await supabase
          .from("shared_notes")
          .select("*")
          .eq("share_token", token)
          .single();

        if (error || !data) {
          toast.error("Note not found");
          navigate("/tools/shared-notes");
          return;
        }

        setNote(data);
      }
      
      setIsLoading(false);
    };

    loadOrCreateNote();
  }, [token, navigate]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!note?.id) return;

    const channel = supabase
      .channel(`note-${note.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shared_notes",
          filter: `id=eq.${note.id}`,
        },
        (payload) => {
          const newData = payload.new as SharedNote;
          setNote(newData);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setConnectedUsers(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: Math.random().toString(36).slice(2) });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [note?.id]);

  // Auto-save with debounce
  const saveNote = useCallback(async (title: string, content: string) => {
    if (!note?.id) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("shared_notes")
      .update({ title, content })
      .eq("id", note.id);

    if (error) {
      toast.error("Failed to save");
    }
    setIsSaving(false);
  }, [note?.id]);

  const handleTitleChange = (newTitle: string) => {
    if (!note) return;
    setNote({ ...note, title: newTitle });

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, note.content);
    }, 500);
  };

  const handleContentChange = (newContent: string) => {
    if (!note) return;
    setNote({ ...note, content: newContent });

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(note.title, newContent);
    }, 500);
  };

  const createNewNote = async () => {
    const { data, error } = await supabase
      .from("shared_notes")
      .insert({ title: "Untitled Note", content: "" })
      .select()
      .single();

    if (error || !data) {
      toast.error("Failed to create note");
      return;
    }

    navigate(`/tools/shared-notes/${data.share_token}`);
    toast.success("New note created!");
  };

  // Note: Delete functionality removed for security reasons
  // Notes are now permanent - users can create new notes instead

  const copyShareLink = () => {
    if (!note?.share_token) return;
    const link = `${window.location.origin}/tools/shared-notes/${note.share_token}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <ToolPageLayout
        title="Shared Notes"
        description="Real-time collaborative notes. Share the link and collaborate with anyone."
        user={user}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ToolPageLayout>
    );
  }

  // Landing page when no note is selected
  if (!token && !note) {
    return (
      <ToolPageLayout
        title="Shared Notes"
        description="Real-time collaborative notes. Share the link and collaborate with anyone."
        user={user}
      >
        <div className="space-y-6">
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <Share2 className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Collaborative Notes</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create a note and share the link. Anyone with the link can view and edit in real-time.
              </p>
            </div>
            <Button onClick={createNewNote} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create New Note
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-secondary/30 text-center space-y-2">
              <Link2 className="w-8 h-8 mx-auto text-primary" />
              <h3 className="font-semibold">Share Link</h3>
              <p className="text-sm text-muted-foreground">Share the unique link with collaborators</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-primary" />
              <h3 className="font-semibold">Real-time Sync</h3>
              <p className="text-sm text-muted-foreground">Changes appear instantly for everyone</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 text-center space-y-2">
              <Share2 className="w-8 h-8 mx-auto text-primary" />
              <h3 className="font-semibold">No Account Needed</h3>
              <p className="text-sm text-muted-foreground">Anyone with the link can collaborate</p>
            </div>
          </div>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout
      title="Shared Notes"
      description="Real-time collaborative notes. Share the link and collaborate with anyone."
      user={user}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-secondary/50 rounded-full text-sm">
              <Users className="w-4 h-4" />
              <span>{connectedUsers} online</span>
            </div>
            {isSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-2">
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>
            <Button variant="outline" size="sm" onClick={createNewNote} className="gap-2">
              <Plus className="w-4 h-4" />
              New Note
            </Button>
          </div>
        </div>

        {/* Title */}
        <Input
          value={note?.title || ""}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          className="text-xl font-semibold border-none bg-transparent focus-visible:ring-0 px-0"
        />

        {/* Content */}
        <Textarea
          value={note?.content || ""}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing... Changes are synced in real-time with everyone who has this link."
          className="min-h-[400px] resize-none bg-secondary/20 font-mono"
        />

        {/* Share info */}
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Share this note</p>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view and edit this note. All changes sync in real-time.
              </p>
              <code className="text-xs bg-secondary px-2 py-1 rounded block mt-2 break-all">
                {`${window.location.origin}/tools/shared-notes/${note?.share_token}`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default SharedNotes;
