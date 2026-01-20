-- Fix 1: Add shop isolation to security definer views
-- These views intentionally hide sensitive data (profit, CNIC) from salesmen
-- but now we also add shop isolation for multi-tenant security

-- Drop existing views
DROP VIEW IF EXISTS public.salesmen_list;
DROP VIEW IF EXISTS public.sales_salesman_view;
DROP VIEW IF EXISTS public.sale_items_salesman_view;

-- Recreate salesmen_list with shop isolation
-- This view is used in dropdowns and hides sensitive CNIC/contact info
CREATE OR REPLACE VIEW public.salesmen_list
WITH (security_invoker = false)
AS 
SELECT 
  s.id,
  s.name,
  s.assigned_counter,
  s.shop_id
FROM public.salesmen s
WHERE 
  -- Super admins can see all
  is_super_admin(auth.uid())
  OR 
  -- Regular users can only see salesmen in their shop
  s.shop_id = get_user_shop_id(auth.uid());

-- Add comment for documentation
COMMENT ON VIEW public.salesmen_list IS 
'Security definer view that exposes only non-sensitive salesman data (id, name, counter) for UI dropdowns. 
Intentionally hides CNIC and contact information. Enforces shop isolation.';

-- Recreate sales_salesman_view with shop isolation
-- This view hides profit data from salesmen
CREATE OR REPLACE VIEW public.sales_salesman_view
WITH (security_invoker = false)
AS 
SELECT 
  s.id,
  s.salesman_id,
  s.salesman_name,
  s.customer_id,
  s.customer_name,
  s.subtotal,
  s.discount,
  s.discount_percentage,
  s.tax,
  s.total_amount,
  s.loyalty_points_earned,
  s.loyalty_points_redeemed,
  s.sale_date,
  s.created_at,
  s.shop_id
FROM public.sales s
WHERE 
  -- Super admins can see all
  is_super_admin(auth.uid())
  OR 
  -- Regular users can only see sales in their shop
  s.shop_id = get_user_shop_id(auth.uid());

COMMENT ON VIEW public.sales_salesman_view IS 
'Security definer view that hides profit columns from salesmen. 
Exposes only non-sensitive sales data. Enforces shop isolation.';

-- Recreate sale_items_salesman_view with shop isolation
-- This view hides profit data from salesmen
CREATE OR REPLACE VIEW public.sale_items_salesman_view
WITH (security_invoker = false)
AS 
SELECT 
  si.id,
  si.sale_id,
  si.item_type,
  si.item_id,
  si.item_name,
  si.batch_no,
  si.quantity,
  si.unit_price,
  si.total_price,
  si.tablets_per_packet,
  si.total_tablets,
  si.total_packets,
  si.created_at,
  si.shop_id
FROM public.sale_items si
WHERE 
  -- Super admins can see all
  is_super_admin(auth.uid())
  OR 
  -- Regular users can only see sale items in their shop
  si.shop_id = get_user_shop_id(auth.uid());

COMMENT ON VIEW public.sale_items_salesman_view IS 
'Security definer view that hides profit column from salesmen.
Exposes only non-sensitive sale item data. Enforces shop isolation.';

-- Grant access to authenticated users
GRANT SELECT ON public.salesmen_list TO authenticated;
GRANT SELECT ON public.sales_salesman_view TO authenticated;
GRANT SELECT ON public.sale_items_salesman_view TO authenticated;