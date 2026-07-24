CREATE OR REPLACE FUNCTION public.cpf_cnpj_exists(_cnpj text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE regexp_replace(COALESCE(cnpj, ''), '\D', '', 'g')
        = regexp_replace(COALESCE(_cnpj, ''), '\D', '', 'g')
      AND regexp_replace(COALESCE(_cnpj, ''), '\D', '', 'g') <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.cpf_cnpj_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cpf_cnpj_exists(text) TO anon, authenticated;