
CREATE TABLE public.contact_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_contact_rate_limits_email_created ON public.contact_rate_limits (email, created_at);

-- Enable RLS but deny all direct access (only edge function uses it via service role)
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old entries (older than 1 day)
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Clean up old entries
  DELETE FROM contact_rate_limits WHERE created_at < now() - interval '1 hour';
  
  -- Count recent submissions from this email (last hour)
  SELECT COUNT(*) INTO recent_count
  FROM contact_rate_limits
  WHERE email = lower(p_email) AND created_at > now() - interval '1 hour';
  
  -- Allow max 3 per hour
  IF recent_count >= 3 THEN
    RETURN false;
  END IF;
  
  -- Record this submission
  INSERT INTO contact_rate_limits (email) VALUES (lower(p_email));
  RETURN true;
END;
$$;
