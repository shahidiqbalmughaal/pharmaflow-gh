-- Fix the wrapper function to have immutable search_path
DROP FUNCTION IF EXISTS public.gen_random_uuid();

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT extensions.gen_random_uuid()
$$;