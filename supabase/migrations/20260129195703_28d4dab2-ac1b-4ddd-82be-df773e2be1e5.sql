-- Security Fix: Scope admin profile access to their shops only
-- Fix 1: Create a function to check if users share a shop
CREATE OR REPLACE FUNCTION public.users_share_shop(viewing_user_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shop_staff ss1
    INNER JOIN public.shop_staff ss2 ON ss1.shop_id = ss2.shop_id
    WHERE ss1.user_id = viewing_user_id
      AND ss2.user_id = target_user_id
      AND ss1.is_active = true
      AND ss2.is_active = true
  )
$$;

-- Fix 2: Drop the overly permissive admin profile policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Fix 3: Create shop-scoped admin policy
-- Super admin can see all, regular admins only see users in their shops
CREATE POLICY "Admins can view profiles in their shops"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (
    is_super_admin(auth.uid()) OR
    public.users_share_shop(auth.uid(), id)
  )
);

-- Fix 4: For customers table - restrict managers to less sensitive access
-- Drop existing policy
DROP POLICY IF EXISTS "Shop owners and managers can view all customers" ON public.customers;

-- Create owner-only full access policy
CREATE POLICY "Shop owners can view all customers"
ON public.customers
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  (
    shop_id = get_user_shop_id(auth.uid()) AND 
    get_shop_role(auth.uid(), shop_id) = 'owner'
  )
);

-- Create restricted manager access - only customers they've served
CREATE POLICY "Managers can view customers they have served"
ON public.customers
FOR SELECT
USING (
  shop_id = get_user_shop_id(auth.uid()) AND 
  get_shop_role(auth.uid(), shop_id) = 'manager' AND
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.customer_id = customers.id
    AND s.shop_id = customers.shop_id
  )
);