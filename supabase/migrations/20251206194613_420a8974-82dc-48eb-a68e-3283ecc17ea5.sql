-- Security Fix: Update handle_new_user trigger to always assign 'salesman' role
-- This prevents privilege escalation via role metadata manipulation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- SECURITY FIX: Always assign 'salesman' role by default
  -- Role metadata from client is intentionally ignored to prevent privilege escalation
  -- Role changes must be done by admin through User Management
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'salesman');
  
  RETURN NEW;
END;
$$;