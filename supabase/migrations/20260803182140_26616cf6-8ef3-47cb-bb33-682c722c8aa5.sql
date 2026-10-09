CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  farm_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TYPE public.sheep_sex AS ENUM ('ewe','ram','wether');
CREATE TYPE public.sheep_status AS ENUM ('active','sold','deceased','culled');
CREATE TYPE public.health_type AS ENUM ('vaccination','drench','treatment','illness','shearing','other');
CREATE TYPE public.breeding_type AS ENUM ('mating','scan','lambing');

CREATE TABLE public.sheep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_number text NOT NULL,
  name text,
  breed text,
  sex public.sheep_sex NOT NULL DEFAULT 'ewe',
  birth_date date,
  colour text,
  status public.sheep_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheep TO authenticated;
GRANT ALL ON public.sheep TO service_role;
ALTER TABLE public.sheep ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sheep" ON public.sheep FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weight_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  recorded_on date NOT NULL DEFAULT current_date,
  weight_kg numeric(6,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_records TO authenticated;
GRANT ALL ON public.weight_records TO service_role;
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.weight_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  recorded_on date NOT NULL DEFAULT current_date,
  event_type public.health_type NOT NULL DEFAULT 'treatment',
  product text,
  dose text,
  withdrawal_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health" ON public.health_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.breeding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  recorded_on date NOT NULL DEFAULT current_date,
  event_type public.breeding_type NOT NULL DEFAULT 'mating',
  ram_tag text,
  lambs_born integer,
  lambs_alive integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breeding_records TO authenticated;
GRANT ALL ON public.breeding_records TO service_role;
ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own breeding" ON public.breeding_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON public.weight_records (sheep_id, recorded_on DESC);
CREATE INDEX ON public.health_records (sheep_id, recorded_on DESC);
CREATE INDEX ON public.breeding_records (sheep_id, recorded_on DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sheep_updated_at BEFORE UPDATE ON public.sheep FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, farm_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'farm_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();