
-- 1) RLS policy for contact_rate_limits (deny all client access; only service role / SECURITY DEFINER fns use it)
CREATE POLICY "No client access to rate limits"
ON public.contact_rate_limits
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2) Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_room_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_counts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_online_user_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users_for_chat(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users_safe(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_public_info(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_contact_rate_limit(text) FROM anon, authenticated;

-- Re-grant admin functions to authenticated (the functions check is_admin() internally)
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) TO authenticated;
