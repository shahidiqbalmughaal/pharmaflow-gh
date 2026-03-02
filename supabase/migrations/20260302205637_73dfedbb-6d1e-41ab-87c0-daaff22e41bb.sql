
-- Fix purchase_orders RLS: drop old role-only policies, add shop-scoped ones
DROP POLICY IF EXISTS "Admins and Managers can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins and Managers can insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins and Managers can update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can delete purchase orders" ON public.purchase_orders;

CREATE POLICY "Shop staff can view purchase orders in their shop"
ON public.purchase_orders FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop owners and managers can insert purchase orders"
ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')));

CREATE POLICY "Shop owners and managers can update purchase orders"
ON public.purchase_orders FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')));

CREATE POLICY "Shop owners can delete purchase orders"
ON public.purchase_orders FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) = 'owner'));

-- Fix purchase_order_items RLS: same pattern
DROP POLICY IF EXISTS "Admins and Managers can view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins and Managers can insert purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins and Managers can update purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins can delete purchase order items" ON public.purchase_order_items;

CREATE POLICY "Shop staff can view purchase order items in their shop"
ON public.purchase_order_items FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop owners and managers can insert purchase order items"
ON public.purchase_order_items FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')));

CREATE POLICY "Shop owners and managers can update purchase order items"
ON public.purchase_order_items FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')));

CREATE POLICY "Shop owners can delete purchase order items"
ON public.purchase_order_items FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) = 'owner'));
