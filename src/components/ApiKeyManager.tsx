import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Plus, Trash2, Key, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_revoked: boolean;
}

export const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchApiKeys();
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchApiKeys();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch API keys");
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'rtl_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    setCreating(true);
    const apiKey = generateApiKey();
    const keyHash = await hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
    });

    if (error) {
      toast.error("Failed to create API key");
    } else {
      setNewKeyValue(apiKey);
      setShowNewKey(true);
      toast.success("API key created successfully");
      fetchApiKeys();
    }
    setCreating(false);
  };

  const revokeApiKey = async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_revoked: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to revoke API key");
    } else {
      toast.success("API key revoked");
      fetchApiKeys();
    }
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete API key");
    } else {
      toast.success("API key deleted");
      fetchApiKeys();
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue(null);
    setShowNewKey(false);
  };

  if (!user) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Sign in to create and manage your API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Create and manage API keys for programmatic access
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  {newKeyValue 
                    ? "Your new API key has been created. Make sure to copy it now - you won't be able to see it again!"
                    : "Give your API key a name to help you remember what it's used for."
                  }
                </DialogDescription>
              </DialogHeader>
              
              {!newKeyValue ? (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production App"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                    <Button onClick={createApiKey} disabled={creating}>
                      {creating ? "Creating..." : "Create Key"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type={showNewKey ? "text" : "password"}
                            value={newKeyValue}
                            readOnly
                            className="pr-20 font-mono text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-10 top-0 h-full"
                            onClick={() => setShowNewKey(!showNewKey)}
                          >
                            {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => copyToClipboard(newKeyValue)}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-destructive">
                        ⚠️ This key will only be shown once. Store it securely!
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog}>Done</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    {key.is_revoked && (
                      <Badge variant="destructive">Revoked</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <code className="bg-muted px-2 py-0.5 rounded">{key.key_prefix}...</code>
                    <span className="mx-2">•</span>
                    Created {format(new Date(key.created_at), "MMM d, yyyy")}
                    {key.last_used_at && (
                      <>
                        <span className="mx-2">•</span>
                        Last used {format(new Date(key.last_used_at), "MMM d, yyyy")}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!key.is_revoked && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">Revoke</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately disable this API key. Any applications using it will no longer be able to authenticate.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => revokeApiKey(key.id)}>
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this API key. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteApiKey(key.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
