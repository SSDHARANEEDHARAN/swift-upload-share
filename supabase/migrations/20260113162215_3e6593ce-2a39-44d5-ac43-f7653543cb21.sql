-- Fix 1: Secure chat_participants INSERT policy to only allow room admins
DROP POLICY IF EXISTS "Add participants to rooms" ON public.chat_participants;

-- Only allow room admins to add participants (invite users)
CREATE POLICY "Room admins can add participants"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = room_id
    AND chat_rooms.admin_id = auth.uid()
  )
);

-- Fix 2: Create a secure function to lookup user profiles for chat invitations
-- This prevents direct enumeration while allowing legitimate user lookups
CREATE OR REPLACE FUNCTION public.search_users_for_chat(search_term TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return users if search term is at least 3 characters
  -- This prevents enumeration attacks
  IF LENGTH(TRIM(search_term)) < 3 THEN
    RETURN;
  END IF;
  
  -- Return matching users (limited to 10 results)
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.email,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.email ILIKE '%' || TRIM(search_term) || '%'
    OR p.display_name ILIKE '%' || TRIM(search_term) || '%'
  LIMIT 10;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users_for_chat(TEXT) TO authenticated;

-- Fix 3: Add policy to allow chat participants to view other participants' profiles
-- This is needed for displaying chat participant info without exposing all profiles
DROP POLICY IF EXISTS "Chat participants can view each other profiles" ON public.profiles;

CREATE POLICY "Chat participants can view each other profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Profiles of users in same chat rooms
  id IN (
    SELECT cp2.user_id 
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.room_id = cp2.room_id
    WHERE cp1.user_id = auth.uid()
    AND cp1.is_accepted = true
  )
);

-- Drop the old restrictive policy that only allowed own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;