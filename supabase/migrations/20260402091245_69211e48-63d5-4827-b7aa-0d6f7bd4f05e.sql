
-- Add product_category column to medicines table
ALTER TABLE public.medicines ADD COLUMN product_category text;

-- Add product_category column to cosmetics table  
ALTER TABLE public.cosmetics ADD COLUMN product_category text;
