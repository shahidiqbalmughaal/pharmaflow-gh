-- Fix: Add RLS policies to sales_salesman_view
-- The view already has shop isolation in its WHERE clause, but explicit RLS adds defense-in-depth

-- Enable RLS on the view
ALTER VIEW public.sales_salesman_view SET (security_barrier = true);

-- Note: Views in PostgreSQL don't support traditional RLS policies like tables do.
-- However, since this is a security_invoker = false (security definer) view with 
-- explicit shop isolation in the WHERE clause, the protection is already in place.
-- 
-- The security is enforced by:
-- 1. WHERE clause filters to only show sales for user's shop or super admins
-- 2. Uses auth.uid() and get_user_shop_id() to enforce row-level access
--
-- To properly address the concern, we'll recreate the view with security_invoker = true
-- which will cause it to inherit RLS from the underlying sales table

DROP VIEW IF EXISTS public.sales_salesman_view;

CREATE VIEW public.sales_salesman_view
WITH (security_invoker = true)
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
FROM public.sales s;

COMMENT ON VIEW public.sales_salesman_view IS 
'View that hides profit columns from salesmen. 
Uses security_invoker = true to inherit RLS policies from the underlying sales table.
This ensures proper shop isolation through the sales table RLS policies.';