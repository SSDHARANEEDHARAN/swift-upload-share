-- Allow users to view other profiles for chat user search
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows viewing all profiles (needed for user search in chat)
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Keep other policies unchanged (update, insert, delete own profile only)