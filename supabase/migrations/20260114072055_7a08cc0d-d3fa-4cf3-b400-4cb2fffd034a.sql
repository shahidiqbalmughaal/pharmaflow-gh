-- Fix: Convert customers table from RESTRICTIVE to PERMISSIVE policies
-- This ensures proper authentication and role-based access control

-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins and Managers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and Managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and Managers can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Salesmen can view served customers" ON public.customers;

-- Ensure RLS is enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies with proper authentication
CREATE POLICY "Admins and Managers can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Salesmen can view served customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'salesman'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.customer_id = customers.id 
    AND sales.salesman_id = auth.uid()
  )
);

CREATE POLICY "Admins and Managers can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and Managers can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Also fix customer_discounts table
DROP POLICY IF EXISTS "Admins and Managers can insert customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins and Managers can update customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins and Managers can view customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Admins can delete customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Salesmen can view served customer discounts" ON public.customer_discounts;

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can view customer discounts"
ON public.customer_discounts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Salesmen can view served customer discounts"
ON public.customer_discounts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'salesman'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.customer_id = customer_discounts.customer_id 
    AND sales.salesman_id = auth.uid()
  )
);

CREATE POLICY "Admins and Managers can insert customer discounts"
ON public.customer_discounts
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and Managers can update customer discounts"
ON public.customer_discounts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete customer discounts"
ON public.customer_discounts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));