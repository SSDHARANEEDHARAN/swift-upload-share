-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

-- Create security definer function to check room membership without recursion
CREATE OR REPLACE FUNCTION public.is_room_participant(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id
      AND room_id = _room_id
      AND is_accepted = true
  )
$$;

-- Create security definer function to get user's room IDs
CREATE OR REPLACE FUNCTION public.get_user_room_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id
  FROM public.chat_participants
  WHERE user_id = _user_id
    AND is_accepted = true
$$;

-- Recreate policies using the security definer functions

-- chat_participants: Users can view participants in rooms they belong to
CREATE POLICY "Users can view participants in their rooms"
ON public.chat_participants
FOR SELECT
USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- chat_rooms: Users can view rooms they participate in
CREATE POLICY "Users can view rooms they participate in"
ON public.chat_rooms
FOR SELECT
USING (id IN (SELECT public.get_user_room_ids(auth.uid())));

-- chat_messages: Users can view messages in their rooms
CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- chat_messages: Participants can send messages
CREATE POLICY "Participants can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_room_participant(auth.uid(), room_id)
);