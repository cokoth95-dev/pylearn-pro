-- Give administrators a narrow, role-checked way to read learner account details.
-- Profile email, phone, and location columns were removed by migration 002; auth.users
-- owns the current email address, while age is only available through this function.
CREATE OR REPLACE FUNCTION public.admin_list_people()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  age smallint,
  xp integer,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.full_name,
    COALESCE(auth_user.email, ''),
    profile.age,
    profile.xp,
    profile.role::text,
    profile.created_at
  FROM public.profiles AS profile
  LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id
  ORDER BY profile.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_people() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_people() TO authenticated;
