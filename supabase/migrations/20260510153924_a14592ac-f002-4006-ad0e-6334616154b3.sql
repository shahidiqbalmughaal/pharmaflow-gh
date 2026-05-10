
-- 1. Catalog table
CREATE TABLE IF NOT EXISTS public.product_category_catalog (
  product_type text NOT NULL CHECK (product_type IN ('medicine','herbal_medicine','cosmetic')),
  category     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_type, category)
);

ALTER TABLE public.product_category_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view category catalog" ON public.product_category_catalog;
CREATE POLICY "Authenticated can view category catalog"
  ON public.product_category_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage category catalog" ON public.product_category_catalog;
CREATE POLICY "Admins manage category catalog"
  ON public.product_category_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Seed (idempotent)
INSERT INTO public.product_category_catalog (product_type, category) VALUES
  -- Medicine
  ('medicine','Medicated Shampoo'),('medicine','Medicated Sunblock'),('medicine','Medicated Facewash'),
  ('medicine','Medicated Lotion'),('medicine','Medicated Solution'),
  ('medicine','Tablets'),('medicine','Capsules'),('medicine','Syrups'),('medicine','Injections'),
  ('medicine','Drops'),('medicine','Eye Drops'),('medicine','Ear Drops'),('medicine','Nasal Spray'),
  ('medicine','Ointments'),('medicine','Creams'),('medicine','Gels'),('medicine','Powders'),
  ('medicine','Sachets'),('medicine','Vaccines'),('medicine','Insulin'),('medicine','Nebulizer Solutions'),
  ('medicine','Pediatric Medicines'),('medicine','Antibiotics'),('medicine','Pain Relief'),
  ('medicine','Vitamins & Supplements'),('medicine','Antacids'),('medicine','Anti-Allergy'),
  ('medicine','Dermatology Medicines'),
  ('medicine','First Aid'),('medicine','Bandages'),('medicine','Surgical Items'),('medicine','Gloves'),
  ('medicine','Masks'),('medicine','Thermometers'),('medicine','BP Apparatus'),('medicine','Diabetic Care'),
  ('medicine','Test Strips'),('medicine','Wheelchair & Support'),('medicine','Medical Devices'),
  -- Herbal medicine
  ('herbal_medicine','Herbal Syrup'),('herbal_medicine','Herbal Capsules'),('herbal_medicine','Herbal Tablets'),
  ('herbal_medicine','Herbal Powder'),('herbal_medicine','Herbal Oil'),('herbal_medicine','Herbal Cream'),
  ('herbal_medicine','Herbal Lotion'),('herbal_medicine','Herbal Drops'),('herbal_medicine','Herbal Tea'),
  ('herbal_medicine','Herbal Extract'),('herbal_medicine','Herbal Medicine'),('herbal_medicine','Herbal Supplements'),
  ('herbal_medicine','Herbal Shampoo'),('herbal_medicine','Organic Skincare'),
  ('herbal_medicine','Ayurvedic Products'),('herbal_medicine','Homeopathic Medicine'),
  -- Cosmetic
  ('cosmetic','Shampoo'),('cosmetic','Facewash'),('cosmetic','Cream'),('cosmetic','Lotion'),
  ('cosmetic','Serum'),('cosmetic','Sunscreen'),('cosmetic','Feminine Hygiene Wash'),
  ('cosmetic','Intimate Care'),('cosmetic','Medicated Shampoo'),('cosmetic','Emollient Cream'),
  ('cosmetic','Conditioner'),('cosmetic','Hair Oil'),('cosmetic','Hair Color'),('cosmetic','Face Wash'),
  ('cosmetic','Facial Cleanser'),('cosmetic','Moisturizer'),('cosmetic','Soap'),('cosmetic','Body Wash'),
  ('cosmetic','Cream Bleach'),('cosmetic','Scrub'),('cosmetic','Toner'),('cosmetic','Lip Care'),
  ('cosmetic','Deodorant'),('cosmetic','Perfume'),('cosmetic','Makeup'),('cosmetic','Nail Care'),
  ('cosmetic','Beauty Cream'),('cosmetic','Acne Care'),('cosmetic','Skin Whitening'),('cosmetic','Baby Care'),
  ('cosmetic','Diapers'),('cosmetic','Baby Lotion'),('cosmetic','Baby Shampoo'),('cosmetic','Sanitary Pads'),
  ('cosmetic','Tampons'),('cosmetic','Feminine Hygiene Products')
ON CONFLICT (product_type, category) DO NOTHING;

-- 3. Validation trigger for medicines (allows medicine OR herbal_medicine)
CREATE OR REPLACE FUNCTION public.validate_medicine_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.product_category IS NULL OR btrim(NEW.product_category) = '' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_category_catalog
    WHERE product_type IN ('medicine','herbal_medicine')
      AND category = NEW.product_category
  ) THEN
    RAISE LOG 'Category validation failed: medicine "%" rejected with invalid category "%"',
      NEW.medicine_name, NEW.product_category;
    RAISE EXCEPTION
      'Invalid product category "%" for medicine "%". Save rejected — category not found in catalog.',
      NEW.product_category, NEW.medicine_name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_medicine_category ON public.medicines;
CREATE TRIGGER trg_validate_medicine_category
  BEFORE INSERT OR UPDATE OF product_category, medicine_name ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.validate_medicine_category();

-- 4. Validation trigger for cosmetics
CREATE OR REPLACE FUNCTION public.validate_cosmetic_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.product_category IS NULL OR btrim(NEW.product_category) = '' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_category_catalog
    WHERE product_type = 'cosmetic'
      AND category = NEW.product_category
  ) THEN
    RAISE LOG 'Category validation failed: cosmetic "%" rejected with invalid category "%"',
      NEW.product_name, NEW.product_category;
    RAISE EXCEPTION
      'Invalid product category "%" for cosmetic "%". Save rejected — category not found in catalog.',
      NEW.product_category, NEW.product_name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cosmetic_category ON public.cosmetics;
CREATE TRIGGER trg_validate_cosmetic_category
  BEFORE INSERT OR UPDATE OF product_category, product_name ON public.cosmetics
  FOR EACH ROW EXECUTE FUNCTION public.validate_cosmetic_category();
