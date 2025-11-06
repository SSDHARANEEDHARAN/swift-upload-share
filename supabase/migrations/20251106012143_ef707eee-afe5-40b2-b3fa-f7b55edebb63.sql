-- Make user_id nullable to support anonymous uploads
ALTER TABLE public.files ALTER COLUMN user_id DROP NOT NULL;

-- Add is_finalized flag to track if batch is complete
ALTER TABLE public.files ADD COLUMN is_finalized boolean DEFAULT false;

-- Update RLS policies to allow anonymous uploads
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;
CREATE POLICY "Anyone can upload files" ON public.files
FOR INSERT WITH CHECK (true);

-- Allow anonymous users to view files via share token
DROP POLICY IF EXISTS "Users can view their own files and files shared via token" ON public.files;
CREATE POLICY "Anyone can view shared files" ON public.files
FOR SELECT USING (share_token IS NOT NULL OR auth.uid() = user_id);

-- Allow users to update their own batches (for finalization)
CREATE POLICY "Users can update their own files" ON public.files
FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
