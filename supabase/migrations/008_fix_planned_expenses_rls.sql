-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Recreate planned_expenses, plan_members, and savings tables
-- Run this COMPLETELY in the Supabase SQL Editor (copy-paste all at once).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Create tables if they do not exist (repair schema deletion)
-- ═══════════════════════════════════════════════════════════════════════════

-- Table: planned_expenses
CREATE TABLE IF NOT EXISTS public.planned_expenses (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description        text NOT NULL,
  amount             numeric(12, 2) NOT NULL,
  date               date NOT NULL,
  modules            jsonb DEFAULT '[]'::jsonb,
  deadline_date      date,
  event_date         date,
  collaborators      jsonb DEFAULT '[]'::jsonb,
  collaboration_mode text NOT NULL DEFAULT 'percent' CHECK (collaboration_mode IN ('percent', 'module')),
  created_at         timestamptz DEFAULT now()
);

-- Ensure collaboration_mode exists and has the correct constraint if table already existed
ALTER TABLE public.planned_expenses ADD COLUMN IF NOT EXISTS collaboration_mode text NOT NULL DEFAULT 'percent';
ALTER TABLE public.planned_expenses DROP CONSTRAINT IF EXISTS planned_expenses_collaboration_mode_check;
ALTER TABLE public.planned_expenses ADD CONSTRAINT planned_expenses_collaboration_mode_check CHECK (collaboration_mode IN ('percent', 'module'));

-- Table: plan_members
CREATE TABLE IF NOT EXISTS public.plan_members (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id      bigint NOT NULL REFERENCES public.planned_expenses(id) ON DELETE CASCADE,
  invited_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  member_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role         text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz DEFAULT now()
);

-- Ensure status constraint is updated if table already existed
ALTER TABLE public.plan_members DROP CONSTRAINT IF EXISTS plan_members_status_check;
ALTER TABLE public.plan_members ADD CONSTRAINT plan_members_status_check CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planned_expenses_user   ON public.planned_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_plan_id      ON public.plan_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_member_id    ON public.plan_members(member_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_member_email ON public.plan_members(member_email);

-- Enable RLS
ALTER TABLE public.planned_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Helper function: checks membership bypassing plan_members RLS (prevents recursion)
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
-- 3. Recreate planned_expenses RLS policies
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

-- SELECT: Owner can see, OR any user invited whose status is NOT rejected (includes pending and accepted)
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
          OR pm.member_email = (auth.jwt() ->> 'email')
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
-- 4. Recreate plan_members RLS policies
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "plan_members: owner manage"            ON public.plan_members;
DROP POLICY IF EXISTS "plan_members: member read"             ON public.plan_members;
DROP POLICY IF EXISTS "plan_members: member read and respond" ON public.plan_members;
DROP POLICY IF EXISTS "plan_members: owner insert"            ON public.plan_members;
DROP POLICY IF EXISTS "pm_owner_select"                        ON public.plan_members;
DROP POLICY IF EXISTS "pm_member_select"                       ON public.plan_members;
DROP POLICY IF EXISTS "pm_owner_insert"                        ON public.plan_members;
DROP POLICY IF EXISTS "pm_member_update"                       ON public.plan_members;
DROP POLICY IF EXISTS "pm_owner_delete"                        ON public.plan_members;

-- The person who invited can see all rows they created
CREATE POLICY "pm_owner_select"
  ON public.plan_members FOR SELECT
  USING (invited_by = auth.uid());

-- The invited person can see their own invitation (by member_id or by email)
CREATE POLICY "pm_member_select"
  ON public.plan_members FOR SELECT
  USING (
    member_id = auth.uid()
    OR member_email = (auth.jwt() ->> 'email')
  );

-- Only the plan owner (invited_by) can INSERT (invite someone)
CREATE POLICY "pm_owner_insert"
  ON public.plan_members FOR INSERT
  WITH CHECK (invited_by = auth.uid());

-- The invited member can accept/reject (UPDATE status field)
-- The owner can also update (e.g., change role)
CREATE POLICY "pm_member_update"
  ON public.plan_members FOR UPDATE
  USING (
    member_id = auth.uid()
    OR member_email = (auth.jwt() ->> 'email')
    OR invited_by = auth.uid()
  );

-- Only the owner can remove a collaborator
CREATE POLICY "pm_owner_delete"
  ON public.plan_members FOR DELETE
  USING (invited_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Ensure Ahorro (Savings) Tables and Policies are created
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
