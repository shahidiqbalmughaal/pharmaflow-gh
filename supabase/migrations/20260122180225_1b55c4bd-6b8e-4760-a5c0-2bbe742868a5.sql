-- Fix error-level security issues: Customer and Supplier data exposure

-- 1. SUPPLIERS TABLE: Restrict access to owners/managers only (remove staff access)
-- Drop the existing permissive SELECT policy that allows all shop staff
DROP POLICY IF EXISTS "Shop staff can view suppliers in their shop" ON public.suppliers;

-- Create new restrictive SELECT policy for owners/managers only
CREATE POLICY "Shop owners and managers can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (
    shop_id = get_user_shop_id(auth.uid()) AND 
    get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
  )
);

-- 2. CUSTOMERS TABLE: Remove cashier access to customer personal data
-- Drop the existing cashier SELECT policy
DROP POLICY IF EXISTS "Cashiers can view served customers" ON public.customers;