
-- Fix: Convert ALL RESTRICTIVE RLS policies to PERMISSIVE
-- PostgreSQL requires PERMISSIVE policies to grant access; RESTRICTIVE-only means no access at all.

-- ==================== stock_merge_logs ====================
DROP POLICY IF EXISTS "Deny all deletes from stock merge logs" ON public.stock_merge_logs;
DROP POLICY IF EXISTS "Deny all updates to stock merge logs" ON public.stock_merge_logs;
DROP POLICY IF EXISTS "Shop staff can insert stock merge logs" ON public.stock_merge_logs;
DROP POLICY IF EXISTS "Shop staff can view stock merge logs in their shop" ON public.stock_merge_logs;

CREATE POLICY "Deny all deletes from stock merge logs" ON public.stock_merge_logs FOR DELETE TO authenticated USING (false);
CREATE POLICY "Deny all updates to stock merge logs" ON public.stock_merge_logs FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Shop staff can insert stock merge logs" ON public.stock_merge_logs FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop staff can view stock merge logs in their shop" ON public.stock_merge_logs FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));

-- ==================== purchase_orders ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Shop owners and managers can update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Shop owners can delete purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Shop staff can view purchase orders in their shop" ON public.purchase_orders;

CREATE POLICY "Shop staff can view purchase orders in their shop" ON public.purchase_orders FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert purchase orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update purchase orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete purchase orders" ON public.purchase_orders FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== cosmetics ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Shop owners and managers can update cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Shop owners can delete cosmetics" ON public.cosmetics;
DROP POLICY IF EXISTS "Shop staff can view cosmetics in their shop" ON public.cosmetics;

CREATE POLICY "Shop staff can view cosmetics in their shop" ON public.cosmetics FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert cosmetics" ON public.cosmetics FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update cosmetics" ON public.cosmetics FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete cosmetics" ON public.cosmetics FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== salesmen ====================
DROP POLICY IF EXISTS "Shop owners and managers can view salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Shop owners can delete salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Shop owners can insert salesmen" ON public.salesmen;
DROP POLICY IF EXISTS "Shop owners can update salesmen" ON public.salesmen;

CREATE POLICY "Shop owners and managers can view salesmen" ON public.salesmen FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can insert salesmen" ON public.salesmen FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));
CREATE POLICY "Shop owners can update salesmen" ON public.salesmen FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));
CREATE POLICY "Shop owners can delete salesmen" ON public.salesmen FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== alert_settings ====================
DROP POLICY IF EXISTS "Admins can delete alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can insert alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can update alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Admins can view alert settings" ON public.alert_settings;
DROP POLICY IF EXISTS "Require authentication for alert_settings" ON public.alert_settings;

CREATE POLICY "Admins can view alert settings" ON public.alert_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert alert settings" ON public.alert_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update alert settings" ON public.alert_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete alert settings" ON public.alert_settings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== suppliers ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Shop owners and managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Shop owners and managers can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Shop owners can delete suppliers" ON public.suppliers;

CREATE POLICY "Shop owners and managers can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== customer_discounts ====================
DROP POLICY IF EXISTS "Cashiers can view served customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Shop owners and managers can insert customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Shop owners and managers can update customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Shop owners and managers can view customer discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Shop owners can delete customer discounts" ON public.customer_discounts;

CREATE POLICY "Shop owners and managers can view customer discounts" ON public.customer_discounts FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Cashiers can view served customer discounts" ON public.customer_discounts FOR SELECT TO authenticated USING ((shop_id = get_user_shop_id(auth.uid())) AND (EXISTS ( SELECT 1 FROM sales WHERE ((sales.customer_id = customer_discounts.customer_id) AND (sales.shop_id = customer_discounts.shop_id)))));
CREATE POLICY "Shop owners and managers can insert customer discounts" ON public.customer_discounts FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update customer discounts" ON public.customer_discounts FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete customer discounts" ON public.customer_discounts FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== sale_items ====================
DROP POLICY IF EXISTS "Shop owners and managers can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Shop owners can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Shop staff can create sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Shop staff can view sale_items in their shop" ON public.sale_items;

