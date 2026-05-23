
-- Helpers invoked inside RLS policies must be EXECUTE-able by the calling role.
-- Restore EXECUTE for authenticated; keep anon revoked.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_shop_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_shop_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_shop(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_share_shop(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_access_anomalies(uuid, integer) TO authenticated;
