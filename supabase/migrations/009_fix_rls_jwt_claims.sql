-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Fix RLS JWT Claims (Force update policies in Production)
-- This migration drops and recreates the policies to ensure they use
-- auth.jwt() ->> 'email' instead of querying auth.users.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update planned_expenses SELECT policy
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
          OR pm.member_email = (auth.jwt() ->> 'email')
        )
    )
  );

-- 2. Update plan_members SELECT policy
DROP POLICY IF EXISTS "pm_member_select" ON public.plan_members;
CREATE POLICY "pm_member_select"
  ON public.plan_members FOR SELECT
  USING (
    member_id = auth.uid()
    OR member_email = (auth.jwt() ->> 'email')
  );

-- 3. Update plan_members UPDATE policy
DROP POLICY IF EXISTS "pm_member_update" ON public.plan_members;
CREATE POLICY "pm_member_update"
  ON public.plan_members FOR UPDATE
  USING (
    member_id = auth.uid()
    OR member_email = (auth.jwt() ->> 'email')
    OR invited_by = auth.uid()
  );
