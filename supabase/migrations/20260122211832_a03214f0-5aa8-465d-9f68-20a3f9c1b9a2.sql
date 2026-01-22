-- Create shop_settings table for configurable settings
CREATE TABLE public.shop_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  pharmacy_name TEXT NOT NULL DEFAULT 'Al-Rehman Pharmacy & Cosmetics',
  pharmacy_tagline TEXT NOT NULL DEFAULT 'Complete Healthcare Solutions',
  pharmacy_address TEXT NOT NULL DEFAULT 'Service Road, Muslim Town, Sadiqabad, Rawalpindi',
  pharmacy_contact TEXT NOT NULL DEFAULT '0334-5219838',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- Enable RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Shop staff can view their shop settings"
ON public.shop_settings
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  shop_id = get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can insert shop settings"
ON public.shop_settings
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  (shop_id = get_user_shop_id(auth.uid()) AND 
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update shop settings"
ON public.shop_settings
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR 
  (shop_id = get_user_shop_id(auth.uid()) AND 
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

-- Trigger for updated_at
CREATE TRIGGER update_shop_settings_updated_at
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();