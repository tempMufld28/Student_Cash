-- Student-Cash: initial schema
-- Supabase Auth handles users; we only store profile data + domain tables.

-- Profiles (one per auth.users row, created via trigger)
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  gender     text,
  avatar     text,
  created_at timestamptz DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('Gasto', 'Ingreso')),
  description text NOT NULL,
  amount      numeric(12, 2) NOT NULL,
  category    text NOT NULL,
  date        date NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Planned expenses
CREATE TABLE public.planned_expenses (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   text NOT NULL,
  amount        numeric(12, 2) NOT NULL,
  date          date NOT NULL,
  modules       jsonb DEFAULT '[]'::jsonb,
  deadline_date date,
  event_date    date,
  collaborators jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_user_date  ON public.transactions(user_id, date DESC);
CREATE INDEX idx_planned_expenses_user   ON public.planned_expenses(user_id);

-- Row Level Security
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_expenses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Transactions policies
CREATE POLICY "own transactions select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own transactions insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own transactions delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Planned expenses policies
CREATE POLICY "own planned select" ON public.planned_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own planned insert" ON public.planned_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own planned update" ON public.planned_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own planned delete" ON public.planned_expenses FOR DELETE USING (auth.uid() = user_id);

-- Trigger: create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: client-side account deletion (cascades to all tables via FK)
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
