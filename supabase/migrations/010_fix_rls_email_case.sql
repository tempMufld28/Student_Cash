-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Fix RLS Case-Insensitive Email Comparisons
-- Ensures that collaborator email checks are case-insensitive on both sides
-- to prevent case mismatches from blocking access to plans.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Recreate helper function is_plan_member with case-insensitive email fallback
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
      AND (
        member_id = auth.uid()
        OR LOWER(member_email) = LOWER(auth.jwt() ->> 'email')
      )
      AND status = 'accepted'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_plan_member(bigint) TO authenticated;

-- 2. Update planned_expenses SELECT policy
DROP POLICY IF EXISTS "pe_select_owner_or_member" ON public.planned_expenses;
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
          OR LOWER(pm.member_email) = LOWER(auth.jwt() ->> 'email')
        )
    )
  );

-- 3. Update plan_members SELECT policy
DROP POLICY IF EXISTS "pm_member_select" ON public.plan_members;
CREATE POLICY "pm_member_select"
  ON public.plan_members FOR SELECT
  USING (
    member_id = auth.uid()
    OR LOWER(member_email) = LOWER(auth.jwt() ->> 'email')
  );

-- 4. Update plan_members UPDATE policy
DROP POLICY IF EXISTS "pm_member_update" ON public.plan_members;
CREATE POLICY "pm_member_update"
  ON public.plan_members FOR UPDATE
  USING (
    member_id = auth.uid()
    OR LOWER(member_email) = LOWER(auth.jwt() ->> 'email')
    OR invited_by = auth.uid()
  );
