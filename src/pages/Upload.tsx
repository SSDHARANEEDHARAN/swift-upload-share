import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Upload = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex flex-col items-center justify-center p-4">
      {user ? (
        <Header userEmail={user.email} />
      ) : (
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            onClick={() => navigate('/auth')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Button>
        </div>
      )}

      {user && (
        <Button
          onClick={() => navigate('/history')}
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 gap-2"
        >
          <History className="w-4 h-4" />
          History
        </Button>
      )}

      <div className="text-center mb-8">
        <h1 className="text-7xl font-display font-bold mb-4 bg-gradient-to-r from-primary via-accent to-[hsl(310,80%,70%)] bg-clip-text text-transparent animate-fade-in-up tracking-tight">
          Go
        </h1>
        <p className="text-xl text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Share files quickly and securely
        </p>
        {!user && (
          <p className="text-sm text-muted-foreground mt-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            No login needed for files up to 200MB
          </p>
        )}
      </div>
      
      <FileUpload user={user} />
    </div>
  );
};

export default Upload;
