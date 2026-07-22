
-- Security definer RPCs so server functions do not need service role key.

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Admin list of users with aggregated stats
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  company_name text,
  phone text,
  cnpj text,
  created_at timestamptz,
  roles app_role[],
  total_quotes bigint,
  total_venda numeric,
  fechados bigint,
  valor_fechado numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.company_name,
    p.phone,
    p.cnpj,
    p.created_at,
    COALESCE((SELECT array_agg(ur.role) FROM public.user_roles ur WHERE ur.user_id = p.id), ARRAY[]::app_role[]),
    COALESCE((SELECT COUNT(*) FROM public.quotes q WHERE q.user_id = p.id), 0),
    COALESCE((SELECT SUM(q.total_venda) FROM public.quotes q WHERE q.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*) FROM public.quotes q WHERE q.user_id = p.id AND q.status = 'fechado'), 0),
    COALESCE((SELECT SUM(q.total_venda) FROM public.quotes q WHERE q.user_id = p.id AND q.status = 'fechado'), 0)
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = _user_id),
    'roles', COALESCE((SELECT array_agg(ur.role) FROM public.user_roles ur WHERE ur.user_id = _user_id), ARRAY[]::app_role[]),
    'quotes', COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM public.quotes q WHERE q.user_id = _user_id), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_user_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super admin pode alterar papeis';
  END IF;

  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, boolean) TO authenticated;