CREATE POLICY "Shop staff can view sale_items in their shop" ON public.sale_items FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop staff can create sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can update sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== expenses ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Shop owners and managers can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Shop owners and managers can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Shop owners can delete expenses" ON public.expenses;

CREATE POLICY "Shop owners and managers can view expenses" ON public.expenses FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== sales ====================
DROP POLICY IF EXISTS "Shop owners and managers can update sales" ON public.sales;
DROP POLICY IF EXISTS "Shop owners can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Shop staff can create sales" ON public.sales;
DROP POLICY IF EXISTS "Shop staff can view sales in their shop" ON public.sales;

CREATE POLICY "Shop staff can view sales in their shop" ON public.sales FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop staff can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can update sales" ON public.sales FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete sales" ON public.sales FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== medicines ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Shop owners and managers can update medicines" ON public.medicines;
DROP POLICY IF EXISTS "Shop owners can delete medicines" ON public.medicines;
DROP POLICY IF EXISTS "Shop staff can view medicines in their shop" ON public.medicines;

CREATE POLICY "Shop staff can view medicines in their shop" ON public.medicines FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update medicines" ON public.medicines FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete medicines" ON public.medicines FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== customers ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Shop owners and managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Shop owners and managers can view shop customers" ON public.customers;
DROP POLICY IF EXISTS "Shop owners can delete customers" ON public.customers;

CREATE POLICY "Shop owners and managers can view shop customers" ON public.customers FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update customers" ON public.customers FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete customers" ON public.customers FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== alert_history ====================
DROP POLICY IF EXISTS "Authenticated admins can insert alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Authenticated admins can view alert history" ON public.alert_history;

CREATE POLICY "Authenticated admins can view alert history" ON public.alert_history FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated admins can insert alert history" ON public.alert_history FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== shop_settings ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Shop owners and managers can update shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Shop staff can view their shop settings" ON public.shop_settings;

CREATE POLICY "Shop staff can view their shop settings" ON public.shop_settings FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert shop settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update shop settings" ON public.shop_settings FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));

-- ==================== returns ====================
DROP POLICY IF EXISTS "Only admins can delete returns" ON public.returns;
DROP POLICY IF EXISTS "Only super admins can update returns" ON public.returns;
DROP POLICY IF EXISTS "Shop owners and managers can insert returns" ON public.returns;
DROP POLICY IF EXISTS "Shop staff can view returns" ON public.returns;

CREATE POLICY "Shop staff can view returns" ON public.returns FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert returns" ON public.returns FOR INSERT TO authenticated WITH CHECK ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text])));
CREATE POLICY "Only super admins can update returns" ON public.returns FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Only admins can delete returns" ON public.returns FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- ==================== shop_staff ====================
DROP POLICY IF EXISTS "Shop owners can manage their shop staff" ON public.shop_staff;
DROP POLICY IF EXISTS "Staff can view their own shop staff" ON public.shop_staff;
DROP POLICY IF EXISTS "Super admins can manage all shop staff" ON public.shop_staff;

CREATE POLICY "Super admins can manage all shop staff" ON public.shop_staff FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Shop owners can manage their shop staff" ON public.shop_staff FOR ALL TO authenticated USING (get_shop_role(auth.uid(), shop_id) = 'owner'::text) WITH CHECK (get_shop_role(auth.uid(), shop_id) = 'owner'::text);
CREATE POLICY "Staff can view their own shop staff" ON public.shop_staff FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));

-- ==================== expense_alerts ====================
DROP POLICY IF EXISTS "Admins can manage expense alerts" ON public.expense_alerts;
DROP POLICY IF EXISTS "Managers can view expense alerts" ON public.expense_alerts;
DROP POLICY IF EXISTS "Shop owners and managers can view expense alerts" ON public.expense_alerts;

