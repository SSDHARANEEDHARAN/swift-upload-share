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
    category: "File Transfer",
    icon: Upload,
    tools: [
      { name: "Quick Upload", icon: Upload, href: "/upload", description: "Upload files up to 1GB instantly without an account.", howTo: ["Drag & drop files or click to select", "Wait for upload to complete", "Copy share link or QR code", "Share with anyone"] },
      { name: "Large File Transfer", icon: Upload, href: "/upload", description: "Sign in to upload files up to 2GB per batch.", howTo: ["Sign in to your account", "Drag & drop files (up to 2GB per batch)", "Wait for upload to complete", "Copy share link to send to others"] },
    ]
  }
];

const faqs = [
  { q: "Is there a file size limit?", a: "Anonymous users can upload up to 1GB. Registered users can upload up to 2GB per batch." },
  { q: "How long are uploaded files stored?", a: "Files are stored for 7 days by default. Registered users can manage their files and extend storage periods." },
  { q: "Are my files secure?", a: "Yes! All uploads are encrypted in transit and at rest. We don't access or share your files, and they're automatically deleted after the retention period." },
  { q: "Do I need an account to upload?", a: "No. Anonymous uploads work instantly. Creating a free account unlocks upload history, larger file limits, and extended storage." },
  { q: "Can I use SAFE EYE on mobile?", a: "Absolutely! The site is fully responsive and works great on mobile devices, tablets, and desktops." },
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
