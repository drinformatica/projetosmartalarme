DROP POLICY IF EXISTS "authenticated read ads" ON public.ads;
CREATE POLICY "authenticated read active ads" ON public.ads FOR SELECT TO authenticated USING (active = true);