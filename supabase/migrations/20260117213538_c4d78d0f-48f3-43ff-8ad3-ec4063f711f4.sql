-- =====================================================
-- MULTI-SHOP MIGRATION PART 2 - UPDATE RLS POLICIES
-- =====================================================

-- UPDATE PROFILES POLICY
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  (current_shop_id IS NULL OR public.user_belongs_to_shop(auth.uid(), current_shop_id))
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR MEDICINES (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins and Managers can update medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins and Managers can view medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins can delete medicines" ON public.medicines;
DROP POLICY IF EXISTS "Salesmen can view medicines" ON public.medicines;

CREATE POLICY "Shop staff can view medicines in their shop"
ON public.medicines FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can insert medicines"
ON public.medicines FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update medicines"
ON public.medicines FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete medicines"
ON public.medicines FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR COSMETICS (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can insert cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Admins and Managers can update cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Admins and Managers can view cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Admins can delete cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Salesmen can view cosmetics" ON public.cosmetics;

CREATE POLICY "Shop staff can view cosmetics in their shop"
ON public.cosmetics FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can insert cosmetics"
ON public.cosmetics FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update cosmetics"
ON public.cosmetics FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete cosmetics"
ON public.cosmetics FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR SALES (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authorized users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Salesmen can view own sales" ON public.sales;

CREATE POLICY "Shop staff can view sales in their shop"
ON public.sales FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop staff can create sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can update sales"
ON public.sales FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete sales"
ON public.sales FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR SALE_ITEMS (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can view all sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authorized users can create sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Salesmen can view own sale_items" ON public.sale_items;

CREATE POLICY "Shop staff can view sale_items in their shop"
ON public.sale_items FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop staff can create sale_items"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can update sale_items"
ON public.sale_items FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete sale_items"
ON public.sale_items FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR CUSTOMERS (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and Managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and Managers can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Salesmen can view served customers" ON public.customers;

CREATE POLICY "Shop staff can view customers in their shop"
ON public.customers FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR EXPENSES (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins and Managers can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins and Managers can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Shop owners and managers can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can insert expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR SALESMEN (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can view salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can delete salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can insert salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Admins can update salesmen" ON public.salesmen;

CREATE POLICY "Shop staff can view salesmen in their shop"
ON public.salesmen FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners can insert salesmen"
ON public.salesmen FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

CREATE POLICY "Shop owners can update salesmen"
ON public.salesmen FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

CREATE POLICY "Shop owners can delete salesmen"
ON public.salesmen FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES FOR SUPPLIERS (Shop-Aware)
-- =====================================================

DROP POLICY IF EXISTS "Admins and Managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and Managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and Managers can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

CREATE POLICY "Shop staff can view suppliers in their shop"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  shop_id = public.get_user_shop_id(auth.uid())
);

CREATE POLICY "Shop owners and managers can insert suppliers"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners and managers can update suppliers"
ON public.suppliers FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

CREATE POLICY "Shop owners can delete suppliers"
ON public.suppliers FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (shop_id = public.get_user_shop_id(auth.uid()) AND 
   public.get_shop_role(auth.uid(), shop_id) = 'owner')
);