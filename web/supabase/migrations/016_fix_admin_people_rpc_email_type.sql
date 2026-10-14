-- Match auth.users.email's varchar type to the RPC's declared text output.
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
    COALESCE(auth_user.email, '')::text,
    profile.age,
    profile.xp,
    profile.role::text,
    profile.created_at
  FROM public.profiles AS profile
  LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id
  ORDER BY profile.full_name;
END;
$$;
