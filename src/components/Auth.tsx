import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, HandMetal, DoorOpen } from "lucide-react";

export const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDoor, setShowDoor] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Show door animation
        setShowDoor(true);
        setTimeout(() => {
          toast.success("Welcome back! 🤝");
          navigate("/");
        }, 1200);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            email: email,
            display_name: displayName || email.split("@")[0],
          });

          if (profileError) {
            console.error("Profile creation error:", profileError);
          }

          // Show door animation
          setShowDoor(true);
          setTimeout(() => {
            toast.success("Account created! Welcome! 🤝");
            navigate("/");
          }, 1200);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Door Animation Overlay */}
      {showDoor && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="animate-door-open">
            <DoorOpen className="w-32 h-32 text-primary" />
          </div>
          <div className="absolute animate-handshake delay-300">
            <HandMetal className="w-24 h-24 text-accent" />
          </div>
        </div>
      )}

      <Card className="w-full max-w-md p-8 shadow-[var(--shadow-card)] animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] flex items-center justify-center">
            <HandMetal className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] bg-clip-text text-transparent mb-2">
            {isLogin ? "Welcome Back" : "Join Go"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Enter to continue your journey" : "Start sharing files up to 1GB"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Display Name
              </label>
              <Input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="h-12"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="h-12"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
              className="h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>{isLogin ? "Sign In" : "Create Account"}</>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-sm text-primary hover:underline"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Anonymous users can share up to 200MB
          </p>
        </div>
      </Card>
    </div>
  );
};
