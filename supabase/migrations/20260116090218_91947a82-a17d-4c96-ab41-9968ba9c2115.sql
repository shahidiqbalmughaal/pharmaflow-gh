-- Update RLS policies for returns table to allow all authenticated users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins and managers can view returns" ON public.returns;
DROP POLICY IF EXISTS "Admins and managers can insert returns" ON public.returns;

-- Create new policies for all authenticated users
CREATE POLICY "Authenticated users can view returns"
  ON public.returns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert returns"
  ON public.returns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);