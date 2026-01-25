-- Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pgcrypto extension to extensions schema
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- Create a wrapper function in public schema for backward compatibility
-- This ensures gen_random_uuid() still works in default value expressions
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT extensions.gen_random_uuid()
$$;