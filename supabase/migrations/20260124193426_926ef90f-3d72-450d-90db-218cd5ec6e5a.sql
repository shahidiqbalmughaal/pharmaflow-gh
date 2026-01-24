-- Fix security definer views by recreating with security_invoker = on
-- This ensures RLS policies of the querying user apply, not the view creator

-- Drop existing views
DROP VIEW IF EXISTS public.sale_items_salesman_view;
DROP VIEW IF EXISTS public.sales_salesman_view;
DROP VIEW IF EXISTS public.salesmen_list;

-- Recreate sale_items_salesman_view with security_invoker
CREATE VIEW public.sale_items_salesman_view
WITH (security_invoker = on) AS
SELECT 
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
  created_at,
  shop_id
FROM public.sale_items;

-- Recreate sales_salesman_view with security_invoker
CREATE VIEW public.sales_salesman_view
WITH (security_invoker = on) AS
SELECT 
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
  created_at,
  shop_id
FROM public.sales;

-- Recreate salesmen_list with security_invoker
CREATE VIEW public.salesmen_list
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  assigned_counter,
  shop_id
FROM public.salesmen;

-- Add trigger to ensure access_logs.user_id always matches auth.uid()
CREATE OR REPLACE FUNCTION public.ensure_access_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Force user_id to be the authenticated user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create or replace trigger
DROP TRIGGER IF EXISTS enforce_access_log_user_id ON public.access_logs;
CREATE TRIGGER enforce_access_log_user_id
  BEFORE INSERT ON public.access_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_access_log_user_id();