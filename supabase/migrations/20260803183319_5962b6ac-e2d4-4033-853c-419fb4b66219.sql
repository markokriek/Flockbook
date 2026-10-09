CREATE TYPE public.reminder_type AS ENUM ('vaccination', 'deworming', 'checkup', 'other');

CREATE TABLE public.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheep_id uuid NOT NULL REFERENCES public.sheep(id) ON DELETE CASCADE,
  reminder_type public.reminder_type NOT NULL DEFAULT 'vaccination',
  due_on date NOT NULL,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminders" ON public.reminders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX reminders_due_idx ON public.reminders (user_id, due_on);

CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();