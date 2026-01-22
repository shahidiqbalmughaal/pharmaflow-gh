-- Create stock merge logs table to track all stock merges
CREATE TABLE public.stock_merge_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_id UUID NOT NULL,
  previous_quantity INTEGER NOT NULL,
  added_quantity INTEGER NOT NULL,
  new_total_quantity INTEGER NOT NULL,
  previous_selling_price NUMERIC,
  new_selling_price NUMERIC,
  previous_purchase_price NUMERIC,
  new_purchase_price NUMERIC,
  merged_by TEXT NOT NULL,
  merged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shop_id UUID,
  medicine_name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.stock_merge_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock merge logs
CREATE POLICY "Shop staff can view stock merge logs in their shop"
ON public.stock_merge_logs
FOR SELECT
USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Shop staff can insert stock merge logs"
ON public.stock_merge_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));

-- Index for faster lookups
CREATE INDEX idx_stock_merge_logs_medicine_id ON public.stock_merge_logs(medicine_id);
CREATE INDEX idx_stock_merge_logs_shop_id ON public.stock_merge_logs(shop_id);