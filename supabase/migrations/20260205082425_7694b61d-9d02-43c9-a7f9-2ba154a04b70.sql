-- Allow expiry_date to be nullable for non-drug items (bandages, masks, etc.)
ALTER TABLE public.medicines ALTER COLUMN expiry_date DROP NOT NULL;