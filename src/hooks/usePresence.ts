import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const HEARTBEAT_INTERVAL = 60000; // 1 minute

export const usePresence = (user: User | null) => {
  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
          is_online: isOnline,
        }, {
          onConflict: "user_id",
        });

      if (error) {
        console.error("Error updating presence:", error);
      }
    } catch (err) {
      console.error("Presence update failed:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Mark user as online
    updatePresence(true);

    // Heartbeat to keep presence active
    const interval = setInterval(() => {
      updatePresence(true);
    }, HEARTBEAT_INTERVAL);

    // Mark offline on unload
    const handleUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      const body = JSON.stringify({
        is_online: false,
        last_seen_at: new Date().toISOString(),
      });
      
      navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      updatePresence(false);
    };
  }, [user, updatePresence]);
};
