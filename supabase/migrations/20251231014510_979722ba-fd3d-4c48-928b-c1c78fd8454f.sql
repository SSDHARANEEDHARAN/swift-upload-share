-- Drop and recreate the insert policy for chat_rooms with proper check
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;

CREATE POLICY "Users can create rooms" 
ON public.chat_rooms 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = created_by 
  AND auth.uid() = admin_id
);

-- Also ensure the user can view the room immediately after creation
DROP POLICY IF EXISTS "Users can view their rooms" ON public.chat_rooms;

CREATE POLICY "Users can view their rooms" 
ON public.chat_rooms 
FOR SELECT 
USING (
  auth.uid() = admin_id 
  OR auth.uid() = created_by 
  OR id IN (SELECT get_user_room_ids(auth.uid()))
);