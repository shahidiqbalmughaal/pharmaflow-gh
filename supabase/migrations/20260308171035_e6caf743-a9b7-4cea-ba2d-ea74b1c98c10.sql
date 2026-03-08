
-- Fix 1: Tighten profiles INSERT policy to prevent arbitrary shop_id assignment
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid() 
  AND (current_shop_id IS NULL OR user_belongs_to_shop(auth.uid(), current_shop_id))
);

-- Fix 2: Enable RLS on views and add shop-scoped policies
-- For sales_salesman_view
ALTER VIEW public.sales_salesman_view SET (security_invoker = on);

-- For sale_items_salesman_view  
ALTER VIEW public.sale_items_salesman_view SET (security_invoker = on);

-- For salesmen_list
ALTER VIEW public.salesmen_list SET (security_invoker = on);
