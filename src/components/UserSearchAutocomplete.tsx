import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
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
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, email, avatar_url")
          .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) {
          console.error("Search error:", error);
          setResults([]);
        } else {
          // Filter out excluded IDs
          const filtered = (data || []).filter((p) => !excludeIds.includes(p.id));
          setResults(filtered);
          setShowDropdown(filtered.length > 0);
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
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{profile.display_name || "No name"}</span>
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
