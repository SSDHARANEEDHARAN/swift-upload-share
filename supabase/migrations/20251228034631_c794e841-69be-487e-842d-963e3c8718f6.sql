-- Fix: share_token is a batch/share-link identifier, so multiple file rows must be allowed to share it.
-- The current UNIQUE constraint causes uploads to fail after the first file (or when adding more files).

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_share_token_key;

-- Safety: in case the unique index exists independently of the constraint
DROP INDEX IF EXISTS public.files_share_token_key;

-- Keep fast lookups for /download/:shareToken
CREATE INDEX IF NOT EXISTS idx_files_share_token
  ON public.files (share_token);
