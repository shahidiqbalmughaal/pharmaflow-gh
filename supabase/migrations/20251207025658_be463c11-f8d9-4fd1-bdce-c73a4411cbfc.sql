-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "System can insert alert history" ON public.alert_history;

-- Create a new policy that restricts INSERT to admin users only
CREATE POLICY "Admins can insert alert history"
ON public.alert_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));