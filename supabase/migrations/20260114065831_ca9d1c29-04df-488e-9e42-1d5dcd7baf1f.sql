-- Fix 1: Remove overly permissive profiles policy
-- The 'Authenticated users only can view profiles' policy allows any logged-in user 
-- to view all profiles, which is redundant with the owner-scoped policy
DROP POLICY IF EXISTS "Authenticated users only can view profiles" ON public.profiles;

-- Fix 2: Restrict salesmen to only view customers they have served
-- First, drop the overly permissive salesmen view policy
DROP POLICY IF EXISTS "Salesmen can view customers" ON public.customers;

-- Create a new policy that restricts salesmen to customers they've served
-- A salesman can only see customers where they have at least one sale record
CREATE POLICY "Salesmen can view served customers"
ON public.customers
FOR SELECT
USING (
  has_role(auth.uid(), 'salesman'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.customer_id = customers.id 
    AND sales.salesman_id = auth.uid()
  )
);

-- Also need to update customer_discounts for consistency
-- Drop the overly permissive salesmen view policy for customer_discounts
DROP POLICY IF EXISTS "Salesmen can view customer discounts" ON public.customer_discounts;

-- Create restricted policy for customer_discounts - salesmen can only see discounts for customers they've served
CREATE POLICY "Salesmen can view served customer discounts"
ON public.customer_discounts
FOR SELECT
USING (
  has_role(auth.uid(), 'salesman'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM public.sales 
    WHERE sales.customer_id = customer_discounts.customer_id 
    AND sales.salesman_id = auth.uid()
  )
);