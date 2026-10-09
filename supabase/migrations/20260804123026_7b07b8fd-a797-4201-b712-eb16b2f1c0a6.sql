CREATE TABLE public.herds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  colour text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.herds TO authenticated;
GRANT ALL ON public.herds TO service_role;
ALTER TABLE public.herds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own herds" ON public.herds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER herds_updated_at BEFORE UPDATE ON public.herds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sheep ADD COLUMN herd_id uuid REFERENCES public.herds(id) ON DELETE SET NULL;
CREATE INDEX sheep_herd_id_idx ON public.sheep(herd_id);

CREATE TABLE public.grazing_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  herd_id uuid NOT NULL REFERENCES public.herds(id) ON DELETE CASCADE,
  paddock text NOT NULL,
  moved_in_on date NOT NULL DEFAULT CURRENT_DATE,
  moved_out_on date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grazing_records TO authenticated;
GRANT ALL ON public.grazing_records TO service_role;
ALTER TABLE public.grazing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own grazing" ON public.grazing_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX grazing_records_herd_idx ON public.grazing_records(herd_id, moved_in_on DESC);
CREATE TRIGGER grazing_records_updated_at BEFORE UPDATE ON public.grazing_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();