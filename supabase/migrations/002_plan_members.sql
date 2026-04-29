-- Feature 4: Plan sharing via plan_members table
-- Run this migration in Supabase SQL Editor

-- 1. Nueva tabla plan_members
CREATE TABLE public.plan_members (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id      bigint NOT NULL REFERENCES public.planned_expenses(id) ON DELETE CASCADE,
  invited_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  member_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role         text NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('owner', 'editor')),
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_plan_members_plan_id      ON public.plan_members(plan_id);
CREATE INDEX idx_plan_members_member_id    ON public.plan_members(member_id);
CREATE INDEX idx_plan_members_member_email ON public.plan_members(member_email);

-- RLS
ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_members: owner manage"
  ON public.plan_members
  FOR ALL
  USING (invited_by = auth.uid());

CREATE POLICY "plan_members: member read"
  ON public.plan_members
  FOR SELECT
  USING (member_id = auth.uid());

-- 2. Modificar RLS de planned_expenses para SELECT
DROP POLICY IF EXISTS "own planned select" ON public.planned_expenses;

CREATE POLICY "planned_expenses: owner or member select"
  ON public.planned_expenses
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = id
        AND pm.member_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- 3. Modificar RLS de planned_expenses para UPDATE
DROP POLICY IF EXISTS "own planned update" ON public.planned_expenses;

CREATE POLICY "planned_expenses: owner or editor update"
  ON public.planned_expenses
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = id
        AND pm.member_id = auth.uid()
        AND pm.role = 'editor'
        AND pm.status = 'accepted'
    )
  );

-- 4. Función RPC para buscar user_id por email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$;
