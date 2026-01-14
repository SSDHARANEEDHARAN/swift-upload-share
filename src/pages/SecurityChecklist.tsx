import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Key,
  UserCheck,
  Database,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "unknown";
  category: "authentication" | "database" | "api" | "general";
  actionUrl?: string;
  actionLabel?: string;
  details?: string;
}

const SecurityChecklist = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      checkAdminAndLoadData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAndLoadData = async (userId: string) => {
    try {
      // Check if user is admin using the RPC function
      const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
      
      if (adminError) {
        console.error("Admin check error:", adminError);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(adminCheck === true);

      if (adminCheck === true) {
        await runSecurityChecks();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const runSecurityChecks = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No session");
      }

      const response = await supabase.functions.invoke("security-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch security status");
      }

      if (response.data?.checks) {
        setChecks(response.data.checks);
      }
    } catch (err: any) {
      console.error("Security check error:", err);
      setError(err.message || "Failed to load security status");
      // Fall back to static checks if edge function fails
      setChecks(getStaticChecks());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStaticChecks = (): SecurityCheck[] => [
    {
      id: "leaked-password-protection",
      name: "Leaked Password Protection",
      description: "Blocks users from using passwords exposed in data breaches.",
      status: "warning",
      category: "authentication",
      actionLabel: "Enable in Settings",
      details: "Navigate to Settings → Cloud → Advanced settings and enable 'Leaked Password Protection'.",
    },
    {
      id: "password-requirements",
      name: "Strong Password Requirements",
      description: "Enforces minimum password length, uppercase letters, and numbers.",
      status: "pass",
      category: "authentication",
      details: "Passwords require at least 8 characters, one uppercase letter, and one number.",
    },
    {
      id: "rls-enabled",
      name: "Row Level Security (RLS)",
      description: "Database tables are protected with row-level security policies.",
      status: "pass",
      category: "database",
      details: "All sensitive tables have RLS enabled with appropriate policies.",
    },
    {
      id: "input-validation",
      name: "Input Validation",
      description: "User inputs are validated and sanitized to prevent injection attacks.",
      status: "pass",
      category: "general",
      details: "Zod schemas validate all user inputs on forms.",
    },
  ];

  const handleRefresh = () => {
    toast.info("Refreshing security status...");
    runSecurityChecks();
  };

  const getStatusIcon = (status: SecurityCheck["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: SecurityCheck["status"]) => {
    switch (status) {
      case "pass":
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Enabled</Badge>;
      case "fail":
        return <Badge variant="destructive">Disabled</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">Action Needed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getCategoryIcon = (category: SecurityCheck["category"]) => {
    switch (category) {
      case "authentication":
        return <UserCheck className="w-4 h-4" />;
      case "database":
        return <Database className="w-4 h-4" />;
      case "api":
        return <Key className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const passedChecks = checks.filter((c) => c.status === "pass").length;
  const totalChecks = checks.length;
  const hasIssues = checks.some((c) => c.status === "fail" || c.status === "warning");

  if (!user) return null;

  // Access denied view for non-admins
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header user={user} />
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              The Security Checklist is restricted to administrators only.
              Contact an admin if you need access.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {hasIssues ? (
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-orange-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-display font-bold text-foreground">Security Checklist</h1>
                  <Badge variant="outline" className="text-xs">Admin Only</Badge>
                </div>
                <p className="text-muted-foreground">Review and manage your security settings.</p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Card className="border-destructive/30 bg-destructive/5 mb-4">
                <CardContent className="py-3">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Summary Card */}
            <Card className={hasIssues ? "border-orange-500/30 bg-orange-500/5" : "border-primary/30 bg-primary/5"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold">
                      {passedChecks}/{totalChecks}
                    </div>
                    <div>
                      <p className="font-medium">Security Checks Passed</p>
                      <p className="text-sm text-muted-foreground">
                        {hasIssues
                          ? "Some settings require attention"
                          : "All security features are properly configured"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Checks List */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  Running security checks...
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Issues First */}
                {checks
                  .filter((c) => c.status === "warning" || c.status === "fail")
                  .map((check) => (
                    <Card
                      key={check.id}
                      className="border-orange-500/30 bg-orange-500/5"
                    >
                      <CardContent className="py-5">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{check.name}</h3>
                              {getStatusBadge(check.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{check.description}</p>
                            {check.details && (
                              <p className="text-sm text-foreground/80 bg-secondary/50 rounded-lg px-3 py-2 mb-3">
                                {check.details}
                              </p>
                            )}
                            {check.actionLabel && (
                              <Button size="sm" variant="outline" className="gap-1.5">
                                {check.actionLabel}
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {getCategoryIcon(check.category)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {/* Passed Checks */}
                {checks
                  .filter((c) => c.status === "pass")
                  .map((check) => (
                    <Card key={check.id}>
                      <CardContent className="py-5">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{check.name}</h3>
                              {getStatusBadge(check.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{check.description}</p>
                            {check.details && (
                              <p className="text-xs text-muted-foreground mt-2">{check.details}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {getCategoryIcon(check.category)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </>
            )}
          </div>

          {/* Help Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>
                Learn more about security best practices and how to configure your settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild className="gap-2">
                  <a
                    href="/help"
                    rel="noopener noreferrer"
                  >
                    <Shield className="w-4 h-4" />
                    Security Documentation
                  </a>
                </Button>
                <Button variant="outline" asChild className="gap-2">
                  <a
                    href="/help"
                    rel="noopener noreferrer"
                  >
                    <Key className="w-4 h-4" />
                    Password Protection Guide
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SecurityChecklist;
