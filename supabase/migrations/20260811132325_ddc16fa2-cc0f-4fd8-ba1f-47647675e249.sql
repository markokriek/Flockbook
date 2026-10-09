CREATE TYPE public.death_cause AS ENUM ('illness','predation','accident','lambing','age','unknown','other');
CREATE TYPE public.sale_type AS ENUM ('private','auction','abattoir','breeding_stock','other');

CREATE TABLE public.death_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  died_on date NOT NULL DEFAULT CURRENT_DATE,
  cause public.death_cause NOT NULL DEFAULT 'unknown',
  details text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.death_records TO authenticated;
GRANT ALL ON public.death_records TO service_role;
ALTER TABLE public.death_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deaths" ON public.death_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER death_records_updated_at BEFORE UPDATE ON public.death_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sale_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  sold_on date NOT NULL DEFAULT CURRENT_DATE,
  buyer text,
  price numeric,
  sale_type public.sale_type NOT NULL DEFAULT 'private',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_records TO authenticated;
GRANT ALL ON public.sale_records TO service_role;
ALTER TABLE public.sale_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales" ON public.sale_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER sale_records_updated_at BEFORE UPDATE ON public.sale_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sheep
  ADD COLUMN dam_id uuid REFERENCES public.sheep(id) ON DELETE SET NULL,
  ADD COLUMN sire_id uuid REFERENCES public.sheep(id) ON DELETE SET NULL;
CREATE INDEX idx_sheep_dam_id ON public.sheep(dam_id);
CREATE INDEX idx_sheep_sire_id ON public.sheep(sire_id);
CREATE INDEX idx_death_records_sheep ON public.death_records(sheep_id);
CREATE INDEX idx_sale_records_sheep ON public.sale_records(sheep_id);