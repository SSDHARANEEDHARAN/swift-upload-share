-- Add SELECT policy for storage objects so signed URLs work
-- This allows anyone with a valid signed URL to access the files
CREATE POLICY "Allow signed URL access to transfers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'transfers');