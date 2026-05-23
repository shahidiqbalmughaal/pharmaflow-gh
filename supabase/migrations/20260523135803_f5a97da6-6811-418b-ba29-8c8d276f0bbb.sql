
-- 1) Tighten user_roles policies: only Super Admin can mutate roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

-- 2) Missing UPDATE policy on narcotics-reports storage bucket
CREATE POLICY "Shop owners and managers can update narcotics reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'narcotics-reports'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = (public.get_user_shop_id(auth.uid()))::text
      AND public.get_shop_role(auth.uid(), public.get_user_shop_id(auth.uid())) = ANY (ARRAY['owner','manager'])
    )
  )
)
WITH CHECK (
  bucket_id = 'narcotics-reports'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = (public.get_user_shop_id(auth.uid()))::text
      AND public.get_shop_role(auth.uid(), public.get_user_shop_id(auth.uid())) = ANY (ARRAY['owner','manager'])
    )
  )
);

-- 3) Lock down SECURITY DEFINER functions: revoke from anon entirely,
--    and revoke from authenticated for purely internal helpers/triggers.
--    Helpers used only inside RLS / other definer functions:
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_shop_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_shop_role(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_shop_access(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_shop(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.users_share_shop(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_access_anomalies(uuid, integer) FROM anon, authenticated, public;

-- Trigger-only functions:
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_last_login() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_access_log_user_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_customer_access_alert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM anon, authenticated, public;

-- RPCs the app calls -> revoke from anon only, keep for authenticated:
REVOKE EXECUTE ON FUNCTION public.decrement_medicine_quantity(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decrement_cosmetic_quantity(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.switch_shop(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_shops(uuid) FROM anon, public;

-- 4) Realtime Authorization: restrict channel subscriptions to the user's shop
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to their shop channels" ON realtime.messages;

CREATE POLICY "Authenticated users can subscribe to their shop channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin((SELECT auth.uid()))
  OR realtime.topic() LIKE '%' || (public.get_user_shop_id((SELECT auth.uid())))::text || '%'
);
