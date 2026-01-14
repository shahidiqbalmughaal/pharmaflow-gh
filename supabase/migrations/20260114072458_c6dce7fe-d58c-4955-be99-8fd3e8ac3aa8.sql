-- Fix: Hide profit data from salesmen by creating a secure view
-- Salesmen will use this view instead of the full sales table

-- Create a view for salesmen that excludes profit columns
CREATE OR REPLACE VIEW public.sales_salesman_view
WITH (security_invoker = false)
AS SELECT 
  id,
  salesman_id,
  salesman_name,
  customer_id,
  customer_name,
  subtotal,
  discount,
  discount_percentage,
  tax,
  total_amount,
  loyalty_points_earned,
  loyalty_points_redeemed,
  sale_date,
  created_at
  -- Excludes: total_profit
FROM public.sales;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.sales_salesman_view TO authenticated;

-- Also create a view for sale_items that excludes profit
CREATE OR REPLACE VIEW public.sale_items_salesman_view
WITH (security_invoker = false)
AS SELECT 
  id,
  sale_id,
  item_type,
  item_id,
  item_name,
  batch_no,
  quantity,
  unit_price,
  total_price,
  tablets_per_packet,
  total_tablets,
  total_packets,
  created_at
  -- Excludes: profit
FROM public.sale_items;

GRANT SELECT ON public.sale_items_salesman_view TO authenticated;