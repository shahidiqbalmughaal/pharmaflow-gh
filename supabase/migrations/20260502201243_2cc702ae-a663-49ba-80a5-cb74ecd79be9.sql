-- 1) Prevent duplicate narcotics entries: one register row per sale_item
-- First, deduplicate any existing duplicates (keep earliest)
DELETE FROM public.narcotics_register a
USING public.narcotics_register b
WHERE a.sale_item_id = b.sale_item_id
  AND a.created_at > b.created_at;

ALTER TABLE public.narcotics_register
  ADD CONSTRAINT narcotics_register_sale_item_unique UNIQUE (sale_item_id);

-- 2) Storage bucket for weekly narcotics PDF reports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('narcotics-reports', 'narcotics-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: shop owners/managers can read/manage their shop's reports
-- Files stored as: {shop_id}/{filename}.pdf
CREATE POLICY "Shop owners and managers can view narcotics reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'narcotics-reports' AND (
    public.is_super_admin(auth.uid()) OR (
      (storage.foldername(name))[1] = public.get_user_shop_id(auth.uid())::text
      AND public.get_shop_role(auth.uid(), public.get_user_shop_id(auth.uid())) = ANY (ARRAY['owner','manager'])
    )
  )
);

CREATE POLICY "Service role and owners can insert narcotics reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'narcotics-reports' AND (
    public.is_super_admin(auth.uid()) OR (
      (storage.foldername(name))[1] = public.get_user_shop_id(auth.uid())::text
      AND public.get_shop_role(auth.uid(), public.get_user_shop_id(auth.uid())) = ANY (ARRAY['owner','manager'])
    )
  )
);

CREATE POLICY "Shop owners can delete narcotics reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'narcotics-reports' AND (
    public.is_super_admin(auth.uid()) OR (
      (storage.foldername(name))[1] = public.get_user_shop_id(auth.uid())::text
      AND public.get_shop_role(auth.uid(), public.get_user_shop_id(auth.uid())) = 'owner'
    )
  )
);

-- 3) Track generated weekly reports (metadata + dedup)
CREATE TABLE public.narcotics_weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  storage_path text NOT NULL,
  entry_count integer NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL DEFAULT 'auto-cron',
  UNIQUE (shop_id, period_start, period_end)
);

ALTER TABLE public.narcotics_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners and managers can view weekly reports"
ON public.narcotics_weekly_reports FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR (
    shop_id = public.get_user_shop_id(auth.uid())
    AND public.get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner','manager'])
  )
);

CREATE POLICY "Shop owners and managers can insert weekly reports"
ON public.narcotics_weekly_reports FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR (
    shop_id = public.get_user_shop_id(auth.uid())
    AND public.get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner','manager'])
  )
);

-- 4) Enable required extensions for weekly cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;