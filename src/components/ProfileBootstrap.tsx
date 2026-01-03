import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

async function ensureProfileForUser(user: any) {
  if (!user?.id) return;

  const email: string | null = user.email ?? null;
  const fallbackName = email ? email.split("@")[0] : `user-${String(user.id).slice(0, 6)}`;

  // Check existence first to avoid overwriting user-chosen display names.
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  // If SELECT failed for some reason, still try the insert as best-effort.
  if (selectError) {
    console.warn("ensureProfileForUser: select failed", selectError);
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    display_name: fallbackName,
  });

  if (insertError) {
    // Non-fatal (RLS / duplicate / etc.)
    console.warn("ensureProfileForUser: insert failed", insertError);
  }
}

export function ProfileBootstrap() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) ensureProfileForUser(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) ensureProfileForUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
