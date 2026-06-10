-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Recreate planned_expenses RLS and savings tables/policies
-- Run this COMPLETELY in the Supabase SQL Editor (copy-paste all at once).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Helper function: checks membership bypassing plan_members RLS (prevents recursion)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id
      AND member_id = auth.uid()
      AND status = 'accepted'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_plan_member(bigint) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Drop existing planned_expenses policies to prevent duplicates/conflicts
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "own planned select"                        ON public.planned_expenses;
DROP POLICY IF EXISTS "own planned insert"                        ON public.planned_expenses;
DROP POLICY IF EXISTS "own planned update"                        ON public.planned_expenses;
DROP POLICY IF EXISTS "own planned delete"                        ON public.planned_expenses;
DROP POLICY IF EXISTS "planned_expenses: owner or member select" ON public.planned_expenses;
DROP POLICY IF EXISTS "planned_expenses: owner or editor update" ON public.planned_expenses;
DROP POLICY IF EXISTS "pe_select_owner_or_member"                ON public.planned_expenses;
DROP POLICY IF EXISTS "pe_insert_owner"                           ON public.planned_expenses;
DROP POLICY IF EXISTS "pe_update_owner_or_member"                ON public.planned_expenses;
DROP POLICY IF EXISTS "pe_delete_owner"                           ON public.planned_expenses;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Recreate planned_expenses RLS policies
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.planned_expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner can see, OR any user invited whose status is NOT rejected (includes pending and accepted)
-- This allows users with pending invitations to view the plan description/amount!
CREATE POLICY "pe_select_owner_or_member"
  ON public.planned_expenses FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = id
        AND pm.status != 'rejected'
        AND (
          pm.member_id = auth.uid()
          OR pm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- INSERT: Only the owner can insert their own plans
CREATE POLICY "pe_insert_owner"
  ON public.planned_expenses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Owner or accepted member can update
CREATE POLICY "pe_update_owner_or_member"
  ON public.planned_expenses FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_plan_member(id)
  );

-- DELETE: Only the owner can delete
CREATE POLICY "pe_delete_owner"
  ON public.planned_expenses FOR DELETE
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Ensure Ahorro (Savings) Tables and Policies are created
-- ═══════════════════════════════════════════════════════════════════════════

-- Plan savings records (Alcancía para planes compartidos)
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

DROP POLICY IF EXISTS "plan_savings: member insert own" ON public.plan_savings_records;
CREATE POLICY "plan_savings: member insert own"
  ON public.plan_savings_records FOR INSERT
  WITH CHECK (member_id = auth.uid());


-- Personal savings goals (Metas de Ahorro Personales)
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


-- Personal savings records (Aportaciones a Ahorros Personales)
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
