import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Auth } from "@/components/Auth";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Upload = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex flex-col items-center justify-center p-4">
      <Header userEmail={user.email} />
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] bg-clip-text text-transparent">
          File Transfer
        </h1>
        <p className="text-lg text-muted-foreground">
          Share files quickly and securely
        </p>
      </div>
      <FileUpload />
    </div>
  );
};

export default Upload;
