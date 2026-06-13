
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_medicines_name_gin_trgm
  ON public.medicines USING gin (lower(medicine_name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_medicines_company_gin_trgm
  ON public.medicines USING gin (lower(company_name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_medicines_batch_gin_trgm
  ON public.medicines USING gin (lower(batch_no) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cosmetics_name_gin_trgm
  ON public.cosmetics USING gin (lower(product_name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cosmetics_brand_gin_trgm
  ON public.cosmetics USING gin (lower(brand) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cosmetics_batch_gin_trgm
  ON public.cosmetics USING gin (lower(batch_no) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cosmetics_name_order
  ON public.cosmetics USING btree (product_name);
