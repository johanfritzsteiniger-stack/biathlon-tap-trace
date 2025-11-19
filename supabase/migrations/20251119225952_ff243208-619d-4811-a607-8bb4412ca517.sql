-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Athletes can read own credentials" ON public.user_credentials;

-- Create new policies that allow inserting credentials
CREATE POLICY "Admins can manage all credentials"
ON public.user_credentials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_credentials uc
    WHERE uc.id::text = (auth.jwt() ->> 'sub')
    AND uc.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_credentials uc
    WHERE uc.id::text = (auth.jwt() ->> 'sub')
    AND uc.role = 'admin'
  )
);

CREATE POLICY "Athletes can read own credentials"
ON public.user_credentials
FOR SELECT
TO authenticated
USING (
  id::text = (auth.jwt() ->> 'sub')
  OR EXISTS (
    SELECT 1 FROM user_credentials uc
    WHERE uc.id::text = (auth.jwt() ->> 'sub')
    AND uc.role = 'admin'
  )
);