import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  Share2, 
  QrCode, 
  History, 
  Shield, 
  Zap,
  FileUp,
  Link2,
  Clock,
  Users
} from "lucide-react";

const tools = [
  {
    title: "Quick File Upload",
    description: "Upload files up to 500MB instantly without creating an account. Perfect for quick one-time transfers.",
    icon: FileUp,
    href: "/upload",
    badge: "Free"
  },
  {
    title: "Share via Link",
    description: "Generate a unique shareable link for your uploaded files. Recipients can download without signing up.",
    icon: Link2,
    href: "/upload"
  },
  {
    title: "QR Code Sharing",
    description: "Get an instant QR code for your uploads. Perfect for sharing files in person or on printed materials.",
    icon: QrCode,
    href: "/upload"
  },
  {
    title: "Large File Transfer",
    description: "Authenticated users can upload files up to 2GB per batch. Sign up for expanded storage limits.",
    icon: Upload,
    href: "/upload",
    badge: "Pro"
  },
  {
    title: "Upload History",
    description: "Track all your uploads in one place. View, manage, and re-share your previously uploaded files.",
    icon: History,
    href: "/history"
  },
  {
    title: "Batch Uploads",
    description: "Upload multiple files at once and share them all with a single link. Up to 10 files per batch.",
    icon: Users,
    href: "/upload"
  }
];

const features = [
  {
    icon: Shield,
    title: "Secure & Private",
    description: "End-to-end encryption and auto-expiring links keep your files safe."
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized infrastructure for rapid uploads and downloads."
  },
  {
    icon: Clock,
    title: "No Expiry Hassle",
    description: "Files stay available for download without time pressure."
  }
];

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const filters = [
    { id: "all", label: "All Tools" },
    { id: "upload", label: "Upload Tools" },
    { id: "share", label: "Sharing Tools" }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      {/* Hero Section */}
      <main className="flex-1">
        <section className="pt-32 pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 animate-fade-in-up">
              Explore Tools on{" "}
              <span className="text-primary">FileTransfer</span>
            </h1>
            <p 
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              Discover a wide range of powerful tools to share and transfer your files. 
              Whether you're sharing documents, images, or large files, you'll find everything you need.
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className={activeFilter === filter.id ? "" : "bg-card hover:bg-secondary"}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool, index) => (
                <div 
                  key={tool.title} 
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <ToolCard {...tool} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 sm:px-6 py-20 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12">
              Why Choose FileTransfer?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="text-center animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
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

        {/* CTA Section */}
        <section className="px-4 sm:px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Ready to Transfer Files?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start sharing files instantly. No signup required for basic transfers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/upload" className="gap-2">
                  <Upload className="w-5 h-5" />
                  Start Uploading
                </a>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" asChild>
                  <a href="/auth">Create Free Account</a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
