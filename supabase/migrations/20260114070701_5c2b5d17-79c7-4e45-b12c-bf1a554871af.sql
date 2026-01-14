-- Fix: Update sales INSERT policy to require proper role validation
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Authorized users can create sales" ON public.sales;

CREATE POLICY "Authorized users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'salesman'::app_role)
);

-- Fix: Update sale_items INSERT policy to require proper role validation  
DROP POLICY IF EXISTS "Authenticated users can create sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authorized users can create sale_items" ON public.sale_items;

CREATE POLICY "Authorized users can create sale_items"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'salesman'::app_role)
);