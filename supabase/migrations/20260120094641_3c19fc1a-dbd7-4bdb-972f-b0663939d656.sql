-- Fix 1: Strengthen profiles table shop isolation
-- Make current_shop_id only updatable through the switch_shop() function
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more restrictive profile update policy that prevents direct current_shop_id changes
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- Prevent direct current_shop_id changes - must use switch_shop() function
  (
    current_shop_id IS NOT DISTINCT FROM (SELECT current_shop_id FROM public.profiles WHERE id = auth.uid())
    OR
    user_belongs_to_shop(auth.uid(), current_shop_id)
  )
);

-- Fix 2: Secure returns table with proper shop isolation and role checks
DROP POLICY IF EXISTS "Authenticated users can insert returns" ON public.returns;
DROP POLICY IF EXISTS "Authenticated users can view returns" ON public.returns;

-- Only owners and managers can insert returns for their shop
CREATE POLICY "Shop owners and managers can insert returns"
ON public.returns FOR INSERT
TO authenticated
WITH CHECK (
  shop_id = get_user_shop_id(auth.uid()) AND
  get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')
);

-- Shop staff can view returns in their shop only
CREATE POLICY "Shop staff can view returns"
ON public.returns FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  shop_id = get_user_shop_id(auth.uid())
);

-- Fix 3: Restrict customer data access to appropriate roles
-- Cashiers should not have access to customer contact details
DROP POLICY IF EXISTS "Shop staff can view customers in their shop" ON public.customers;

-- Owners and managers can view all customer data in their shop
CREATE POLICY "Shop owners and managers can view all customers"
ON public.customers FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  (
    shop_id = get_user_shop_id(auth.uid()) AND
    get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')
  )
);

-- Cashiers can only view customers they've served (through sales)
CREATE POLICY "Cashiers can view served customers"
ON public.customers FOR SELECT
TO authenticated
USING (
  get_shop_role(auth.uid(), get_user_shop_id(auth.uid())) = 'cashier' AND
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.customer_id = customers.id 
    AND sales.salesman_id = auth.uid()
  )
);