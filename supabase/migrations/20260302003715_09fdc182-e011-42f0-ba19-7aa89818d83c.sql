
-- Make pharmacy-logos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'pharmacy-logos';

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view pharmacy logos" ON storage.objects;

-- Add authenticated shop-scoped read policy
CREATE POLICY "Authenticated users can view pharmacy logos in their shop"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pharmacy-logos'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.get_user_shop_id(auth.uid())::text
  )
);
