-- Drop the api_settings table as API credentials are now stored in Lovable Cloud secrets
DROP TABLE IF EXISTS public.api_settings;