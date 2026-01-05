import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Users, Clock } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";

interface ChatRoom {
  id: string;
  name: string | null;
  last_activity_at: string | null;
}

interface UnreadCount {
  room_id: string;
  unread_count: number;
}

interface RecentChatsPreviewProps {
  user: User;
  onOpenChat: () => void;
}

export const RecentChatsPreview = ({ user, onOpenChat }: RecentChatsPreviewProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch rooms where user is an accepted participant
        const { data: participantData } = await supabase
          .from("chat_participants")
          .select("room_id, chat_rooms(id, name, last_activity_at)")
          .eq("user_id", user.id)
          .eq("is_accepted", true);

        if (participantData) {
          const userRooms = participantData
            .map(p => p.chat_rooms as unknown as ChatRoom)
            .filter(Boolean)
            .sort((a, b) => 
              new Date(b.last_activity_at || 0).getTime() - 
              new Date(a.last_activity_at || 0).getTime()
            )
            .slice(0, 5); // Show only top 5 recent
          setRooms(userRooms);
        }

        // Fetch unread counts using the database function
        const { data: unreadData } = await supabase.rpc("get_unread_counts", {
          p_user_id: user.id,
        });

        if (unreadData) {
          setUnreadCounts(unreadData as UnreadCount[]);
        }
      } catch (error) {
        console.error("Error fetching recent chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to new messages for realtime unread updates
    const channel = supabase
      .channel("recent-chats-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const getUnreadCount = (roomId: string) => {
    const found = unreadCounts.find(u => u.room_id === roomId);
    return found?.unread_count || 0;
  };

  const totalUnread = unreadCounts.reduce((sum, u) => sum + u.unread_count, 0);

  if (loading || rooms.length === 0) {
    return null;
  }

  return (
    <Card className="w-full animate-fade-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Recent Chats
          </CardTitle>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {rooms.map(room => {
              const unread = getUnreadCount(room.id);
              return (
                <button
                  key={room.id}
                  onClick={onOpenChat}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {room.name || "Chat Room"}
                      </p>
                      {room.last_activity_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(room.last_activity_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  {unread > 0 && (
                    <Badge className="ml-2 flex-shrink-0 text-xs">
                      {unread}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
