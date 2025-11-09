-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create alert_settings table
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  expiry_warning_days INTEGER NOT NULL DEFAULT 30,
  admin_emails TEXT[] NOT NULL DEFAULT '{}',
  admin_whatsapp_numbers TEXT[] NOT NULL DEFAULT '{}',
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  check_frequency_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view alert settings
CREATE POLICY "Admins can view alert settings"
ON public.alert_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert alert settings
CREATE POLICY "Admins can insert alert settings"
ON public.alert_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update alert settings
CREATE POLICY "Admins can update alert settings"
ON public.alert_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete alert settings
CREATE POLICY "Admins can delete alert settings"
ON public.alert_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alert_settings_updated_at
BEFORE UPDATE ON public.alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create alert_history table to track sent alerts
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'low_stock' or 'near_expiry'
  item_type TEXT NOT NULL, -- 'medicine' or 'cosmetic'
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  batch_no TEXT,
  current_quantity INTEGER,
  expiry_date DATE,
  notification_method TEXT NOT NULL, -- 'email' or 'whatsapp'
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view alert history
CREATE POLICY "Admins can view alert history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert alert history (for edge function)
CREATE POLICY "System can insert alert history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (true);