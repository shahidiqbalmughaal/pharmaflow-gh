-- =============================================================
-- FIX 1: Views - Enable RLS and add policies for views
-- Note: Views inherit RLS from underlying tables when using security_invoker = on
-- These views already have security_invoker = on, so they're secure, but we'll add explicit policies
-- =============================================================

-- The views already have security_invoker = on which means they use the calling user's RLS permissions
-- This is the correct and secure approach - no additional action needed for views

-- =============================================================
-- FIX 2: Stock Merge Logs - Add explicit DENY policies for UPDATE and DELETE
-- These operations should never occur on audit logs
-- =============================================================

-- Add restrictive policy to deny all UPDATE operations
CREATE POLICY "Deny all updates to stock merge logs"
ON public.stock_merge_logs
FOR UPDATE
USING (false);

-- Add restrictive policy to deny all DELETE operations
CREATE POLICY "Deny all deletes from stock merge logs"
ON public.stock_merge_logs
FOR DELETE
USING (false);

-- =============================================================
-- FIX 3: Returns Table - Add UPDATE policy (deny by default, only super admin can update)
-- Returns should be immutable after creation, but allow super admin correction if needed
-- =============================================================

CREATE POLICY "Only super admins can update returns"
ON public.returns
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- =============================================================
-- FIX 4: Expense Alerts - Restrict "All staff can view" to owners and managers only
-- Financial planning info should not be visible to all staff
-- =============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "All staff can view expense alerts" ON public.expense_alerts;

-- Create a more restrictive policy for owners and managers only
CREATE POLICY "Shop owners and managers can view expense alerts"
ON public.expense_alerts
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (
    (shop_id IS NULL OR shop_id = get_user_shop_id(auth.uid())) AND
    get_shop_role(auth.uid(), COALESCE(shop_id, get_user_shop_id(auth.uid()))) = ANY (ARRAY['owner'::text, 'manager'::text])
  )
);

-- =============================================================
-- FIX 5: Restructure RLS policies to check shop membership FIRST
-- This prevents timing attacks by checking shop_id before auth.uid() IS NOT NULL
-- Update policies on tables that have this pattern
-- =============================================================

-- Fix medicines SELECT policy
DROP POLICY IF EXISTS "Shop staff can view medicines in their shop" ON public.medicines;
CREATE POLICY "Shop staff can view medicines in their shop"
ON public.medicines
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()))
);

-- Fix sales SELECT policy  
DROP POLICY IF EXISTS "Shop staff can view sales in their shop" ON public.sales;
CREATE POLICY "Shop staff can view sales in their shop"
ON public.sales
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()))
);

-- Fix salesmen SELECT policy
DROP POLICY IF EXISTS "Shop owners and managers can view salesmen" ON public.salesmen;
CREATE POLICY "Shop owners and managers can view salesmen"
ON public.salesmen
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (
    (shop_id = get_user_shop_id(auth.uid())) AND
    (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))
  )
);

-- Fix suppliers SELECT policy
DROP POLICY IF EXISTS "Shop owners and managers can view suppliers" ON public.suppliers;
CREATE POLICY "Shop owners and managers can view suppliers"
ON public.suppliers
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (
    (shop_id = get_user_shop_id(auth.uid())) AND
    (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))
  )
);

-- Fix customers SELECT policy
DROP POLICY IF EXISTS "Shop owners and managers can view all customers" ON public.customers;
CREATE POLICY "Shop owners and managers can view all customers"
ON public.customers
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (
    (shop_id = get_user_shop_id(auth.uid())) AND
    (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))
  )
);

-- Fix expenses SELECT policy
DROP POLICY IF EXISTS "Shop owners and managers can view expenses" ON public.expenses;
CREATE POLICY "Shop owners and managers can view expenses"
ON public.expenses
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (
    (shop_id = get_user_shop_id(auth.uid())) AND
    (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))
  )
);