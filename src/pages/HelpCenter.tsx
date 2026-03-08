import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
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
  FileSpreadsheet,
  Presentation,
  Archive,
  Image,
  Upload,
  HelpCircle,
  Mail,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const toolDocs = [
  {
    category: "Image Tools",
    icon: Image,
    tools: [
      { name: "Edit Image with AI", icon: Wand2, href: "/tools/edit-image", description: "Upload any image and describe the changes you want. Our AI will modify the image based on your prompt.", howTo: ["Upload an image (JPG, PNG, WebP)", "Enter a description of changes you want", "Click 'Edit Image' and wait for processing", "Download your edited image"] },
      { name: "Upscale Image", icon: ZoomIn, href: "/tools/upscale-image", description: "Increase image resolution up to 4x without losing quality using AI enhancement.", howTo: ["Upload an image", "Select upscale factor (2x or 4x)", "Click 'Upscale' to process", "Download your high-resolution image"] },
      { name: "Recolor Image", icon: Palette, href: "/tools/recolor-image", description: "Change colors of specific objects in your image using AI.", howTo: ["Upload your image", "Describe what object to recolor and the new color", "Click 'Recolor' to process", "Download your recolored image"] },
      { name: "Remove Background", icon: Eraser, href: "/tools/remove-background", description: "Automatically remove backgrounds from images with AI precision.", howTo: ["Upload an image with a clear subject", "Click 'Remove Background'", "AI will detect and remove the background", "Download image with transparent background"] },
      { name: "Vectorize Image", icon: PenTool, href: "/tools/vectorize-image", description: "Convert raster images to scalable vector format (SVG).", howTo: ["Upload a PNG, JPG, or other raster image", "Adjust settings if needed", "Click 'Vectorize'", "Download SVG file"] },
      { name: "Image to 3D", icon: Box, href: "/tools/image-to-3d", description: "Generate 3D models from 2D images for rendering or 3D printing.", howTo: ["Upload a clear image of an object", "Click 'Generate 3D Model'", "Wait for AI processing", "Download 3D model file"] },
      { name: "Image to Video", icon: Video, href: "/tools/image-to-video", description: "Transform static images into animated videos with AI.", howTo: ["Upload an image", "Optionally describe the animation", "Click 'Generate Video'", "Download your animated video"] },
    ]
  },
  {
    category: "Document Tools",
    icon: FileText,
    tools: [
      { name: "Compress PDF", icon: Minimize2, href: "/tools/compress-pdf", description: "Reduce PDF file size while maintaining quality.", howTo: ["Upload your PDF file", "Click 'Compress PDF'", "Download the smaller file"] },
      { name: "Images to PDF", icon: Image, href: "/tools/images-to-pdf", description: "Combine multiple images into a single PDF document.", howTo: ["Upload multiple images", "Arrange order if needed", "Click 'Create PDF'", "Download combined PDF"] },
      { name: "Password Protect PDF", icon: Lock, href: "/tools/password-protect-pdf", description: "Add password encryption to protect sensitive PDFs.", howTo: ["Upload your PDF", "Enter desired password", "Click 'Protect PDF'", "Download encrypted file"] },
      { name: "Set PDF Permissions", icon: Lock, href: "/tools/set-pdf-permissions", description: "Control who can print, copy, edit, or annotate your PDFs.", howTo: ["Upload your PDF", "Set owner password (required)", "Toggle permission flags for printing, copying, editing, annotating", "Optionally set user password to require opening", "Click 'Apply Permissions'", "Download protected PDF"] },
      { name: "Word to PDF", icon: FileText, href: "/tools/word-to-pdf", description: "Convert DOC/DOCX files to PDF format.", howTo: ["Upload Word document", "Click 'Convert to PDF'", "Download PDF file"] },
      { name: "Excel to PDF", icon: FileSpreadsheet, href: "/tools/excel-to-pdf", description: "Convert Excel spreadsheets to PDF.", howTo: ["Upload XLS/XLSX file", "Click 'Convert to PDF'", "Download PDF file"] },
      { name: "PowerPoint to PDF", icon: Presentation, href: "/tools/ppt-to-pdf", description: "Convert PPT presentations to PDF.", howTo: ["Upload PowerPoint file", "Click 'Convert to PDF'", "Download PDF file"] },
      { name: "PDF to Word", icon: FileText, href: "/tools/pdf-to-word", description: "Convert PDF to editable Word documents.", howTo: ["Upload PDF file", "Click 'Convert to Word'", "Download DOC file"] },
      { name: "PDF to Excel", icon: FileSpreadsheet, href: "/tools/pdf-to-excel", description: "Extract tables from PDF to Excel format.", howTo: ["Upload PDF with tables", "Click 'Convert to Excel'", "Download spreadsheet"] },
      { name: "PDF to PowerPoint", icon: Presentation, href: "/tools/pdf-to-ppt", description: "Convert PDF slides to PowerPoint.", howTo: ["Upload PDF file", "Click 'Convert to PPT'", "Download presentation"] },
      { name: "PDF to PDF/A", icon: Archive, href: "/tools/pdf-to-pdfa", description: "Convert to archival PDF format for long-term preservation.", howTo: ["Upload PDF file", "Click 'Convert to PDF/A'", "Download archival PDF"] },
    ]
  },
  {
    category: "File Transfer",
    icon: Upload,
    tools: [
      { name: "Quick Upload", icon: Upload, href: "/upload", description: "Upload files up to 100MB instantly without an account.", howTo: ["Drag & drop files or click to select", "Wait for upload to complete", "Copy share link or QR code", "Share with anyone"] },
    ]
  }
];

