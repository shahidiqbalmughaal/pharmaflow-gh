
-- Fix 1: Set security_invoker on views so underlying table RLS is enforced
ALTER VIEW public.sales_salesman_view SET (security_invoker = true);
ALTER VIEW public.sale_items_salesman_view SET (security_invoker = true);
ALTER VIEW public.salesmen_list SET (security_invoker = true);

-- Fix 2: Restrict cosmetic_categories SELECT to user's shop
DROP POLICY IF EXISTS "Authenticated users can view cosmetic categories" ON public.cosmetic_categories;
CREATE POLICY "Shop staff can view cosmetic categories" ON public.cosmetic_categories FOR SELECT TO authenticated USING (shop_id IS NULL OR shop_id = get_user_shop_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Fix 2b: Restrict cosmetic_subcategories SELECT to user's shop
DROP POLICY IF EXISTS "Authenticated users can view cosmetic subcategories" ON public.cosmetic_subcategories;
CREATE POLICY "Shop staff can view cosmetic subcategories" ON public.cosmetic_subcategories FOR SELECT TO authenticated USING (shop_id IS NULL OR shop_id = get_user_shop_id(auth.uid()) OR is_super_admin(auth.uid()));
