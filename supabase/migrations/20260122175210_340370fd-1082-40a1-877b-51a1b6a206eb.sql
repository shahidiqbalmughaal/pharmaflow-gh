-- Add is_narcotic column to medicines table (optional boolean, default false)
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS is_narcotic boolean DEFAULT false;