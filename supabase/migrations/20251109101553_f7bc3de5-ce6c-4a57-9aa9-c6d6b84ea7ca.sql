-- Create function to decrement medicine quantity
CREATE OR REPLACE FUNCTION decrement_medicine_quantity(medicine_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.medicines
  SET quantity = quantity - qty
  WHERE id = medicine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement cosmetic quantity
CREATE OR REPLACE FUNCTION decrement_cosmetic_quantity(cosmetic_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cosmetics
  SET quantity = quantity - qty
  WHERE id = cosmetic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;