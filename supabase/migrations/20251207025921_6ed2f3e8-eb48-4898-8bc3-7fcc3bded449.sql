-- Fix 1: Add policy to deny anonymous access to profiles
CREATE POLICY "Authenticated users only can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict sales INSERT to authorized roles only
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
CREATE POLICY "Authorized users can create sales"
ON public.sales FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'salesman'::app_role)
);

-- Fix 3: Restrict sale_items INSERT to authorized roles only
DROP POLICY IF EXISTS "Authenticated users can create sale_items" ON public.sale_items;
CREATE POLICY "Authorized users can create sale_items"
ON public.sale_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'salesman'::app_role)
);