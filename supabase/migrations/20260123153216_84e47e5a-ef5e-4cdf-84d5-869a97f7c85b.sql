-- Drop the old constraint
ALTER TABLE public.medicines DROP CONSTRAINT IF EXISTS medicines_selling_type_check;

-- Add new constraint with all selling types including powder, lotion, shampoo, inhaler
ALTER TABLE public.medicines ADD CONSTRAINT medicines_selling_type_check 
CHECK (selling_type = ANY (ARRAY[
  'per_tablet'::text,
  'per_packet'::text,
  'capsule'::text,
  'injection'::text,
  'suppository'::text,
  'ampoule'::text,
  'vial'::text,
  'cream'::text,
  'ointment'::text,
  'eye_drops'::text,
  'drops'::text,
  'syrup'::text,
  'suspension'::text,
  'solution'::text,
  'oral_ampoule'::text,
  'gel'::text,
  'oral_gel'::text,
  'spray'::text,
  'nasal_spray'::text,
  'liquid'::text,
  'drip'::text,
  'iv_set'::text,
  'cannula'::text,
  'syringe'::text,
  'bandage'::text,
  'crepe_bandage'::text,
  'dressing'::text,
  'cotton'::text,
  'plaster'::text,
  'mask'::text,
  'sachet'::text,
  'soap'::text,
  'bar'::text,
  'toothbrush'::text,
  'toothpaste'::text,
  'sugar_strip'::text,
  'supplement'::text,
  'narcotic'::text,
  'powder'::text,
  'lotion'::text,
  'shampoo'::text,
  'inhaler'::text
]));

-- Add barcode column for medicines
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION public.update_medicine_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_medicines_updated_at ON public.medicines;
CREATE TRIGGER update_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW
EXECUTE FUNCTION public.update_medicine_updated_at();