const faqs = [
  { q: "What file formats are supported for image editing?", a: "We support JPG, PNG, WebP, and GIF formats. For best results with AI tools, use high-quality JPG or PNG images." },
  { q: "Is there a file size limit?", a: "For image tools, the limit is 10MB per image. For file transfers, anonymous users can upload up to 100MB, while registered users can upload up to 2GB per batch." },
  { q: "How long are uploaded files stored?", a: "Files are stored for 7 days by default. Registered users can manage their files and extend storage periods." },
  { q: "Are my files secure?", a: "Yes! All uploads are encrypted in transit and at rest. We don't access or share your files, and they're automatically deleted after the retention period." },
  { q: "Do I need an account to use the tools?", a: "Most tools work without an account. However, creating a free account gives you access to upload history, larger file limits, and extended storage." },
  { q: "What AI models power the image tools?", a: "Our image tools use state-of-the-art AI models including OpenAI's GPT-Image for editing, generation, and enhancement tasks." },
  { q: "Can I use the tools on mobile?", a: "Absolutely! All tools are fully responsive and work great on mobile devices, tablets, and desktops." },
  { q: "What happens if a tool doesn't work as expected?", a: "AI tools may sometimes produce unexpected results. Try adjusting your prompt or using a different image. For technical issues, contact our support team." },
];

const HelpCenter = () => {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        setContactForm(prev => ({ ...prev, email: session.user.email }));
      }
    });
  }, []);

  const filteredDocs = toolDocs.map(category => ({
    ...category,
    tools: category.tools.filter(tool => 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.tools.length > 0);

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: contactForm
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setContactForm(prev => ({
        name: "",
        email: prev.email,
        subject: "",
        message: ""
      }));
    } catch (error: any) {
      console.error('Error sending contact email:', error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 pt-24 pb-16">
        {/* Hero */}
        <section className="px-4 sm:px-6 pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Help Center
            </h1>
            <p className="text-muted-foreground mb-8">
              Find answers, learn how to use our tools, and get the most out of SAFE EYE.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
          </div>
        </section>

        {/* Tool Documentation */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-8">Tool Documentation</h2>
            
            {filteredDocs.map((category) => (
              <div key={category.category} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <category.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-display font-semibold">{category.category}</h3>
                </div>
                
                <Accordion type="single" collapsible className="space-y-2">
                  {category.tools.map((tool) => (
                    <AccordionItem key={tool.name} value={tool.name} className="border border-border rounded-lg px-4 bg-card">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <tool.icon className="w-5 h-5 text-primary shrink-0" />
                          <span className="font-medium">{tool.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <p className="text-muted-foreground mb-4">{tool.description}</p>
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">How to use:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            {tool.howTo.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <Button size="sm" asChild>
                          <Link to={tool.href}>Open Tool</Link>
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="px-4 sm:px-6 pb-16 bg-card/50 border-y border-border py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-8">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="space-y-2">
              {filteredFaqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4 bg-background">
                  <AccordionTrigger className="hover:no-underline py-4 text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 sm:px-6 py-16">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold mb-2">Still need help?</h2>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Send us a message and we'll get back to you.
              </p>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4 bg-card border border-border rounded-lg p-6">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Your Name</Label>
                <Input
                  id="contact-name"
                  placeholder="John Doe"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email Address</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  placeholder="How can we help?"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Describe your issue or question..."
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                />
              </div>
              
              <Button type="submit" size="lg" className="w-full" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
