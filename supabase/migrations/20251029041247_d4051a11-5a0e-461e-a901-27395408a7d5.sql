-- Create storage bucket for file transfers
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfers', 'transfers', true)
ON CONFLICT (id) DO NOTHING;

-- Create files table to track uploads
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert files
CREATE POLICY "Anyone can upload files"
ON public.files
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read file metadata via share token
CREATE POLICY "Anyone can view files"
ON public.files
FOR SELECT
USING (true);

-- Allow anyone to update download count
CREATE POLICY "Anyone can update download count"
ON public.files
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Storage policies for transfers bucket
CREATE POLICY "Anyone can upload to transfers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'transfers');

CREATE POLICY "Anyone can view transfers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'transfers');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_share_token ON public.files(share_token);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);