-- Fix: Restrict salesmen table access to protect sensitive CNIC/contact data

-- Drop the existing policy that allows salesmen to view all salesmen data
DROP POLICY IF EXISTS "Salesmen can view salesmen" ON public.salesmen;

-- Drop the old RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins and Managers can view salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can delete salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can insert salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can update salesmen" ON public.salesmen;

-- Ensure RLS is enabled
ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies - admin/manager only for full table access
CREATE POLICY "Admins and Managers can view salesmen"
ON public.salesmen
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can insert salesmen"
ON public.salesmen
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update salesmen"
ON public.salesmen
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete salesmen"
ON public.salesmen
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create a secure view for salesmen that only exposes non-sensitive data
-- This allows salesmen to see the dropdown list without exposing CNIC/contact
CREATE OR REPLACE VIEW public.salesmen_list
WITH (security_invoker = false)
AS SELECT 
  id,
  name,
  assigned_counter
FROM public.salesmen;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.salesmen_list TO authenticated;

-- Allow salesmen to query the view (which bypasses base table RLS since security_invoker=false)
-- The view owner (postgres) has access to the base table