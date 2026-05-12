import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { LiveChat } from "@/components/LiveChat";
import { RecentChatsPreview } from "@/components/RecentChatsPreview";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import { Upload, Shield, Zap, FileUp, Link2, Clock } from "lucide-react";

const uploadTools = [
  { title: "Quick File Upload", description: "Upload files up to 500MB instantly without creating an account.", icon: FileUp, href: "/upload", badge: "Free" },
  { title: "Share via Link", description: "Generate a unique shareable link for your uploaded files.", icon: Link2, href: "/upload" },
  { title: "Large File Transfer", description: "Upload files up to 2GB per batch. Sign up for expanded limits.", icon: Upload, href: "/upload", badge: "Pro" },
];

const features = [
  { icon: Shield, title: "Secure & Private", description: "End-to-end encryption and auto-expiring links keep your files safe." },
  { icon: Zap, title: "Lightning Fast", description: "Optimized infrastructure for rapid uploads and downloads." },
  { icon: Clock, title: "No Expiry Hassle", description: "Files stay available for download without time pressure." },
];

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const liveChatRef = useRef<{ open: () => void }>(null);

  usePresence(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleOpenChat = () => {
    const chatButton = document.querySelector('[data-chat-toggle]') as HTMLButtonElement;
    chatButton?.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />

      <main className="flex-1">
        <section className="pt-32 pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 animate-fade-in-up">
              File Transfer on <span className="text-primary">SAFE EYE</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Fast, secure file transfer. Upload, share via link, and send large files with ease.
            </p>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadTools.map((tool, index) => (
                <div key={tool.title} className="animate-fade-in-up" style={{ animationDelay: `${0.05 + index * 0.03}s` }}>
                  <ToolCard {...tool} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {user && (
          <section className="px-4 sm:px-6 pb-8">
            <div className="max-w-md mx-auto">
              <RecentChatsPreview user={user} onOpenChat={handleOpenChat} />
            </div>
          </section>
        )}

        <section className="px-4 sm:px-6 py-20 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12">Why Choose SAFE EYE?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={feature.title} className="text-center animate-fade-in-up" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Ready to Share Your Files?</h2>
            <p className="text-muted-foreground mb-8">Start uploading instantly. No signup required.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/upload" className="gap-2"><Upload className="w-5 h-5" />Start Uploading</Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Create Free Account</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <LiveChat user={user} />
    </div>
  );
};

export default Index;
