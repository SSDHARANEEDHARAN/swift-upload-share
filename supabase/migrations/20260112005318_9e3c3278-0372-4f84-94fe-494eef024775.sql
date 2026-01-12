-- Fix 1: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Remove dangerous DELETE policy from shared_notes
DROP POLICY IF EXISTS "Anyone can delete shared notes" ON public.shared_notes;