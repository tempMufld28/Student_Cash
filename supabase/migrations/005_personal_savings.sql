-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Personal Savings Goals & Records (Idempotent version)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.personal_savings_goals (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text   NOT NULL,
  target_amount numeric(12, 2) NOT NULL CHECK (target_amount > 0),
  deadline      date,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_savings_user ON public.personal_savings_goals(user_id);
ALTER TABLE public.personal_savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_savings: user owns" ON public.personal_savings_goals;
CREATE POLICY "personal_savings: user owns"
  ON public.personal_savings_goals FOR ALL
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.personal_savings_records (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id     bigint NOT NULL REFERENCES public.personal_savings_goals(id) ON DELETE CASCADE,
  user_id     uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  note        text,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_records_goal ON public.personal_savings_records(goal_id);
ALTER TABLE public.personal_savings_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_savings_records: user owns" ON public.personal_savings_records;
CREATE POLICY "personal_savings_records: user owns"
  ON public.personal_savings_records FOR ALL
  USING (user_id = auth.uid());
