-- Create api_settings table to store API configuration securely
CREATE TABLE IF NOT EXISTS public.api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view API settings
CREATE POLICY "Admins can view API settings"
ON public.api_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert API settings
CREATE POLICY "Admins can insert API settings"
ON public.api_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update API settings
CREATE POLICY "Admins can update API settings"
ON public.api_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete API settings
CREATE POLICY "Admins can delete API settings"
ON public.api_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_settings_updated_at
BEFORE UPDATE ON public.api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();