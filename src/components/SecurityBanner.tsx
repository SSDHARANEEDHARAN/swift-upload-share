import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X, ShieldAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SecurityBannerProps {
  /** Only show for authenticated users */
  requireAuth?: boolean;
}

export const SecurityBanner = ({ requireAuth = true }: SecurityBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem("security-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
      
      // For admins/authenticated users, show the banner
      // In a real app, you'd check for admin role here
      if (session?.user) {
        setIsVisible(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user && !isDismissed) {
        setIsVisible(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem("security-banner-dismissed", "true");
  };

  // Don't show if dismissed or if auth is required but user isn't authenticated
  if (isDismissed || !isVisible || (requireAuth && !isAuthenticated)) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-orange-500/10 border-b border-orange-500/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Security Settings Require Attention
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Some security protections are disabled. Review your security checklist.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-orange-500/50 hover:bg-orange-500/10"
            >
              <Link to="/security-checklist">
                View Checklist
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
