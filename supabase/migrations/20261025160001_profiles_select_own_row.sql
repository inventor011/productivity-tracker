DROP POLICY "Users can read any profile" ON public.profiles;

CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
