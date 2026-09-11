ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS segmento text NOT NULL DEFAULT '';

ALTER TABLE public.products
ALTER COLUMN segmento SET NOT NULL,
ALTER COLUMN segmento SET DEFAULT '',
ALTER COLUMN codigo SET NOT NULL,
ALTER COLUMN nome SET NOT NULL,
ALTER COLUMN psd SET NOT NULL,
ALTER COLUMN descricao_orcamento SET NOT NULL,
ALTER COLUMN descricao_proposta SET NOT NULL,
ALTER COLUMN no_cnae_discount SET NOT NULL,
ALTER COLUMN no_cnae_discount SET DEFAULT true;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_psd_nonnegative;

ALTER TABLE public.products
ADD CONSTRAINT products_psd_nonnegative CHECK (psd >= 0) NOT VALID;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
