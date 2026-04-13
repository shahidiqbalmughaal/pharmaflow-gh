
-- Create narcotics_register table
CREATE TABLE public.narcotics_register (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL,
  sale_item_id uuid NOT NULL,
  item_id uuid NOT NULL,
  drug_name text NOT NULL,
  batch_no text NOT NULL,
  supplier_name text NOT NULL DEFAULT '',
  patient_name text NOT NULL,
  prescribed_by text NOT NULL DEFAULT '',
  quantity_sold integer NOT NULL,
  quantity_remaining integer NOT NULL DEFAULT 0,
  remarks text NOT NULL DEFAULT 'Sold',
  sale_date timestamp with time zone NOT NULL DEFAULT now(),
  serial_no serial NOT NULL,
  print_status text NOT NULL DEFAULT 'pending',
  shop_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.narcotics_register ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_narcotics_register_shop_id ON public.narcotics_register (shop_id);
CREATE INDEX idx_narcotics_register_print_status ON public.narcotics_register (print_status);
CREATE INDEX idx_narcotics_register_drug_name ON public.narcotics_register (drug_name);
CREATE INDEX idx_narcotics_register_sale_id ON public.narcotics_register (sale_id);

-- RLS policies
CREATE POLICY "Shop staff can view narcotics register"
  ON public.narcotics_register FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop staff can insert narcotics register"
  ON public.narcotics_register FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop owners and managers can update narcotics register"
  ON public.narcotics_register FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) = ANY(ARRAY['owner','manager'])));

CREATE POLICY "Shop owners can delete narcotics register"
  ON public.narcotics_register FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR (shop_id = get_user_shop_id(auth.uid()) AND get_shop_role(auth.uid(), shop_id) = 'owner'));
