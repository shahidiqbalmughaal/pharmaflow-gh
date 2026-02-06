-- Attempt to fix linter WARN (Extension in Public) for pg_net
-- pg_net is not relocatable, so we must reinstall it in the desired schema.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    DROP EXTENSION pg_net;
  END IF;
END $$;

CREATE EXTENSION pg_net WITH SCHEMA extensions;
