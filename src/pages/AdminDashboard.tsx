import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  ShieldX,
  Users,
  Search,
  UserCog,
  Crown,
  User,
  RefreshCw,
  Trash2,
  ClipboardList,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

interface UserWithRole {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: AppRole | null;
  created_at: string | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  actor_id: string;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_email: string | null;
  target_name: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    // Set a timeout to prevent hanging on auth check
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        navigate("/auth");
      }
    }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          if (!session?.user) {
            navigate("/auth");
            return;
          }
          setUser(session.user);
          checkAdminAndLoadUsers(session.user.id);
        }
      })
      .catch((error) => {
        console.error("Auth session error:", error);
        if (isMounted) {
          navigate("/auth");
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        if (!session?.user) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkAdminAndLoadUsers = async (userId: string) => {
    try {
      const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
      
      if (adminError) {
        console.error("Admin check error:", adminError);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(adminCheck === true);

      if (adminCheck === true) {
        await loadUsers();
        await loadAuditLogs();
      }
      setLoading(false);
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_users_with_roles");
      
      if (error) {
        console.error("Error loading users:", error);
        toast.error("Failed to load users");
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
      toast.error("Failed to load users");
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id && newRole !== "admin") {
      toast.error("You cannot demote yourself from admin");
      return;
    }

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase.rpc("set_user_role", {
        target_user_id: userId,
        new_role: newRole,
      });

      if (error) throw error;

      toast.success(`User role updated to ${newRole}`);
      await loadUsers();
      await loadAuditLogs();
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error(err.message || "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_audit_logs", {
        p_limit: 100,
        p_offset: 0,
      });
      
      if (error) {
        console.error("Error loading audit logs:", error);
        toast.error("Failed to load audit logs");
        return;
      }

      setAuditLogs(data || []);
    } catch (err) {
      console.error("Error loading audit logs:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("You cannot remove your own role");
      return;
    }

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase.rpc("remove_user_role", {
        target_user_id: userId,
      });

      if (error) throw error;

      toast.success("User role removed");
      await loadUsers();
      await loadAuditLogs();
    } catch (err: any) {
      console.error("Error removing role:", err);
      toast.error(err.message || "Failed to remove role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleIcon = (role: AppRole | null) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "moderator":
        return <UserCog className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Admin</Badge>;
      case "moderator":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Moderator</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "role_change":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Role Changed</Badge>;
      case "role_removed":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Role Removed</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatRoleChange = (log: AuditLog) => {
    const oldRole = log.old_value?.role || "none";
    const newRole = log.new_value?.role || "none";
    
    if (log.action === "role_removed") {
      return (
        <span className="text-sm">
          <span className="text-muted-foreground">Removed role:</span>{" "}
          <span className="font-medium text-destructive">{oldRole}</span>
        </span>
      );
    }
    
    return (
      <span className="text-sm flex items-center gap-1">
        <span className="text-muted-foreground">{oldRole}</span>
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium text-primary">{newRole}</span>
      </span>
    );
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(query) ||
      u.display_name?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header user={null} />
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking admin access...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
              The Admin Dashboard is restricted to administrators only.
            </p>
            <Button onClick={() => navigate("/")}>
              Go to Home
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
                  <Badge variant="outline" className="text-xs">Admin Only</Badge>
                </div>
                <p className="text-muted-foreground">Manage users and their roles.</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</p>
                    <p className="text-sm text-muted-foreground">Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{users.filter((u) => u.role === "moderator").length}</p>
                    <p className="text-sm text-muted-foreground">Moderators</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for User Management and Audit Logs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Search and manage user roles.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-64"
                        />
                      </div>
                      <Button variant="outline" size="icon" onClick={loadUsers}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                      Loading users...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u) => {
                            const displayName = u.display_name || u.email?.split("@")[0] || "Unknown";
                            const initials = displayName.slice(0, 2).toUpperCase();
                            const isCurrentUser = u.id === user?.id;

                            return (
                              <TableRow key={u.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={u.avatar_url || undefined} alt={displayName} />
                                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{displayName}</span>
                                      {isCurrentUser && (
                                        <Badge variant="outline" className="text-xs">You</Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{u.email || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(u.role)}
                                    {getRoleBadge(u.role)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Select
                                      value={u.role || "user"}
                                      onValueChange={(value) => handleRoleChange(u.id, value as AppRole)}
                                      disabled={updatingUserId === u.id || isCurrentUser}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {u.role && !isCurrentUser && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            disabled={updatingUserId === u.id}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove User Role</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will remove all special permissions from {displayName}. They will become a regular user.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveRole(u.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove Role
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {filteredUsers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                {searchQuery ? "No users found matching your search." : "No users found."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Audit Logs
                      </CardTitle>
                      <CardDescription>Track all admin actions for security compliance.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadAuditLogs} className="gap-2">
                      <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                      Loading audit logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-4 opacity-50" />
                      <p>No audit logs yet.</p>
                      <p className="text-sm">Admin actions will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target User</TableHead>
                            <TableHead>Change</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log) => {
                            const actorName = log.actor_name || log.actor_email?.split("@")[0] || "Unknown";
                            const targetName = log.target_name || log.target_email?.split("@")[0] || "Unknown";

                            return (
                              <TableRow key={log.id}>
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-3 h-3 text-amber-500" />
                                    <span className="font-medium">{actorName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getActionBadge(log.action)}
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{targetName}</span>
                                </TableCell>
                                <TableCell>
                                  {formatRoleChange(log)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;