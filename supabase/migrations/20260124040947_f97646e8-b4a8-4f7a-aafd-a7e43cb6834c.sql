-- Update is_super_admin to return true ONLY for Shahid Iqbal's user id
-- This ensures no other admin ever appears as Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super Admin is restricted to ONLY user "Shahid Iqbal" (id: 42b31e59-7dd6-486b-98bd-11f3aca13fcc)
  -- This cannot be bypassed by changing profile name
  SELECT _user_id = '42b31e59-7dd6-486b-98bd-11f3aca13fcc'::uuid
$$;

-- Update get_user_shops to return actual shop role for admins (not 'super_admin')
-- Only Shahid (true super admin) gets 'super_admin' label
CREATE OR REPLACE FUNCTION public.get_user_shops(p_user_id uuid)
RETURNS TABLE(shop_id uuid, shop_name text, shop_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- True Super Admin (Shahid only) can access all shops with 'super_admin' role
  IF public.is_super_admin(p_user_id) THEN
    RETURN QUERY
    SELECT s.id, s.name, 'super_admin'::text
    FROM public.shops s
    WHERE s.status = 'active'
    ORDER BY s.name;
  ELSE
    -- Regular users (including other admins) see only shops they're staff of
    RETURN QUERY
    SELECT s.id, s.name, ss.role
    FROM public.shops s
    INNER JOIN public.shop_staff ss ON s.id = ss.shop_id
    WHERE ss.user_id = p_user_id
      AND ss.is_active = true
      AND s.status = 'active'
    ORDER BY s.name;
  END IF;
END;
$$;

-- Allow all authenticated users to view expense_alerts (read-only)
-- This enables the Expense Alerts card to show for everyone
DROP POLICY IF EXISTS "All staff can view expense alerts" ON public.expense_alerts;
CREATE POLICY "All staff can view expense alerts"
ON public.expense_alerts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (shop_id IS NULL OR shop_id = get_user_shop_id(auth.uid()) OR is_super_admin(auth.uid()))
);