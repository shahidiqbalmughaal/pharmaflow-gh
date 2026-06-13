
-- ALERT HISTORY: shop-scope
DROP POLICY IF EXISTS "Authenticated admins can view alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Authenticated admins can insert alert history" ON public.alert_history;

CREATE POLICY "Shop admins can view alert history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

CREATE POLICY "Shop admins can insert alert history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

-- ALERT SETTINGS: shop-scope
DROP POLICY IF EXISTS "Admins can view alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can insert alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can update alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can delete alert settings" ON public.alert_settings;

CREATE POLICY "Shop admins can view alert settings"
ON public.alert_settings
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

CREATE POLICY "Shop admins can insert alert settings"
ON public.alert_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

CREATE POLICY "Shop admins can update alert settings"
ON public.alert_settings
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

CREATE POLICY "Shop admins can delete alert settings"
ON public.alert_settings
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND shop_id = public.get_user_shop_id(auth.uid())
  )
);

-- EXPENSE ALERTS: remove cross-shop manager policy (shop-scoped owner/manager policy remains)
DROP POLICY IF EXISTS "Managers can view expense alerts" ON public.expense_alerts;

-- SALESMEN: allow active staff to read salesmen of their shop (for sale dropdowns)
CREATE POLICY "Shop staff can view salesmen of their shop"
ON public.salesmen
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    shop_id = public.get_user_shop_id(auth.uid())
    AND public.user_belongs_to_shop(auth.uid(), shop_id)
  )
);
