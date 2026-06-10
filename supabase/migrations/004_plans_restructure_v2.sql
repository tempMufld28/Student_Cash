-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Plans restructure v2 (Idempotent version)
--   1. Add collaboration_mode to planned_expenses
--   2. Add plan_savings_records table (Alcancía)
--   3. Allow 'rejected' in plan_members.status
--   4. Add policy for member to update own invitation (accept/reject)
--   5. Update search_users_by_email to return name + avatar
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add collaboration_mode column to planned_expenses
ALTER TABLE public.planned_expenses
  ADD COLUMN IF NOT EXISTS collaboration_mode text NOT NULL DEFAULT 'percent';

-- Ensure the check constraint is set up safely
ALTER TABLE public.planned_expenses DROP CONSTRAINT IF EXISTS planned_expenses_collaboration_mode_check;
ALTER TABLE public.planned_expenses
  ADD CONSTRAINT planned_expenses_collaboration_mode_check
    CHECK (collaboration_mode IN ('percent', 'module'));

-- 2. Allow 'rejected' in plan_members.status (drop and recreate the constraint)
ALTER TABLE public.plan_members
  DROP CONSTRAINT IF EXISTS plan_members_status_check;

ALTER TABLE public.plan_members
  ADD CONSTRAINT plan_members_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected'));

-- 3. Add policy so invited member can update their own invitation (accept/reject)
DROP POLICY IF EXISTS "plan_members: member read" ON public.plan_members;
DROP POLICY IF EXISTS "plan_members: member read and respond" ON public.plan_members;

CREATE POLICY "plan_members: member read and respond"
  ON public.plan_members
  FOR ALL
  USING (member_id = auth.uid());

-- 4. Nueva tabla plan_savings_records (Alcancía)
CREATE TABLE IF NOT EXISTS public.plan_savings_records (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id     bigint NOT NULL REFERENCES public.planned_expenses(id) ON DELETE CASCADE,
  member_id   uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  note        text,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_savings_plan_id   ON public.plan_savings_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_savings_member_id ON public.plan_savings_records(member_id);

ALTER TABLE public.plan_savings_records ENABLE ROW LEVEL SECURITY;

-- Miembros aceptados pueden ver todos los registros del plan
DROP POLICY IF EXISTS "plan_savings: members read" ON public.plan_savings_records;
CREATE POLICY "plan_savings: members read"
  ON public.plan_savings_records FOR SELECT
  USING (
    public.is_plan_member(plan_id)
    OR EXISTS (
      SELECT 1 FROM public.planned_expenses pe
      WHERE pe.id = plan_id AND pe.user_id = auth.uid()
    )
  );

-- Cada miembro solo puede insertar sus propios registros
DROP POLICY IF EXISTS "plan_savings: member insert own" ON public.plan_savings_records;
CREATE POLICY "plan_savings: member insert own"
  ON public.plan_savings_records FOR INSERT
  WITH CHECK (member_id = auth.uid());

-- 5. Update search_users_by_email RPC to return name and avatar
DROP FUNCTION IF EXISTS public.search_users_by_email(query text);
CREATE OR REPLACE FUNCTION public.search_users_by_email(query text)
RETURNS TABLE(email text, name text, avatar text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, p.name, p.avatar
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email ILIKE '%' || query || '%'
    AND u.email != (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 8;
$$;
