-- Enable realtime for medicines and cosmetics tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cosmetics;