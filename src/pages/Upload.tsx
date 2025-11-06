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
        <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] bg-clip-text text-transparent">
          Go
        </h1>
        <p className="text-lg text-muted-foreground">
          Share files quickly and securely
        </p>
        {!user && (
          <p className="text-sm text-muted-foreground mt-2">
            No login needed for files up to 200MB
          </p>
        )}
      </div>
      
      <FileUpload user={user} />
    </div>
  );
};

export default Upload;
