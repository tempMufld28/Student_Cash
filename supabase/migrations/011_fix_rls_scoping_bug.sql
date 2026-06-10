-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Fix RLS Scoping Bug in planned_expenses
-- Qualifies the "id" column in the subquery of the SELECT policy to resolve
-- name ambiguity with "plan_members.id", allowing collaborators to see plans.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pe_select_owner_or_member" ON public.planned_expenses;

CREATE POLICY "pe_select_owner_or_member"
  ON public.planned_expenses FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = public.planned_expenses.id
        AND pm.status != 'rejected'
        AND (
          pm.member_id = auth.uid()
          OR LOWER(pm.member_email) = LOWER(auth.jwt() ->> 'email')
        )
    )
  );
