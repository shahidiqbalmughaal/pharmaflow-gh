
-- Create cosmetic_categories table
CREATE TABLE public.cosmetic_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  shop_id UUID REFERENCES public.shops(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cosmetic_subcategories table
CREATE TABLE public.cosmetic_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.cosmetic_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shop_id UUID REFERENCES public.shops(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Add category_id and subcategory_id to cosmetics table
ALTER TABLE public.cosmetics 
  ADD COLUMN category_id UUID REFERENCES public.cosmetic_categories(id),
  ADD COLUMN subcategory_id UUID REFERENCES public.cosmetic_subcategories(id);

-- Enable RLS
ALTER TABLE public.cosmetic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS policies for cosmetic_categories (readable by all authenticated, manageable by admins)
CREATE POLICY "Authenticated users can view cosmetic categories"
ON public.cosmetic_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert cosmetic categories"
ON public.cosmetic_categories FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cosmetic categories"
ON public.cosmetic_categories FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cosmetic categories"
ON public.cosmetic_categories FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for cosmetic_subcategories
CREATE POLICY "Authenticated users can view cosmetic subcategories"
ON public.cosmetic_subcategories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert cosmetic subcategories"
ON public.cosmetic_subcategories FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cosmetic subcategories"
ON public.cosmetic_subcategories FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cosmetic subcategories"
ON public.cosmetic_subcategories FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed categories and subcategories
DO $$
DECLARE
  cat_id UUID;
BEGIN
  -- Skincare
  INSERT INTO public.cosmetic_categories (name) VALUES ('Skincare') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Face Wash / Cleanser'), (cat_id, 'Face Cream / Moisturizer'), (cat_id, 'Face Serum'),
    (cat_id, 'Sunscreen / Sunblock'), (cat_id, 'Face Toner'), (cat_id, 'Face Scrub / Exfoliator'),
    (cat_id, 'Face Mask'), (cat_id, 'Acne Treatment'), (cat_id, 'Anti-Aging Cream'),
    (cat_id, 'Night Cream'), (cat_id, 'Day Cream');

  -- Hair Care
  INSERT INTO public.cosmetic_categories (name) VALUES ('Hair Care') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Shampoo'), (cat_id, 'Conditioner'), (cat_id, 'Hair Oil'), (cat_id, 'Hair Serum'),
    (cat_id, 'Hair Mask'), (cat_id, 'Hair Color / Hair Dye'), (cat_id, 'Hair Gel'),
    (cat_id, 'Hair Spray'), (cat_id, 'Hair Styling Cream'), (cat_id, 'Hair Wax');

  -- Makeup
  INSERT INTO public.cosmetic_categories (name) VALUES ('Makeup') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Foundation'), (cat_id, 'BB Cream'), (cat_id, 'CC Cream'), (cat_id, 'Compact Powder'),
    (cat_id, 'Loose Powder'), (cat_id, 'Concealer'), (cat_id, 'Blush'), (cat_id, 'Highlighter'),
    (cat_id, 'Lipstick'), (cat_id, 'Lip Balm'), (cat_id, 'Lip Gloss'), (cat_id, 'Lip Liner'),
    (cat_id, 'Mascara'), (cat_id, 'Eyeliner'), (cat_id, 'Eyeshadow'), (cat_id, 'Makeup Remover'),
    (cat_id, 'Makeup Setting Spray');

  -- Body Care
  INSERT INTO public.cosmetic_categories (name) VALUES ('Body Care') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Body Lotion'), (cat_id, 'Body Cream'), (cat_id, 'Body Butter'), (cat_id, 'Body Wash'),
    (cat_id, 'Shower Gel'), (cat_id, 'Body Scrub'), (cat_id, 'Hand Cream'), (cat_id, 'Foot Cream');

  -- Personal Hygiene
  INSERT INTO public.cosmetic_categories (name) VALUES ('Personal Hygiene') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Soap / Bath Soap'), (cat_id, 'Hand Wash'), (cat_id, 'Hand Sanitizer'),
    (cat_id, 'Intimate Wash'), (cat_id, 'Deodorant'), (cat_id, 'Talcum Powder');

  -- Fragrance
  INSERT INTO public.cosmetic_categories (name) VALUES ('Fragrance') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Perfume'), (cat_id, 'Body Spray'), (cat_id, 'Attar'), (cat_id, 'Roll-On Deodorant');

  -- Baby Care
  INSERT INTO public.cosmetic_categories (name) VALUES ('Baby Care') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Newborn Diapers'), (cat_id, 'Small Diapers'), (cat_id, 'Medium Diapers'),
    (cat_id, 'Large Diapers'), (cat_id, 'XL Diapers'), (cat_id, 'XXL Diapers'),
    (cat_id, 'Diaper Pants'), (cat_id, 'Overnight Diapers'), (cat_id, 'Adult Diapers'),
    (cat_id, 'Baby Wipes'), (cat_id, 'Baby Lotion'), (cat_id, 'Baby Oil'),
    (cat_id, 'Baby Shampoo'), (cat_id, 'Baby Powder'), (cat_id, 'Baby Cream'),
    (cat_id, 'Baby Rash Cream'), (cat_id, 'Baby Soap');

  -- Feminine Care
  INSERT INTO public.cosmetic_categories (name) VALUES ('Feminine Care') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Sanitary Pads'), (cat_id, 'Panty Liners'), (cat_id, 'Tampons'),
    (cat_id, 'Menstrual Cups'), (cat_id, 'Feminine Wash');

  -- Men's Grooming
  INSERT INTO public.cosmetic_categories (name) VALUES ('Men''s Grooming') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Beard Oil'), (cat_id, 'Beard Wash'), (cat_id, 'Beard Balm'),
    (cat_id, 'Shaving Cream'), (cat_id, 'Shaving Foam'), (cat_id, 'After Shave'),
    (cat_id, 'Hair Wax'), (cat_id, 'Hair Clay');

  -- Nail Care
  INSERT INTO public.cosmetic_categories (name) VALUES ('Nail Care') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Nail Polish'), (cat_id, 'Nail Polish Remover'), (cat_id, 'Nail Treatment'),
    (cat_id, 'Nail Strengthener');

  -- Beauty Tools & Accessories
  INSERT INTO public.cosmetic_categories (name) VALUES ('Beauty Tools & Accessories') RETURNING id INTO cat_id;
  INSERT INTO public.cosmetic_subcategories (category_id, name) VALUES
    (cat_id, 'Makeup Brushes'), (cat_id, 'Beauty Blender'), (cat_id, 'Hair Brushes'),
    (cat_id, 'Hair Comb'), (cat_id, 'Razors'), (cat_id, 'Nail Clippers'),
    (cat_id, 'Eyelash Curler'), (cat_id, 'Tweezers');
END $$;
