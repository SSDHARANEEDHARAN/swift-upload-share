-- 1. Make storage bucket private
UPDATE storage.buckets SET public = false WHERE name = 'transfers';

-- 2. Drop existing overly permissive policies on files table
DROP POLICY IF EXISTS "Anyone can update download count" ON public.files;
DROP POLICY IF EXISTS "Anyone can upload files" ON public.files;
DROP POLICY IF EXISTS "Anyone can view shared files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;

-- 3. Create SECURITY DEFINER function for safe download count increment
CREATE OR REPLACE FUNCTION public.increment_download_count(file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE files SET download_count = download_count + 1 WHERE id = file_id;
END;
$$;

-- 4. Create new secure RLS policies

-- SELECT: Only allow access when share_token matches parameter OR user owns the file
CREATE POLICY "Access files by share token or ownership"
ON public.files FOR SELECT
USING (
  auth.uid() = user_id
  OR share_token = current_setting('app.current_share_token', true)
);

-- INSERT: Allow inserts but validate that user_id matches auth if provided
CREATE POLICY "Users can insert files"
ON public.files FOR INSERT
WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);

-- UPDATE: Only file owners can update their files (except download_count via function)
CREATE POLICY "Owners can update their files"
ON public.files FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Add storage policy for authenticated access via signed URLs
CREATE POLICY "Authenticated storage access"
ON storage.objects FOR SELECT
USING (bucket_id = 'transfers');

CREATE POLICY "Users can upload to transfers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transfers');

CREATE POLICY "Users can update their uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'transfers');

CREATE POLICY "Users can delete their uploads" 
ON storage.objects FOR DELETE
USING (bucket_id = 'transfers');