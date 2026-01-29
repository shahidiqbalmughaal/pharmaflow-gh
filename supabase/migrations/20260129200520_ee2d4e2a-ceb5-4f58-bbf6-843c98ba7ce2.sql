-- Security Fix 1: Simplify profiles update policy using helper functions
-- This reduces complexity while maintaining the same security logic
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND (
    -- Allow if shop_id is not changing
    current_shop_id IS NOT DISTINCT FROM get_user_shop_id(auth.uid())
    -- OR if new shop_id is one the user belongs to
    OR user_belongs_to_shop(auth.uid(), current_shop_id)
  )
);

-- Security Fix 2: Fix misleading manager customer policy
-- ISSUE: The "served customers" policy used EXISTS on sales, but sales.salesman_id 
-- links to salesmen table (POS identity), NOT to auth.users. This meant the filter
-- was ineffective - managers could see ALL customers with any sale, not just their own.
-- 
-- FIX: Since we cannot properly filter by authenticated user (would require schema change),
-- we consolidate to a clear shop-scoped policy. Managers get same access as owners within shop.
-- This is honest about access levels and matches business requirements.

DROP POLICY IF EXISTS "Managers can view customers they have served" ON public.customers;
DROP POLICY IF EXISTS "Shop owners can view all customers" ON public.customers;

-- Single clear policy for customer viewing
CREATE POLICY "Shop owners and managers can view shop customers"
ON public.customers
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  (
    shop_id = get_user_shop_id(auth.uid()) AND 
    get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager')
  )
);