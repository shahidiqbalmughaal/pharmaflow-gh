-- Add Order Booker contact fields to suppliers
ALTER TABLE public.suppliers
ADD COLUMN order_booker_name text NULL,
ADD COLUMN order_booker_phone text NULL,
ADD COLUMN order_booker_whatsapp text NULL;

-- Add Delivery Person contact fields to suppliers
ALTER TABLE public.suppliers
ADD COLUMN delivery_person_name text NULL,
ADD COLUMN delivery_person_phone text NULL,
ADD COLUMN delivery_person_whatsapp text NULL;