-- Fix alert_settings table: Convert RESTRICTIVE to PERMISSIVE policies
-- This ensures proper authentication is required

DROP POLICY IF EXISTS "Admins can delete alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can insert alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can update alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can view alert settings" ON public.alert_settings;

-- Ensure RLS is enabled
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies for alert_settings (admin only)
CREATE POLICY "Admins can view alert settings"
ON public.alert_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert alert settings"
ON public.alert_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alert settings"
ON public.alert_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alert settings"
ON public.alert_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix sales table: Convert RESTRICTIVE to PERMISSIVE policies
DROP POLICY IF EXISTS "Admins and Managers can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authorized users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Salesmen can view own sales" ON public.sales;

-- Ensure RLS is enabled
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies for sales
CREATE POLICY "Admins and Managers can view all sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Salesmen can view own sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'salesman'::app_role) AND 
  salesman_id = auth.uid()
);

CREATE POLICY "Authorized users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'salesman'::app_role)
);

CREATE POLICY "Admins can update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));