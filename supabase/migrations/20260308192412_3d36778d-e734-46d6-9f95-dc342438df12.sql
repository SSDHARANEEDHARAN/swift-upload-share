
-- Replace the token-based UPDATE policy with a practical one
-- Since clients update by id after loading via share_token, 
-- we use an RPC function for secure updates instead

DROP POLICY IF EXISTS "Update shared notes by token" ON public.shared_notes;

-- Create a security definer function for updating notes by token
CREATE OR REPLACE FUNCTION public.update_shared_note(
  p_share_token text,
  p_title text,
  p_content text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE shared_notes
  SET title = p_title, content = p_content
  WHERE share_token = p_share_token;
  
  RETURN FOUND;
END;
$$;
