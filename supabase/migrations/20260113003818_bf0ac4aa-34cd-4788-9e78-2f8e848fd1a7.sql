-- Fix: Restrict profiles table email visibility
-- Replace existing policy with owner-only email visibility
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own complete profile (including email)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow viewing other users' public info (display_name, avatar_url) but NOT email
-- This is done via a security definer function instead

-- Create a secure user search function that doesn't expose emails
CREATE OR REPLACE FUNCTION public.search_users_safe(search_term text)
RETURNS TABLE(id uuid, display_name text, avatar_url text, is_online boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  five_minutes_ago timestamptz := now() - interval '5 minutes';
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    COALESCE(
      up.is_online AND up.last_seen_at > five_minutes_ago,
      false
    ) as is_online
  FROM profiles p
  LEFT JOIN user_presence up ON up.user_id = p.id
  WHERE 
    p.display_name ILIKE '%' || search_term || '%'
    AND p.id != auth.uid()  -- Don't return the searching user
  LIMIT 20;
END;
$$;

-- Create a function to get profile by ID for chat participants (safe version)
CREATE OR REPLACE FUNCTION public.get_profile_public_info(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE p.id = ANY(user_ids);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_users_safe(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_public_info(uuid[]) TO authenticated;