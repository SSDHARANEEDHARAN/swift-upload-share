-- Drop all existing overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload to transfers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view transfers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated storage access" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to transfers" ON storage.objects;

-- Create secure policies
-- Allow uploads (anonymous users can still upload - design requirement)
CREATE POLICY "Allow file uploads" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transfers');

-- No public SELECT - signed URLs will be used for downloads
-- This makes signed URLs actually meaningful

-- Authenticated users can update their own files (folder path contains user_id)
CREATE POLICY "Owners can update files" ON storage.objects FOR UPDATE
USING (bucket_id = 'transfers' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'transfers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can delete their own files
CREATE POLICY "Owners can delete files" ON storage.objects FOR DELETE
USING (bucket_id = 'transfers' AND auth.uid()::text = (storage.foldername(name))[1]);