CREATE TABLE public.grazing_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  herd_id uuid NOT NULL REFERENCES public.herds(id) ON DELETE CASCADE,
  target_paddock text,
  due_on date NOT NULL,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grazing_reminders TO authenticated;
GRANT ALL ON public.grazing_reminders TO service_role;

ALTER TABLE public.grazing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own grazing reminders" ON public.grazing_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER grazing_reminders_updated_at
  BEFORE UPDATE ON public.grazing_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX grazing_reminders_user_due_idx ON public.grazing_reminders (user_id, due_on);