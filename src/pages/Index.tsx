import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  Shield, 
  Zap,
  FileUp,
  Link2,
  Clock,
  Image,
  Wand2,
  ZoomIn,
  Palette,
  Eraser,
  PenTool,
  Box,
  Video,
  FileText,
  Minimize2,
  Lock,
  Settings,
  FileSpreadsheet,
  Presentation,
  Archive,
  Type
} from "lucide-react";

const imageTools = [
  { title: "Edit Image with AI", description: "Upload an image & enter a prompt to modify & enhance any photo with AI.", icon: Wand2, href: "/tools/edit-image", badge: "AI" },
  { title: "Upscale Image with AI", description: "Upscale your images up to 4x their original size with AI.", icon: ZoomIn, href: "/tools/upscale-image", badge: "AI" },
  { title: "Recolor Image with AI", description: "Replace the color of any object in your image using AI.", icon: Palette, href: "/tools/recolor-image", badge: "AI" },
  { title: "Remove Image Background", description: "Remove image backgrounds instantly with our free AI tool.", icon: Eraser, href: "/tools/remove-background", badge: "AI" },
  { title: "Image to Text (OCR)", description: "Extract text from images using optical character recognition.", icon: Type, href: "/tools/image-to-text" },
  { title: "Vectorize Image", description: "Turn your images into SVG vector files—right in your browser.", icon: PenTool, href: "/tools/vectorize-image" },
  { title: "Convert Image to 3D", description: "Generate a 3D model from any image for 3D rendering or printing.", icon: Box, href: "/tools/image-to-3d", badge: "AI" },
  { title: "Image to Video AI", description: "Turn static images into captivating videos with AI.", icon: Video, href: "/tools/image-to-video", badge: "AI" },
];

const pdfTools = [
  { title: "Compress PDF", description: "Instantly compress your PDF files to reduce their size.", icon: Minimize2, href: "/tools/compress-pdf" },
  { title: "Convert Images to PDF", description: "Convert PNG, JPG, and other image files to PDF quickly.", icon: Image, href: "/tools/images-to-pdf" },
  { title: "Password Protect PDF", description: "Encrypt your PDF with a password to protect sensitive content.", icon: Lock, href: "/tools/password-protect-pdf" },
  { title: "Set PDF Permissions", description: "Control what others can do with your PDF—printing, editing, copying.", icon: Settings, href: "/tools/set-pdf-permissions" },
  { title: "Convert Word to PDF", description: "Convert DOC or DOCX files to PDF format seamlessly.", icon: FileText, href: "/tools/word-to-pdf" },
  { title: "Convert Excel to PDF", description: "Convert XLS, XLSX files to PDF—tables preserved.", icon: FileSpreadsheet, href: "/tools/excel-to-pdf" },
  { title: "Convert PowerPoint to PDF", description: "Convert PPT presentations to PDF—online and free.", icon: Presentation, href: "/tools/ppt-to-pdf" },
  { title: "Convert PDF to Word", description: "Transform PDFs into editable Word documents.", icon: FileText, href: "/tools/pdf-to-word" },
  { title: "Convert PDF to Excel", description: "Turn PDFs into editable Excel spreadsheets.", icon: FileSpreadsheet, href: "/tools/pdf-to-excel" },
  { title: "Convert PDF to PowerPoint", description: "Turn PDFs into fully editable PowerPoint slides.", icon: Presentation, href: "/tools/pdf-to-ppt" },
  { title: "Convert PDF to PDF/A", description: "Convert PDF to PDF/A for long-term preservation.", icon: Archive, href: "/tools/pdf-to-pdfa" },
];

const uploadTools = [
  { title: "Quick File Upload", description: "Upload files up to 500MB instantly without creating an account.", icon: FileUp, href: "/upload", badge: "Free" },
  { title: "Share via Link", description: "Generate a unique shareable link for your uploaded files.", icon: Link2, href: "/upload" },
  { title: "Large File Transfer", description: "Upload files up to 2GB per batch. Sign up for expanded limits.", icon: Upload, href: "/upload", badge: "Pro" },
];

const features = [
  { icon: Shield, title: "Secure & Private", description: "End-to-end encryption and auto-expiring links keep your files safe." },
  { icon: Zap, title: "Lightning Fast", description: "Optimized infrastructure for rapid uploads and downloads." },
  { icon: Clock, title: "No Expiry Hassle", description: "Files stay available for download without time pressure." }
];

type FilterType = "all" | "image" | "pdf" | "upload";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All Tools" },
    { id: "image", label: "Image Tools" },
    { id: "pdf", label: "Document Tools" },
    { id: "upload", label: "Upload Tools" }
  ];

  const getFilteredTools = () => {
    switch (activeFilter) {
      case "image": return imageTools;
      case "pdf": return pdfTools;
      case "upload": return uploadTools;
      default: return [...imageTools, ...pdfTools, ...uploadTools];
    }
  };

  const filteredTools = getFilteredTools();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1">
        <section className="pt-32 pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 animate-fade-in-up">
              Explore Tools on{" "}
              <span className="text-primary">SAFE</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Discover powerful tools to edit and transform your files. Images, documents, videos—everything you need in one place.
            </p>
          </div>
        </section>

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

        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool, index) => (
                <div key={tool.title} className="animate-fade-in-up" style={{ animationDelay: `${0.05 + index * 0.03}s` }}>
                  <ToolCard {...tool} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-20 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12">Why Choose SAFE?</h2>
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
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Ready to Transform Your Files?</h2>
            <p className="text-muted-foreground mb-8">Start using our powerful tools instantly. No signup required for most features.</p>
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
