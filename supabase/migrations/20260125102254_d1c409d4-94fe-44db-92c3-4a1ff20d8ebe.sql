-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload pharmacy logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pharmacy logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pharmacy logos" ON storage.objects;

-- Create shop-isolated upload policy (owners/managers only)
CREATE POLICY "Shop owners and managers can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pharmacy-logos' AND
  (storage.foldername(name))[1] = get_user_shop_id(auth.uid())::text AND
  get_shop_role(auth.uid(), get_user_shop_id(auth.uid())) IN ('owner', 'manager')
);

-- Create shop-isolated update policy (owners/managers only)
CREATE POLICY "Shop owners and managers can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pharmacy-logos' AND
  (storage.foldername(name))[1] = get_user_shop_id(auth.uid())::text AND
  get_shop_role(auth.uid(), get_user_shop_id(auth.uid())) IN ('owner', 'manager')
);

-- Create shop-isolated delete policy (owners/managers only)
CREATE POLICY "Shop owners and managers can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pharmacy-logos' AND
  (storage.foldername(name))[1] = get_user_shop_id(auth.uid())::text AND
  get_shop_role(auth.uid(), get_user_shop_id(auth.uid())) IN ('owner', 'manager')
);