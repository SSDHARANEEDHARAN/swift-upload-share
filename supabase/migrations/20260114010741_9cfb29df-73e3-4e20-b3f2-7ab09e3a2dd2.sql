-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.is_admin());

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, old_value, new_value, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_old_value, p_new_value, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update set_user_role to include audit logging
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role app_role)
RETURNS BOOLEAN AS $$
DECLARE
  old_role app_role;
BEGIN
  -- Only admins can call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify user roles';
  END IF;
  
  -- Get current role
  SELECT role INTO old_role FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Upsert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = new_role;
  
  -- Log the action
  PERFORM public.log_admin_action(
    'role_change',
    'user',
    target_user_id,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role),
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update remove_user_role to include audit logging
CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  old_role app_role;
BEGIN
  -- Only admins can call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify user roles';
  END IF;
  
  -- Cannot remove your own admin role
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove your own admin role';
  END IF;
  
  -- Get current role before deletion
  SELECT role INTO old_role FROM public.user_roles WHERE user_id = target_user_id;
  
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    'role_removed',
    'user',
    target_user_id,
    jsonb_build_object('role', old_role),
    NULL,
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get audit logs (admin only)
CREATE OR REPLACE FUNCTION public.get_audit_logs(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  actor_id UUID,
  actor_email TEXT,
  actor_name TEXT,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  target_email TEXT,
  target_name TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB
) AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can view audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.created_at,
    al.actor_id,
    actor_profile.email AS actor_email,
    actor_profile.display_name AS actor_name,
    al.action,
    al.target_type,
    al.target_id,
    target_profile.email AS target_email,
    target_profile.display_name AS target_name,
    al.old_value,
    al.new_value,
    al.metadata
  FROM public.audit_logs al
  LEFT JOIN public.profiles actor_profile ON al.actor_id = actor_profile.id
  LEFT JOIN public.profiles target_profile ON al.target_id = target_profile.id
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;