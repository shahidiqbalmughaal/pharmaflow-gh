-- Fix security warnings by setting search_path on functions
DROP FUNCTION IF EXISTS decrement_medicine_quantity(UUID, INTEGER);
DROP FUNCTION IF EXISTS decrement_cosmetic_quantity(UUID, INTEGER);

-- Create function to decrement medicine quantity with proper search_path
CREATE OR REPLACE FUNCTION decrement_medicine_quantity(medicine_id UUID, qty INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medicines
  SET quantity = quantity - qty
  WHERE id = medicine_id;
END;
$$;

-- Create function to decrement cosmetic quantity with proper search_path
CREATE OR REPLACE FUNCTION decrement_cosmetic_quantity(cosmetic_id UUID, qty INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cosmetics
  SET quantity = quantity - qty
  WHERE id = cosmetic_id;
END;
$$;