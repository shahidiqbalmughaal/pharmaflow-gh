-- Fix 1: Customer discounts - replace role-only policies with shop-scoped policies
DROP POLICY IF EXISTS "Admins and Managers can view customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Salesmen can view served customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins and Managers can insert customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins and Managers can update customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins can delete customer discounts" ON public.customer_discounts;

CREATE POLICY "Shop owners and managers can view customer discounts"
ON public.customer_discounts FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()) AND
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Cashiers can view served customer discounts"
ON public.customer_discounts FOR SELECT TO authenticated
USING (
  shop_id = get_user_shop_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.customer_id = customer_discounts.customer_id
    AND sales.shop_id = customer_discounts.shop_id
  )
);

CREATE POLICY "Shop owners and managers can insert customer discounts"
ON public.customer_discounts FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()) AND
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update customer discounts"
ON public.customer_discounts FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()) AND
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete customer discounts"
ON public.customer_discounts FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()) AND
   get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- Fix 2: Remove public read access from medicines and cosmetics
DROP POLICY IF EXISTS "Allow public read access to medicines" ON public.medicines;
DROP POLICY IF EXISTS "Allow public read access to cosmetics" ON public.cosmetics;