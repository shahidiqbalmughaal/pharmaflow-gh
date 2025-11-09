-- Create expense categories enum
CREATE TYPE expense_category AS ENUM (
  'supplier_payment',
  'staff_salary',
  'food_expense',
  'miscellaneous',
  'rent',
  'water_bill',
  'electricity_bill',
  'maintenance',
  'medical_equipment',
  'license_fees',
  'insurance',
  'marketing',
  'transportation'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category expense_category NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Admins and Managers can view expenses"
  ON public.expenses
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and Managers can insert expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and Managers can update expenses"
  ON public.expenses
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete expenses"
  ON public.expenses
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create expense alerts table for bill due dates
CREATE TABLE public.expense_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category expense_category NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval INTEGER, -- in days
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for expense alerts
ALTER TABLE public.expense_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense alerts
CREATE POLICY "Admins can manage expense alerts"
  ON public.expense_alerts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view expense alerts"
  ON public.expense_alerts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updating updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_alerts_updated_at
  BEFORE UPDATE ON public.expense_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expense_alerts_due_date ON public.expense_alerts(due_date);
CREATE INDEX idx_expense_alerts_is_paid ON public.expense_alerts(is_paid) WHERE is_paid = false;