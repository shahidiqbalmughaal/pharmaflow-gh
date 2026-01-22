-- Create storage bucket for pharmacy logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-logos', 'pharmacy-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload pharmacy logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pharmacy-logos');

-- Allow public access to view logos
CREATE POLICY "Anyone can view pharmacy logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pharmacy-logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update pharmacy logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pharmacy-logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "Authenticated users can delete pharmacy logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pharmacy-logos');

-- Add logo_url column to shop_settings
ALTER TABLE public.shop_settings
ADD COLUMN IF NOT EXISTS pharmacy_logo_url TEXT;