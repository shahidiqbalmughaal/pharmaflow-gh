-- Add selling type and packet-related fields to medicines table
ALTER TABLE public.medicines
ADD COLUMN selling_type text NOT NULL DEFAULT 'per_tablet' CHECK (selling_type IN ('per_tablet', 'per_packet')),
ADD COLUMN tablets_per_packet integer DEFAULT 1,
ADD COLUMN price_per_packet numeric;

-- Add packet-related fields to sale_items table
ALTER TABLE public.sale_items
ADD COLUMN tablets_per_packet integer DEFAULT 1,
ADD COLUMN total_tablets integer,
ADD COLUMN total_packets numeric DEFAULT 0;

-- Update sales table to clarify discount is percentage
ALTER TABLE public.sales
ADD COLUMN discount_percentage numeric DEFAULT 0;

-- Update existing sales to migrate discount to discount_percentage
UPDATE public.sales SET discount_percentage = discount WHERE discount > 0;

COMMENT ON COLUMN public.medicines.selling_type IS 'Defines if medicine is sold per tablet or per packet';
COMMENT ON COLUMN public.medicines.tablets_per_packet IS 'Number of tablets in one packet (for per_packet selling type)';
COMMENT ON COLUMN public.medicines.price_per_packet IS 'Price per packet (used when selling_type is per_packet)';
COMMENT ON COLUMN public.sale_items.tablets_per_packet IS 'Tablets per packet at time of sale';
COMMENT ON COLUMN public.sale_items.total_tablets IS 'Total number of tablets sold';
COMMENT ON COLUMN public.sale_items.total_packets IS 'Total number of packets sold';
COMMENT ON COLUMN public.sales.discount_percentage IS 'Discount applied as percentage';