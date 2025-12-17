-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert files" ON public.files;

-- Create a new PERMISSIVE INSERT policy
CREATE POLICY "Users can insert files" 
ON public.files 
FOR INSERT 
WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));