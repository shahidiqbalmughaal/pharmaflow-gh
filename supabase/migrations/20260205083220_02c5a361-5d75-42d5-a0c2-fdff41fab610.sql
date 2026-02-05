-- Add explicit policy to deny anonymous/unauthenticated access to alert_settings
-- This ensures that even if authentication is somehow bypassed, anonymous users cannot access admin contact info

-- First, add a restrictive policy that explicitly requires authentication
CREATE POLICY "Require authentication for alert_settings"
ON public.alert_settings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);