-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  company_name TEXT NOT NULL,
  rack_no TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cosmetics table
CREATE TABLE public.cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  rack_no TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create salesmen table
CREATE TABLE public.salesmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  cnic TEXT NOT NULL UNIQUE,
  joining_date DATE NOT NULL,
  assigned_counter TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID REFERENCES public.salesmen(id) ON DELETE SET NULL,
  salesman_name TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  total_profit DECIMAL(10,2) NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('medicine', 'cosmetic')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now, can be restricted later with auth)
CREATE POLICY "Enable read access for all users" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.medicines FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.medicines FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.medicines FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.cosmetics FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.cosmetics FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.cosmetics FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.cosmetics FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.salesmen FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.salesmen FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.salesmen FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.salesmen FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.sales FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.sale_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.sale_items FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cosmetics_updated_at
  BEFORE UPDATE ON public.cosmetics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_medicines_expiry_date ON public.medicines(expiry_date);
CREATE INDEX idx_medicines_quantity ON public.medicines(quantity);
CREATE INDEX idx_cosmetics_expiry_date ON public.cosmetics(expiry_date);
CREATE INDEX idx_cosmetics_quantity ON public.cosmetics(quantity);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);