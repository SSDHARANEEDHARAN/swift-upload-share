-- Drop ALL existing policies on chat tables to start fresh
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admin can update their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admin can delete their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Admin can delete participants" ON public.chat_participants;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

-- Recreate ALL policies properly

-- chat_rooms policies
CREATE POLICY "Users can create rooms"
ON public.chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by AND auth.uid() = admin_id);

CREATE POLICY "Users can view their rooms"
ON public.chat_rooms
FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_room_ids(auth.uid())));

CREATE POLICY "Admins can update rooms"
ON public.chat_rooms
FOR UPDATE
TO authenticated
USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete rooms"
ON public.chat_rooms
FOR DELETE
TO authenticated
USING (auth.uid() = admin_id);

-- chat_participants policies
CREATE POLICY "View participants in joined rooms"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())) OR user_id = auth.uid());

CREATE POLICY "Add participants to rooms"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Update own participation"
ON public.chat_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins delete participants"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms 
    WHERE chat_rooms.id = chat_participants.room_id 
    AND chat_rooms.admin_id = auth.uid()
  )
);

-- chat_messages policies
CREATE POLICY "View messages in joined rooms"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

CREATE POLICY "Send messages to joined rooms"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_room_participant(auth.uid(), room_id)
);