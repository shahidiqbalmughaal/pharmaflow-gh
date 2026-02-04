-- Fix alert_history RLS: Add explicit authentication requirement
-- Drop existing policies and recreate with proper auth checks

DROP POLICY IF EXISTS "Admins can view alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Admins can insert alert history" ON public.alert_history;

-- Recreate with explicit authentication check (auth.uid() IS NOT NULL)
CREATE POLICY "Authenticated admins can view alert history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated admins can insert alert history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));