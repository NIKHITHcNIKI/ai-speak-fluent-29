
-- Drop policies that depend on public.has_role so the function can be removed
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;

-- Re-create policies without calling has_role.
-- Users may only read their own role rows. Admin management happens
-- exclusively through the service_role key from server-side code,
-- which bypasses RLS, so no admin policy is required here.
CREATE POLICY "users read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop the SECURITY DEFINER function entirely so it is no longer
-- executable by anon or authenticated roles.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
