-- Fix remaining tables with RESTRICTIVE policies that need to be PERMISSIVE

-- ============ PROFILES TABLE ============
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============ SUPPLIERS TABLE ============
DROP POLICY IF EXISTS "Admins and Managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and Managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and Managers can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Salesmen can view suppliers" ON public.suppliers;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Salesmen should only see supplier name/company for sales purposes, not contact info
-- But since we can't do column-level RLS, restrict salesmen from viewing suppliers entirely
-- They can still see supplier name on products
CREATE POLICY "Admins and Managers can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and Managers can insert suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and Managers can update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ ALERT HISTORY TABLE ============
DROP POLICY IF EXISTS "Admins can insert alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Admins can view alert history" ON public.alert_history;

ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alert history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert alert history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));