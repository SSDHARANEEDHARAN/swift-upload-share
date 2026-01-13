-- Drop get_profile_public_info first to change return type
DROP FUNCTION IF EXISTS public.get_profile_public_info(uuid[]);

-- Fix get_profile_public_info to add authorization checks
-- This function is for getting public profile info for specific users (e.g., chat participants)
CREATE OR REPLACE FUNCTION public.get_profile_public_info(user_ids UUID[])
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT, is_online BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Return only public info (no email) for requested user IDs
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    COALESCE(up.is_online, false) as is_online
  FROM profiles p
  LEFT JOIN user_presence up ON up.user_id = p.id
  WHERE p.id = ANY(user_ids);
END;
$$;

-- Create shared_notes_revisions table for rollback capability
CREATE TABLE IF NOT EXISTS public.shared_notes_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.shared_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on revisions table
ALTER TABLE public.shared_notes_revisions ENABLE ROW LEVEL SECURITY;

-- Anyone can view revisions (same access as notes)
CREATE POLICY "Anyone can view note revisions" 
ON public.shared_notes_revisions 
FOR SELECT 
USING (true);

-- Create trigger to save revision on every update
CREATE OR REPLACE FUNCTION public.save_note_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save revision if content or title actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO shared_notes_revisions (note_id, content, title)
    VALUES (OLD.id, OLD.content, OLD.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS save_note_revision_trigger ON shared_notes;
CREATE TRIGGER save_note_revision_trigger
BEFORE UPDATE ON shared_notes
FOR EACH ROW
EXECUTE FUNCTION save_note_revision();

-- Add content size validation for shared notes
CREATE OR REPLACE FUNCTION public.validate_note_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Limit note content to 1MB
  IF length(NEW.content) > 1000000 THEN
    RAISE EXCEPTION 'Note content too large (max 1MB)';
  END IF;
  
  -- Limit title to 500 characters
  IF length(NEW.title) > 500 THEN
    RAISE EXCEPTION 'Note title too long (max 500 characters)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_note_content_trigger ON shared_notes;
CREATE TRIGGER validate_note_content_trigger
BEFORE INSERT OR UPDATE ON shared_notes
FOR EACH ROW
EXECUTE FUNCTION validate_note_content();