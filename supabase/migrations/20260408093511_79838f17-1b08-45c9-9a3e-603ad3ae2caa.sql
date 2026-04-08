-- Performance indexes for medicine search
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON public.medicines USING btree (lower(medicine_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_batch_no ON public.medicines USING btree (lower(batch_no) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_company ON public.medicines USING btree (lower(company_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON public.medicines USING btree (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medicines_shop_id ON public.medicines USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_medicines_quantity ON public.medicines USING btree (quantity);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry_date ON public.medicines USING btree (expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicines_name_order ON public.medicines USING btree (medicine_name);

-- Cosmetics indexes
CREATE INDEX IF NOT EXISTS idx_cosmetics_shop_id ON public.cosmetics USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_cosmetics_quantity ON public.cosmetics USING btree (quantity);
CREATE INDEX IF NOT EXISTS idx_cosmetics_expiry_date ON public.cosmetics USING btree (expiry_date);

-- Sales indexes for dashboard
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales USING btree (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_shop_id ON public.sale_items USING btree (shop_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item_type ON public.sale_items USING btree (item_type);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses USING btree (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON public.expenses USING btree (shop_id);

-- Expense alerts indexes
CREATE INDEX IF NOT EXISTS idx_expense_alerts_due_date ON public.expense_alerts USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_expense_alerts_is_paid ON public.expense_alerts USING btree (is_paid);

-- Shop staff indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_shop_staff_user_shop ON public.shop_staff USING btree (user_id, shop_id) WHERE is_active = true;

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_current_shop ON public.profiles USING btree (current_shop_id);

-- User roles indexes for RLS
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles USING btree (user_id, role);