CREATE POLICY "Admins can manage expense alerts" ON public.expense_alerts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view expense alerts" ON public.expense_alerts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Shop owners and managers can view expense alerts" ON public.expense_alerts FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (((shop_id IS NULL) OR (shop_id = get_user_shop_id(auth.uid()))) AND (get_shop_role(auth.uid(), COALESCE(shop_id, get_user_shop_id(auth.uid()))) = ANY (ARRAY['owner'::text, 'manager'::text]))));

-- ==================== access_logs ====================
DROP POLICY IF EXISTS "Shop owners and managers can view access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Users can insert their own access logs" ON public.access_logs;

CREATE POLICY "Users can insert their own access logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shop owners and managers can view access logs" ON public.access_logs FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Admins can view profiles in their shops" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view profiles in their shops" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND (is_super_admin(auth.uid()) OR users_share_shop(auth.uid(), id)));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()) AND ((current_shop_id IS NULL) OR user_belongs_to_shop(auth.uid(), current_shop_id)));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK ((id = auth.uid()) AND ((NOT (current_shop_id IS DISTINCT FROM get_user_shop_id(auth.uid()))) OR user_belongs_to_shop(auth.uid(), current_shop_id)));

-- ==================== cosmetic_categories ====================
DROP POLICY IF EXISTS "Admins can delete cosmetic categories" ON public.cosmetic_categories;
DROP POLICY IF EXISTS "Admins can insert cosmetic categories" ON public.cosmetic_categories;
DROP POLICY IF EXISTS "Admins can update cosmetic categories" ON public.cosmetic_categories;
DROP POLICY IF EXISTS "Authenticated users can view cosmetic categories" ON public.cosmetic_categories;

CREATE POLICY "Authenticated users can view cosmetic categories" ON public.cosmetic_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cosmetic categories" ON public.cosmetic_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update cosmetic categories" ON public.cosmetic_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete cosmetic categories" ON public.cosmetic_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== cosmetic_subcategories ====================
DROP POLICY IF EXISTS "Admins can delete cosmetic subcategories" ON public.cosmetic_subcategories;
DROP POLICY IF EXISTS "Admins can insert cosmetic subcategories" ON public.cosmetic_subcategories;
DROP POLICY IF EXISTS "Admins can update cosmetic subcategories" ON public.cosmetic_subcategories;
DROP POLICY IF EXISTS "Authenticated users can view cosmetic subcategories" ON public.cosmetic_subcategories;

CREATE POLICY "Authenticated users can view cosmetic subcategories" ON public.cosmetic_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cosmetic subcategories" ON public.cosmetic_subcategories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update cosmetic subcategories" ON public.cosmetic_subcategories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete cosmetic subcategories" ON public.cosmetic_subcategories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== shops ====================
DROP POLICY IF EXISTS "Shop staff can view their shops" ON public.shops;
DROP POLICY IF EXISTS "Super admins can manage all shops" ON public.shops;

CREATE POLICY "Super admins can manage all shops" ON public.shops FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Shop staff can view their shops" ON public.shops FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM shop_staff WHERE ((shop_staff.shop_id = shops.id) AND (shop_staff.user_id = auth.uid()) AND (shop_staff.is_active = true))));

-- ==================== purchase_order_items ====================
DROP POLICY IF EXISTS "Shop owners and managers can insert purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Shop owners and managers can update purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Shop owners can delete purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Shop staff can view purchase order items in their shop" ON public.purchase_order_items;

CREATE POLICY "Shop staff can view purchase order items in their shop" ON public.purchase_order_items FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid())));
CREATE POLICY "Shop owners and managers can insert purchase order items" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners and managers can update purchase order items" ON public.purchase_order_items FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = ANY (ARRAY['owner'::text, 'manager'::text]))));
CREATE POLICY "Shop owners can delete purchase order items" ON public.purchase_order_items FOR DELETE TO authenticated USING (is_super_admin(auth.uid()) OR ((shop_id = get_user_shop_id(auth.uid())) AND (get_shop_role(auth.uid(), shop_id) = 'owner'::text)));
