
-- Revoke from PUBLIC (default grantee) on all SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_room_ids(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_unread_counts(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_online_user_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_users_for_chat(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_users_safe(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_public_info(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_contact_rate_limit(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_download_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_shared_note(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_files_by_share_token(text) FROM PUBLIC;

-- Grant authenticated role for functions used in app
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_room_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_for_chat(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_safe(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_public_info(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) TO authenticated;

-- Anonymous shared-notes/file features need to remain accessible to anon
GRANT EXECUTE ON FUNCTION public.update_shared_note(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_files_by_share_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO anon, authenticated;
