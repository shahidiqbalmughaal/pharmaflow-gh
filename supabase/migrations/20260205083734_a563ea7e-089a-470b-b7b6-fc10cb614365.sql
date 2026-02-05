-- Fix validate_medicine_data function to handle NULL expiry_date
-- This was causing save errors for medicine categories where expiry is optional (bandages, syringes, etc.)

CREATE OR REPLACE FUNCTION public.validate_medicine_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate prices are positive
  IF NEW.purchase_price <= 0 THEN
    RAISE EXCEPTION 'Purchase price must be positive';
  END IF;
  
  IF NEW.selling_price <= 0 THEN
    RAISE EXCEPTION 'Selling price must be positive';
  END IF;
  
  -- Validate quantity is non-negative
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;
  
  -- Validate string lengths
  IF LENGTH(NEW.medicine_name) > 500 THEN
    RAISE EXCEPTION 'Medicine name too long (max 500 characters)';
  END IF;
  
  IF LENGTH(NEW.batch_no) > 100 THEN
    RAISE EXCEPTION 'Batch number too long (max 100 characters)';
  END IF;
  
  -- Validate dates ONLY if expiry_date is provided (not NULL)
  -- This allows items with optional expiry dates (bandages, syringes, etc.)
  IF NEW.expiry_date IS NOT NULL AND NEW.manufacturing_date > NEW.expiry_date THEN
    RAISE EXCEPTION 'Manufacturing date must be before expiry date';
  END IF;
  
  RETURN NEW;
END;
$function$;