import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ToolPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  user?: any;
}

export const ToolPageLayout = ({ title, description, children, user }: ToolPageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Button>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
              {title}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
