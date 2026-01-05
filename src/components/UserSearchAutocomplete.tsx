import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Circle } from "lucide-react";

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_online?: boolean;
}

interface UserSearchAutocompleteProps {
  onSelect: (profile: UserProfile) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export const UserSearchAutocomplete = ({
  onSelect,
  excludeIds = [],
  placeholder = "Search by email or name...",
}: UserSearchAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = query.trim().toLowerCase();
        
        // Fetch profiles
        const { data: profilesData, error } = await supabase
          .from("profiles")
          .select("id, display_name, email, avatar_url")
          .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) {
          console.error("Search error:", error);
          setResults([]);
        } else {
          // Filter out excluded IDs
          const filtered = (profilesData || []).filter((p) => !excludeIds.includes(p.id));
          
          // Fetch online status for filtered users
          const userIds = filtered.map(p => p.id);
          const { data: presenceData } = await supabase
            .from("user_presence")
            .select("user_id, is_online, last_seen_at")
            .in("user_id", userIds);
          
          // Merge presence data
          const now = Date.now();
          const fiveMinutesAgo = now - 5 * 60 * 1000;
          
          const resultsWithPresence = filtered.map(profile => {
            const presence = presenceData?.find(p => p.user_id === profile.id);
            const isOnline = presence?.is_online && 
              new Date(presence.last_seen_at).getTime() > fiveMinutesAgo;
            return { ...profile, is_online: !!isOnline };
          });
          
          setResults(resultsWithPresence);
          setShowDropdown(resultsWithPresence.length > 0);
        }
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, excludeIds]);

  const handleSelect = (profile: UserProfile) => {
    onSelect(profile);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          <ScrollArea className="max-h-48">
            {results.map((profile) => {
              const displayName = profile.display_name || profile.email || "Unknown";
              const initials = displayName.slice(0, 2).toUpperCase();
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelect(profile)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <Circle 
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                        profile.is_online 
                          ? "fill-green-500 text-green-500" 
                          : "fill-muted-foreground/30 text-muted-foreground/30"
                      }`} 
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{profile.display_name || "No name"}</span>
                      <span className={`text-xs ${profile.is_online ? "text-green-500" : "text-muted-foreground"}`}>
                        {profile.is_online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
