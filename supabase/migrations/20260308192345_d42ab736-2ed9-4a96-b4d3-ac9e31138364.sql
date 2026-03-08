
-- Fix 1: Restrict user_presence visibility to chat participants only
DROP POLICY IF EXISTS "Anyone can view presence" ON public.user_presence;

CREATE POLICY "Chat participants can view each other's presence"
ON public.user_presence FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT cp2.user_id 
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.room_id = cp2.room_id
    WHERE cp1.user_id = auth.uid() AND cp1.is_accepted = true
  )
);

-- Fix 2: Restrict shared_notes UPDATE to token-based access
DROP POLICY IF EXISTS "Anyone can update shared notes" ON public.shared_notes;

CREATE POLICY "Update shared notes by token"
ON public.shared_notes FOR UPDATE
USING (
  share_token = current_setting('app.current_share_token', true)
);
