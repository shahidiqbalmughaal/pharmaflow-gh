-- Add UPDATE triggers for medicine and cosmetic validation
-- This ensures validation runs on both INSERT and UPDATE operations

-- Create trigger for medicine updates
CREATE TRIGGER validate_medicine_before_update
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_medicine_data();

-- Create trigger for cosmetic updates  
CREATE TRIGGER validate_cosmetic_before_update
  BEFORE UPDATE ON public.cosmetics
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cosmetic_data();

-- Create trigger for sale_items updates
CREATE TRIGGER validate_sale_item_before_update
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sale_item_data();