-- Add returns tracking to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS return_status text DEFAULT 'none' CHECK (return_status IN ('none', 'partial', 'full')),
ADD COLUMN IF NOT EXISTS return_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS return_reason text,
ADD COLUMN IF NOT EXISTS return_processed_by text;

-- Add returns tracking to sale_items table
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS return_status text DEFAULT 'none' CHECK (return_status IN ('none', 'returned', 'replaced')),
ADD COLUMN IF NOT EXISTS return_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS return_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_fridge_item boolean DEFAULT false;

-- Create returns history table for audit trail
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  return_type text NOT NULL CHECK (return_type IN ('return', 'replace')),
  quantity integer NOT NULL,
  refund_amount numeric NOT NULL DEFAULT 0,
  reason text,
  processed_by text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on returns table
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns table - only admin and manager can view/process returns
CREATE POLICY "Admins and managers can view returns"
  ON public.returns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can insert returns"
  ON public.returns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Only admins can delete returns"
  ON public.returns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON public.returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_processed_at ON public.returns(processed_at DESC);