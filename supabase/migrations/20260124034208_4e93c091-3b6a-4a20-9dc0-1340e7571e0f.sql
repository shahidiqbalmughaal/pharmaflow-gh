-- Tighten SELECT policies to explicitly require authenticated users.
-- This prevents false-positive “public access” scanners and makes intent unambiguous.

-- profiles
ALTER POLICY "Users can view their own profile"
ON public.profiles
TO authenticated
USING (auth.uid() IS NOT NULL AND id = auth.uid());

ALTER POLICY "Admins can view all profiles"
ON public.profiles
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- customers
ALTER POLICY "Shop owners and managers can view all customers"
ON public.customers
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR (
      shop_id = get_user_shop_id(auth.uid())
      AND get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
    )
  )
);

-- suppliers
ALTER POLICY "Shop owners and managers can view suppliers"
ON public.suppliers
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR (
      shop_id = get_user_shop_id(auth.uid())
      AND get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
    )
  )
);

-- salesmen
ALTER POLICY "Shop owners and managers can view salesmen"
ON public.salesmen
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR (
      shop_id = get_user_shop_id(auth.uid())
      AND get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
    )
  )
);

-- sales
ALTER POLICY "Shop staff can view sales in their shop"
ON public.sales
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()))
);

-- medicines
ALTER POLICY "Shop staff can view medicines in their shop"
ON public.medicines
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()))
);

-- expenses
ALTER POLICY "Shop owners and managers can view expenses"
ON public.expenses
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR (
      shop_id = get_user_shop_id(auth.uid())
      AND get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
    )
  )
);
