-- Fix decrement_medicine_quantity: Add shop isolation check
CREATE OR REPLACE FUNCTION public.decrement_medicine_quantity(medicine_id uuid, qty integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item_shop_id uuid;
  user_shop_id uuid;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user has permission (admin, manager, or salesman)
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'salesman'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Get medicine's shop_id
  SELECT shop_id INTO item_shop_id FROM public.medicines WHERE id = medicine_id;
  
  IF item_shop_id IS NULL THEN
    RAISE EXCEPTION 'Medicine not found';
  END IF;
  
  -- Get user's current shop
  user_shop_id := public.get_user_shop_id(auth.uid());
  
  -- Verify shop ownership (allow super admins to bypass)
  IF NOT (public.is_super_admin(auth.uid()) OR item_shop_id = user_shop_id) THEN
    RAISE EXCEPTION 'Cannot modify inventory from another shop';
  END IF;
  
  -- Perform the decrement with shop_id verification
  UPDATE public.medicines
  SET quantity = quantity - qty
  WHERE id = medicine_id AND shop_id = item_shop_id;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update medicine quantity';
  END IF;
END;
$function$;

-- Fix decrement_cosmetic_quantity: Add shop isolation check
CREATE OR REPLACE FUNCTION public.decrement_cosmetic_quantity(cosmetic_id uuid, qty integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item_shop_id uuid;
  user_shop_id uuid;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user has permission (admin, manager, or salesman)
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'salesman'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Get cosmetic's shop_id
  SELECT shop_id INTO item_shop_id FROM public.cosmetics WHERE id = cosmetic_id;
  
  IF item_shop_id IS NULL THEN
    RAISE EXCEPTION 'Cosmetic not found';
  END IF;
  
  -- Get user's current shop
  user_shop_id := public.get_user_shop_id(auth.uid());
  
  -- Verify shop ownership (allow super admins to bypass)
  IF NOT (public.is_super_admin(auth.uid()) OR item_shop_id = user_shop_id) THEN
    RAISE EXCEPTION 'Cannot modify inventory from another shop';
  END IF;
  
  -- Perform the decrement with shop_id verification
  UPDATE public.cosmetics
  SET quantity = quantity - qty
  WHERE id = cosmetic_id AND shop_id = item_shop_id;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update cosmetic quantity';
  END IF;
END;
$function$;