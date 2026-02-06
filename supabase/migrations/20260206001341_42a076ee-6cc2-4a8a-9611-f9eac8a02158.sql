-- Fix: allow all app selling types/categories by removing outdated CHECK constraint
-- Error seen: violates check constraint "medicines_selling_type_check"

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'medicines_selling_type_check'
      AND conrelid = 'public.medicines'::regclass
  ) THEN
    ALTER TABLE public.medicines
      DROP CONSTRAINT medicines_selling_type_check;
  END IF;
END $$;

-- Keep selling_type required and sane
ALTER TABLE public.medicines
  ALTER COLUMN selling_type SET NOT NULL;

ALTER TABLE public.medicines
  ALTER COLUMN selling_type SET DEFAULT 'per_tablet';
