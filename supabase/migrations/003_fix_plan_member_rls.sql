-- Fix: nested RLS issue with plan_members check inside planned_expenses policy
-- The EXISTS subquery on plan_members (which has its own RLS) is not evaluated
-- correctly for the collaborator. A SECURITY DEFINER function bypasses that.

-- 1. Helper function: checks membership bypassing plan_members RLS
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

-- 2. Drop and recreate SELECT policy using the helper function
DROP POLICY IF EXISTS "planned_expenses: owner or member select" ON public.planned_expenses;

CREATE POLICY "planned_expenses: owner or member select"
  ON public.planned_expenses
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_plan_member(id)
  );

-- 3. Same fix for UPDATE policy
DROP POLICY IF EXISTS "planned_expenses: owner or editor update" ON public.planned_expenses;

CREATE POLICY "planned_expenses: owner or editor update"
  ON public.planned_expenses
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_plan_member(id)
  );

-- 4. Email search function for autocomplete (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.search_users_by_email(query text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM auth.users u
  WHERE u.email ILIKE query || '%'
    AND u.email != (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 6;
$$;
