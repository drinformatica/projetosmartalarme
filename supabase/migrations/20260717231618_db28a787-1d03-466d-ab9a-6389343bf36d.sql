
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read ads" ON public.ads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage ads" ON public.ads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ads_set_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage policies for ads bucket
CREATE POLICY "ads public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'ads');

CREATE POLICY "ads admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ads' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "ads admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ads' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "ads admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ads' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')));
