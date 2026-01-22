-- Fix: Restrict salesmen table access to owners/managers only
-- Cashiers/salesmen will still use salesmen_list view for dropdowns (shows only id, name, assigned_counter)

-- Drop the existing permissive policy that allows all shop staff
DROP POLICY IF EXISTS "Shop staff can view salesmen in their shop" ON public.salesmen;

-- Create restrictive policy for owners/managers only
CREATE POLICY "Shop owners and managers can view salesmen" 
ON public.salesmen 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (
    shop_id = get_user_shop_id(auth.uid()) AND 
    get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])
  )
);