-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_discounts table for customer-specific discounts
CREATE TABLE public.customer_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add customer fields to sales table
ALTER TABLE public.sales 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN customer_name TEXT,
ADD COLUMN loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN loyalty_points_redeemed INTEGER DEFAULT 0;

-- Create trigger for updated_at on customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on customer_discounts
CREATE TRIGGER update_customer_discounts_updated_at
  BEFORE UPDATE ON public.customer_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Admins and Managers can view customers"
  ON public.customers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Salesmen can view customers"
  ON public.customers
  FOR SELECT
  USING (has_role(auth.uid(), 'salesman'::app_role));

CREATE POLICY "Admins and Managers can insert customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and Managers can update customers"
  ON public.customers
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete customers"
  ON public.customers
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on customer_discounts table
ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_discounts
CREATE POLICY "Admins and Managers can view customer discounts"
  ON public.customer_discounts
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Salesmen can view customer discounts"
  ON public.customer_discounts
  FOR SELECT
  USING (has_role(auth.uid(), 'salesman'::app_role));

CREATE POLICY "Admins and Managers can insert customer discounts"
  ON public.customer_discounts
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and Managers can update customer discounts"
  ON public.customer_discounts
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete customer discounts"
  ON public.customer_discounts
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customer_discounts_customer_id ON public.customer_discounts(customer_id);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);