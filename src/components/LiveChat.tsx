import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserSearchAutocomplete } from "@/components/UserSearchAutocomplete";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  X, 
  Send, 
  Plus, 
  Users, 
  Check, 
  Trash2,
  AlertTriangle,
  Loader2,
  Circle
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface ChatRoom {
  id: string;
  name: string;
  admin_id: string;
  last_activity_at: string;
  warning_shown_at: string | null;
}

interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  is_accepted: boolean;
  avatar_url?: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    username: string;
    online_at: string;
    is_typing: boolean;
  }[];
}

interface LiveChatProps {
  user: User | null;
}

const MAX_PARTICIPANTS_GUEST = 2;
const MAX_PARTICIPANTS_LOGGED_IN = 10;
const INACTIVITY_WARNING_DAYS = 5;
const WARNING_DURATION_HOURS = 5;
const TYPING_TIMEOUT = 3000;

export const LiveChat = ({ user }: LiveChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { toast } = useToast();

  const maxParticipants = user ? MAX_PARTICIPANTS_LOGGED_IN : MAX_PARTICIPANTS_GUEST;

  // Fetch user's rooms and pending invites
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch rooms where user is a participant
      const { data: participantData } = await supabase
        .from("chat_participants")
        .select("*, chat_rooms(*)")
        .eq("user_id", user.id);

      if (participantData) {
        const userRooms = participantData
          .filter(p => p.is_accepted)
          .map(p => p.chat_rooms as unknown as ChatRoom)
          .filter(Boolean);
        setRooms(userRooms);

        const pending = participantData.filter(p => !p.is_accepted);
        setPendingInvites(pending);
      }

      // Get username and avatar from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setMyUsername(profile.display_name || profile.email || "");
        setMyAvatarUrl(profile.avatar_url);
      } else {
        const fallbackEmail = user.email || "";
        const fallbackName = fallbackEmail || `user-${user.id.slice(0, 6)}`;

        setMyUsername(fallbackName);

        // Best-effort: ensure the profile row exists so other users can find you.
        if (fallbackEmail) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            email: fallbackEmail,
            display_name: fallbackEmail.split("@")[0],
          });

          if (insertError) {
            console.warn("Failed to auto-create profile row:", insertError);
          }
        } else if (profileError) {
          console.warn("Profile missing and no email available:", profileError);
        }
      }
    };

    fetchData();

    // Subscribe to participant changes for pending invites
    const channel = supabase
      .channel("chat-invites")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch messages for current room
  useEffect(() => {
    if (!currentRoom || !user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", currentRoom.id)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
      }

      // Fetch participants with their profile avatars
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("*")
        .eq("room_id", currentRoom.id);

      if (parts) {
        // Use SECURITY DEFINER RPC to fetch other users' public profile info (no email)
        const userIds = parts.map(p => p.user_id);
        const { data: profiles } = await supabase
          .rpc("get_profile_public_info", { user_ids: userIds });

        const participantsWithAvatars = parts.map(p => ({
          ...p,
          avatar_url: profiles?.find((pr: any) => pr.id === p.user_id)?.avatar_url || undefined,
        }));
        setParticipants(participantsWithAvatars);
      }
      
      // Mark room as read when opening
      await supabase
        .from("chat_read_status")
        .upsert({
          room_id: currentRoom.id,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: "room_id,user_id",
        });
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom, user]);

  // Presence and typing indicators
  useEffect(() => {
    if (!currentRoom || !user || !myUsername) return;

    const presenceChannel = supabase.channel(`presence-${currentRoom.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const onlineUserIds = Object.values(state)
          .flat()
          .map(p => p.user_id)
          .filter(id => id !== user.id);
        setOnlineUsers(onlineUserIds);

        const typing = Object.values(state)
          .flat()
          .filter(p => p.is_typing && p.user_id !== user.id)
          .map(p => p.username);
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            username: myUsername,
            online_at: new Date().toISOString(),
            is_typing: false,
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [currentRoom, user, myUsername]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!presenceChannelRef.current || !user || !myUsername) return;

    if (!isTyping) {
      setIsTyping(true);
      presenceChannelRef.current.track({
        user_id: user.id,
        username: myUsername,
        online_at: new Date().toISOString(),
        is_typing: true,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (presenceChannelRef.current && user && myUsername) {
        presenceChannelRef.current.track({
          user_id: user.id,
          username: myUsername,
          online_at: new Date().toISOString(),
          is_typing: false,
        });
      }
    }, TYPING_TIMEOUT);
  }, [isTyping, user, myUsername]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for inactive rooms warning
  useEffect(() => {
    if (!currentRoom) return;

    const lastActivity = new Date(currentRoom.last_activity_at);
    const now = new Date();
    const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity >= INACTIVITY_WARNING_DAYS) {
      toast({
        title: "Chat Inactivity Warning",
        description: `This chat will be deleted in ${WARNING_DURATION_HOURS} hours if no activity.`,
        variant: "destructive",
      });
    }
  }, [currentRoom, toast]);

  const createRoom = async () => {
    if (!user || !myUsername) {
      toast({
        title: "Error",
        description: "Please log in and set a username first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create room
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: `${myUsername}'s Chat`,
          created_by: user.id,
          admin_id: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add self as participant
      const { error: partError } = await supabase
        .from("chat_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: myUsername,
          is_accepted: true,
        });

      if (partError) throw partError;

      setRooms(prev => [...prev, room]);
      setCurrentRoom(room);
      toast({
        title: "Success",
        description: "Chat room created!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const sendInviteNotification = async (recipientUserId: string) => {
    try {
      await supabase.functions.invoke("send-chat-notification", {
        body: {
          type: "invitation",
          recipientUserId,
          inviterName: myUsername,
          roomName: currentRoom?.name,
          roomId: currentRoom?.id,
        },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const addUserToRoom = async (profile: { id: string; display_name: string | null; email: string | null }) => {
    if (!currentRoom || !user) return;

    // Check participant limit
    const acceptedParticipants = participants.filter(p => p.is_accepted).length;
    if (acceptedParticipants >= maxParticipants) {
      toast({
        title: "Error",
        description: `Maximum ${maxParticipants} participants allowed.`,
        variant: "destructive",
      });
      return;
    }

    // Check if user is already a participant
    const existingParticipant = participants.find(p => p.user_id === profile.id);
    if (existingParticipant) {
      toast({
        title: "Already Added",
        description: "This user is already in the chat or has a pending invitation.",
        variant: "destructive",
      });
      return;
    }

    // Can't add yourself
    if (profile.id === user.id) {
      toast({
        title: "Error",
        description: "You can't add yourself to the chat.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Add as pending participant
      const { error } = await supabase
        .from("chat_participants")
        .insert({
          room_id: currentRoom.id,
          user_id: profile.id,
          username: profile.display_name || profile.email || "User",
          is_accepted: false,
        });

      if (error) throw error;

      // Send email notification
      sendInviteNotification(profile.id);

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${profile.display_name || "user"}. Waiting for them to accept.`,
      });
      setShowAddUser(false);
    } catch (error: any) {
      console.error("Add user error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const acceptInvite = async (invite: ChatParticipant) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("chat_participants")
        .update({ is_accepted: true })
        .eq("id", invite.id);

      if (error) throw error;

      // Fetch the room
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", invite.room_id)
        .single();

      if (room) {
        setRooms(prev => [...prev, room]);
        setCurrentRoom(room);
      }

      setPendingInvites(prev => prev.filter(p => p.id !== invite.id));
      toast({
        title: "Success",
        description: "You joined the chat!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const removeParticipant = async (participantId: string) => {
    if (!currentRoom || currentRoom.admin_id !== user?.id) {
      toast({
        title: "Error",
        description: "Only admin can remove participants.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("chat_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;

      setParticipants(prev => prev.filter(p => p.id !== participantId));
      toast({
        title: "Success",
        description: "Participant removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessageNotification = async (content: string) => {
    if (!currentRoom) return;
    
    try {
      // Get other participants to notify
      const otherParticipants = participants.filter(
        p => p.user_id !== user?.id && p.is_accepted
      );

      for (const participant of otherParticipants) {
        await supabase.functions.invoke("send-chat-notification", {
          body: {
            type: "new_message",
            recipientUserId: participant.user_id,
            senderName: myUsername,
            roomName: currentRoom.name,
            roomId: currentRoom.id,
            messagePreview: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          },
        });
      }
    } catch (error) {
      console.error("Failed to send message notification:", error);
    }
  };

  const markRoomAsRead = async () => {
    if (!currentRoom || !user) return;
    
    try {
      await supabase
        .from("chat_read_status")
        .upsert({
          room_id: currentRoom.id,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: "room_id,user_id",
        });
    } catch (error) {
      console.error("Failed to mark room as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!currentRoom || !newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: currentRoom.id,
          sender_id: user.id,
          content: messageContent,
        });

      if (error) throw error;
      setNewMessage("");
      
      // Mark as read and optionally notify (don't await to keep UI snappy)
      markRoomAsRead();
      // Only send notifications if there are other participants online
      // This is a lightweight check - full notification logic is in the function
      sendMessageNotification(messageContent);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isAdmin = currentRoom?.admin_id === user?.id;

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        {isOpen && (
          <Card className="absolute bottom-16 right-0 w-80 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Please log in to use live chat.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-14 h-14 shadow-lg relative"
        data-chat-toggle
      >
        <MessageCircle className="w-6 h-6" />
        {pendingInvites.length > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
            {pendingInvites.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-96 h-[500px] shadow-xl flex flex-col">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Pending Invites */}
            {pendingInvites.length > 0 && !currentRoom && (
              <div className="p-3 border-b bg-accent/50">
                <p className="text-sm font-medium mb-2">Pending Invites</p>
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-2 bg-card rounded">
                    <span className="text-sm">Chat Invite</span>
                    <Button size="sm" onClick={() => acceptInvite(invite)}>
                      <Check className="w-4 h-4 mr-1" /> Accept
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!currentRoom ? (
              /* Room List */
              <div className="flex-1 overflow-auto p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Your Chats</span>
                  <Button size="sm" onClick={createRoom} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                {rooms.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No chats yet. Create one to start!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map(room => (
                      <Button
                        key={room.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setCurrentRoom(room)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {room.name || "Chat Room"}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Chat View */
              <>
                <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentRoom(null)}
                    >
                      ← Back
                    </Button>
                    <span className="font-medium text-sm">{currentRoom.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAddUser(!showAddUser)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {participants.filter(p => p.is_accepted).length}/{maxParticipants}
                    </Badge>
                  </div>
                </div>

                {/* Add User Form */}
                {showAddUser && isAdmin && (
                  <div className="p-3 border-b bg-accent/30">
                    <div className="mb-2">
                      <UserSearchAutocomplete
                        onSelect={(profile) => addUserToRoom(profile)}
                        excludeIds={[user.id, ...participants.map(p => p.user_id)]}
                        placeholder="Search by email or name..."
                      />
                    </div>
                    {/* Participants List with Online Status and Avatars */}
                    <div className="mt-2 space-y-1">
                      {participants.map(p => {
                        const isOnline = onlineUsers.includes(p.user_id) || p.user_id === user.id;
                        const initials = p.username.slice(0, 2).toUpperCase();
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs p-1 rounded bg-background">
                            <div className="flex items-center gap-1.5">
                              <div className="relative">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={p.avatar_url || undefined} alt={p.username} />
                                  <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                                </Avatar>
                                <Circle 
                                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${isOnline ? "fill-green-500 text-green-500" : "fill-muted text-muted"}`} 
                                />
                              </div>
                              <span className={p.is_accepted ? "" : "text-muted-foreground"}>
                                {p.username} {!p.is_accepted && "(pending)"}
                                {p.user_id === currentRoom.admin_id && " (admin)"}
                              </span>
                            </div>
                            {isAdmin && p.user_id !== user.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeParticipant(p.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warning Banner */}
                {currentRoom.warning_shown_at && (
                  <div className="p-2 bg-destructive/10 border-b flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Chat will be deleted due to inactivity!
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map(msg => {
                      const sender = participants.find(p => p.user_id === msg.sender_id);
                      const isMe = msg.sender_id === user.id;
                      const avatarUrl = isMe ? myAvatarUrl : sender?.avatar_url;
                      const initials = (sender?.username || "U").slice(0, 2).toUpperCase();
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={avatarUrl || undefined} alt={sender?.username} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <span className="text-xs text-muted-foreground mb-1">
                              {sender?.username || "Unknown"}
                            </span>
                            <div
                              className={`max-w-[200px] p-2 rounded-lg text-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="px-3 py-1 text-xs text-muted-foreground animate-pulse">
                    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                  </div>
                )}

                {/* Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
