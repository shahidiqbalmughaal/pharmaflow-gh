-- Create a default shop for existing data
INSERT INTO public.shops (id, name, location, status, address, phone, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Al-Rehman Pharmacy',
  'Main Branch',
  'active',
  'Main Street',
  '0300-0000000',
  'info@alrehmanpharmacy.com'
) ON CONFLICT (id) DO NOTHING;

-- Migrate existing data to the default shop
UPDATE public.medicines SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.cosmetics SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.sales SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.sale_items SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.salesmen SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.customers SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.customer_discounts SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.suppliers SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.expenses SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.expense_alerts SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.returns SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.purchase_orders SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.purchase_order_items SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.alert_settings SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.alert_history SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;

-- Update profiles to set default current_shop_id
UPDATE public.profiles SET current_shop_id = '00000000-0000-0000-0000-000000000001' WHERE current_shop_id IS NULL;

-- Add existing admin users as shop owners for the default shop
INSERT INTO public.shop_staff (user_id, shop_id, role, is_active)
SELECT ur.user_id, '00000000-0000-0000-0000-000000000001', 'owner', true
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;

-- Add managers and salesmen as shop staff
INSERT INTO public.shop_staff (user_id, shop_id, role, is_active)
SELECT ur.user_id, '00000000-0000-0000-0000-000000000001', 
  CASE WHEN ur.role = 'manager' THEN 'manager' ELSE 'cashier' END, 
  true
FROM public.user_roles ur
WHERE ur.role IN ('manager', 'salesman')
ON CONFLICT DO NOTHING;

-- Create function to get user's accessible shops
CREATE OR REPLACE FUNCTION public.get_user_shops(p_user_id uuid)
RETURNS TABLE(shop_id uuid, shop_name text, shop_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins can access all shops
  IF public.is_super_admin(p_user_id) THEN
    RETURN QUERY
    SELECT s.id, s.name, 'super_admin'::text
    FROM public.shops s
    WHERE s.status = 'active'
    ORDER BY s.name;
  ELSE
    -- Regular users can only access shops they're staff of
    RETURN QUERY
    SELECT s.id, s.name, ss.role
    FROM public.shops s
    INNER JOIN public.shop_staff ss ON s.id = ss.shop_id
    WHERE ss.user_id = p_user_id
      AND ss.is_active = true
      AND s.status = 'active'
    ORDER BY s.name;
  END IF;
END;
$$;

-- Create function to switch user's current shop
CREATE OR REPLACE FUNCTION public.switch_shop(p_user_id uuid, p_shop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to the shop
  IF public.is_super_admin(p_user_id) OR public.has_shop_access(p_shop_id, p_user_id) THEN
    UPDATE public.profiles
    SET current_shop_id = p_shop_id, updated_at = now()
    WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;