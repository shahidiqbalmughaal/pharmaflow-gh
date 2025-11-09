-- Add authentication and authorization checks to inventory decrement functions

-- Update decrement_medicine_quantity function with security checks
CREATE OR REPLACE FUNCTION public.decrement_medicine_quantity(medicine_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Perform the decrement
  UPDATE public.medicines
  SET quantity = quantity - qty
  WHERE id = medicine_id;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medicine not found';
  END IF;
END;
$function$;

-- Update decrement_cosmetic_quantity function with security checks
CREATE OR REPLACE FUNCTION public.decrement_cosmetic_quantity(cosmetic_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Perform the decrement
  UPDATE public.cosmetics
  SET quantity = quantity - qty
  WHERE id = cosmetic_id;
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cosmetic not found';
  END IF;
END;
$function$;