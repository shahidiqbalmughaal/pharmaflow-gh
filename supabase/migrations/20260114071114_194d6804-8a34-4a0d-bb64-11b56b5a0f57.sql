-- Fix: Convert salesmen table policies from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE policies alone don't grant access - they need PERMISSIVE policies to work with
-- Converting to PERMISSIVE policies ensures proper role-based access control

-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins and Managers can view salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can delete salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can insert salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can update salesmen" ON public.salesmen;

-- Ensure RLS is enabled
ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies (default type) that properly restrict access to authenticated users with roles
CREATE POLICY "Admins and Managers can view salesmen"
ON public.salesmen
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

-- Salesmen also need to view salesmen list (for sales dropdown)
CREATE POLICY "Salesmen can view salesmen"
ON public.salesmen
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'salesman'::app_role));

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