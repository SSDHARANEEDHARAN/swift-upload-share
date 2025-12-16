-- Improve increment_download_count function with validation
CREATE OR REPLACE FUNCTION public.increment_download_count(file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment if file exists and is not expired
  UPDATE files 
  SET download_count = download_count + 1 
  WHERE id = file_id 
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$;

-- Improve get_files_by_share_token function with token format validation
CREATE OR REPLACE FUNCTION public.get_files_by_share_token(p_share_token text)
RETURNS SETOF public.files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate token format (32 hex characters)
  IF p_share_token IS NULL OR p_share_token !~ '^[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid token format';
  END IF;
  
  RETURN QUERY 
  SELECT * FROM files 
  WHERE share_token = p_share_token
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$;