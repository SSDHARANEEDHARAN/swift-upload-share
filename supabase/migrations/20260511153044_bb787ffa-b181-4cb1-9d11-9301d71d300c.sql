
-- 1) Hide email column on profiles from regular roles
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 2) Files table - drop unsafe policy that relied on a client-settable session variable
DROP POLICY IF EXISTS "Access files by share token or ownership" ON public.files;

-- Replace with owner-only direct access; anonymous share-link recipients use get_files_by_share_token() RPC
CREATE POLICY "Owners can view their files"
ON public.files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) Storage object policies - replace permissive ones with folder-scoped rules
DROP POLICY IF EXISTS "Allow signed URL access to transfers" ON storage.objects;
DROP POLICY IF EXISTS "Allow file uploads" ON storage.objects;

-- Authenticated owners can read their own files via direct API
CREATE POLICY "Owners can read their transfer files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'transfers'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Authenticated users upload only into their own folder
CREATE POLICY "Authenticated users upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transfers'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Anonymous users upload only into the shared anonymous folder
CREATE POLICY "Anonymous users upload to anonymous folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'transfers'
  AND (storage.foldername(name))[1] = 'anonymous'
);
