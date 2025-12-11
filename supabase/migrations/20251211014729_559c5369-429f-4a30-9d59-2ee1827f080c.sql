-- Create a SECURITY DEFINER function to fetch files by share token
CREATE OR REPLACE FUNCTION public.get_files_by_share_token(p_share_token text)
RETURNS SETOF public.files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM files 
  WHERE share_token = p_share_token;
END;
$$;