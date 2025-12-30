-- Add avatar_url column to profiles table for user avatars
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile avatar image';