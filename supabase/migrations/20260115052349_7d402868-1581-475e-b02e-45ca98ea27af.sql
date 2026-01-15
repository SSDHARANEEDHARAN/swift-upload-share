-- Fix: Update search_users_for_chat to not expose email addresses
-- Must drop and recreate since return type is changing

-- Drop the existing function
DROP FUNCTION IF EXISTS public.search_users_for_chat(TEXT);

-- Recreate without email in return type
CREATE OR REPLACE FUNCTION public.search_users_for_chat(search_term TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require at least 3 characters to prevent enumeration
  IF LENGTH(TRIM(search_term)) < 3 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.display_name ILIKE '%' || TRIM(search_term) || '%'
  LIMIT 10;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users_for_chat(TEXT) TO authenticated;