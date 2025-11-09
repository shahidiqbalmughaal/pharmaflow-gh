-- Drop all existing public access policies
DROP POLICY IF EXISTS "Enable read access for all users" ON medicines;
DROP POLICY IF EXISTS "Enable insert access for all users" ON medicines;
DROP POLICY IF EXISTS "Enable update access for all users" ON medicines;
DROP POLICY IF EXISTS "Enable delete access for all users" ON medicines;

DROP POLICY IF EXISTS "Enable read access for all users" ON cosmetics;
DROP POLICY IF EXISTS "Enable insert access for all users" ON cosmetics;
DROP POLICY IF EXISTS "Enable update access for all users" ON cosmetics;
DROP POLICY IF EXISTS "Enable delete access for all users" ON cosmetics;

DROP POLICY IF EXISTS "Enable read access for all users" ON salesmen;
DROP POLICY IF EXISTS "Enable insert access for all users" ON salesmen;
DROP POLICY IF EXISTS "Enable update access for all users" ON salesmen;
DROP POLICY IF EXISTS "Enable delete access for all users" ON salesmen;

DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;

DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sale_items;

-- MEDICINES TABLE POLICIES
-- Admins and Managers can view all medicines
CREATE POLICY "Admins and Managers can view medicines"
  ON medicines FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Salesmen can view medicines (read-only for sales)
CREATE POLICY "Salesmen can view medicines"
  ON medicines FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'salesman'));

-- Admins and Managers can insert medicines
CREATE POLICY "Admins and Managers can insert medicines"
  ON medicines FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Admins and Managers can update medicines
CREATE POLICY "Admins and Managers can update medicines"
  ON medicines FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Only Admins can delete medicines
CREATE POLICY "Admins can delete medicines"
  ON medicines FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- COSMETICS TABLE POLICIES
-- Admins and Managers can view all cosmetics
CREATE POLICY "Admins and Managers can view cosmetics"
  ON cosmetics FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Salesmen can view cosmetics (read-only for sales)
CREATE POLICY "Salesmen can view cosmetics"
  ON cosmetics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'salesman'));

-- Admins and Managers can insert cosmetics
CREATE POLICY "Admins and Managers can insert cosmetics"
  ON cosmetics FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Admins and Managers can update cosmetics
CREATE POLICY "Admins and Managers can update cosmetics"
  ON cosmetics FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Only Admins can delete cosmetics
CREATE POLICY "Admins can delete cosmetics"
  ON cosmetics FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SALESMEN TABLE POLICIES (Employee records - highly sensitive)
-- Admins and Managers can view all salesmen
CREATE POLICY "Admins and Managers can view salesmen"
  ON salesmen FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Only Admins can insert salesmen
CREATE POLICY "Admins can insert salesmen"
  ON salesmen FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only Admins can update salesmen
CREATE POLICY "Admins can update salesmen"
  ON salesmen FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only Admins can delete salesmen
CREATE POLICY "Admins can delete salesmen"
  ON salesmen FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SALES TABLE POLICIES
-- Admins and Managers can view all sales
CREATE POLICY "Admins and Managers can view all sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Salesmen can view their own sales
CREATE POLICY "Salesmen can view own sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesman') AND 
    salesman_id = auth.uid()
  );

-- All authenticated users can create sales
CREATE POLICY "Authenticated users can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update sales
CREATE POLICY "Admins can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete sales
CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SALE_ITEMS TABLE POLICIES
-- Admins and Managers can view all sale items
CREATE POLICY "Admins and Managers can view all sale_items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Salesmen can view sale items from their own sales
CREATE POLICY "Salesmen can view own sale_items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesman') AND 
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.salesman_id = auth.uid()
    )
  );

-- All authenticated users can create sale items
CREATE POLICY "Authenticated users can create sale_items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update sale items
CREATE POLICY "Admins can update sale_items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete sale items
CREATE POLICY "Admins can delete sale_items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));