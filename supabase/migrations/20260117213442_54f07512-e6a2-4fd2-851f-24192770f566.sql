-- =====================================================
-- MULTI-SHOP (MULTI-TENANT) MIGRATION - PART 1
-- Core tables and columns without using new enum values
-- =====================================================

-- 1. Create shops table
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  email text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 2. Create shop_staff table to link users to shops with their roles
CREATE TABLE IF NOT EXISTS public.shop_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id)
);

-- Enable RLS on shop_staff
ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;

-- 3. Add shop_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_shop_id uuid REFERENCES public.shops(id);

-- 4. Add shop_id to all relevant tables
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.cosmetics ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.salesmen ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.alert_settings ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.alert_history ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.customer_discounts ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.expense_alerts ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);

-- 5. Create helper function to get user's current shop
CREATE OR REPLACE FUNCTION public.get_user_shop_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_shop_id FROM public.profiles WHERE id = _user_id
$$;

-- 6. Create helper function to check if user belongs to a shop
CREATE OR REPLACE FUNCTION public.user_belongs_to_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_staff
    WHERE user_id = _user_id 
      AND shop_id = _shop_id 
      AND is_active = true
  )
$$;

-- 7. Create helper function to get user's shop role
CREATE OR REPLACE FUNCTION public.get_shop_role(_user_id uuid, _shop_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.shop_staff
  WHERE user_id = _user_id 
    AND shop_id = _shop_id 
    AND is_active = true
$$;

-- 8. Create helper function to check if user is super admin (uses existing admin role)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For now, treat existing 'admin' role as super admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- 9. Create function to check shop-level access
CREATE OR REPLACE FUNCTION public.has_shop_access(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    public.user_belongs_to_shop(_user_id, _shop_id)
$$;

-- =====================================================
-- RLS POLICIES FOR SHOPS TABLE
-- =====================================================

CREATE POLICY "Super admins can manage all shops"
ON public.shops FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Shop staff can view their shops"
ON public.shops FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shop_staff
    WHERE shop_staff.shop_id = shops.id
      AND shop_staff.user_id = auth.uid()
      AND shop_staff.is_active = true
  )
);

-- =====================================================
-- RLS POLICIES FOR SHOP_STAFF TABLE
-- =====================================================

CREATE POLICY "Super admins can manage all shop staff"
ON public.shop_staff FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Shop owners can manage their shop staff"
ON public.shop_staff FOR ALL
TO authenticated
USING (
  public.get_shop_role(auth.uid(), shop_id) = 'owner'
)
WITH CHECK (
  public.get_shop_role(auth.uid(), shop_id) = 'owner'
);

CREATE POLICY "Staff can view their own shop staff"
ON public.shop_staff FOR SELECT
TO authenticated
USING (
  shop_id = public.get_user_shop_id(auth.uid())
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_medicines_shop_id ON public.medicines(shop_id);
CREATE INDEX IF NOT EXISTS idx_cosmetics_shop_id ON public.cosmetics(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_shop_id ON public.sale_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON public.expenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_salesmen_shop_id ON public.salesmen(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON public.suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_returns_shop_id ON public.returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON public.shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_user_id ON public.shop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_shop_id ON public.profiles(current_shop_id);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

CREATE TRIGGER update_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_staff_updated_at
BEFORE UPDATE ON public.shop_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Enable realtime for shops table
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_staff;