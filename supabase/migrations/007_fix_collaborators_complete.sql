-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Fix collaborators — clean RLS, normalize functions, add trigger
-- Run this COMPLETELY in the Supabase SQL Editor (copy-paste all at once).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DROP ALL existing plan_members policies (clean slate)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Recreate clean, explicit RLS policies for plan_members
-- ═══════════════════════════════════════════════════════════════════════════

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
-- 3. Recreate get_user_id_by_email with LOWER() normalization
--    Returns NULL if not found (caller must check)
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.get_user_id_by_email(lookup_email text);
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER(lookup_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Recreate search_users_by_email with LOWER() normalization
--    Returns email, name, avatar for autocomplete
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.search_users_by_email(query text);
CREATE OR REPLACE FUNCTION public.search_users_by_email(query text)
RETURNS TABLE(email text, name text, avatar text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, COALESCE(p.name, '') AS name, COALESCE(p.avatar, '') AS avatar
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(u.email) ILIKE '%' || LOWER(query) || '%'
    AND u.id != auth.uid()
  ORDER BY u.email
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_by_email(text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Trigger: auto-assign member_id when a new user registers
--    Links pending invitations sent to their email before they had an account
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assign_member_id_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.plan_members
  SET member_id = NEW.id
  WHERE LOWER(member_email) = LOWER(NEW.email)
    AND member_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_member_id ON auth.users;

CREATE TRIGGER trg_assign_member_id
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_id_on_signup();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Backfill: fix any existing plan_members rows where member_id is NULL
--    but the user now exists in auth.users
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE public.plan_members pm
SET member_id = u.id
FROM auth.users u
WHERE LOWER(pm.member_email) = LOWER(u.email)
  AND pm.member_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Verify — run these SELECTs to confirm the setup
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'plan_members' ORDER BY cmd;
-- SELECT proname FROM pg_proc WHERE proname IN ('get_user_id_by_email', 'search_users_by_email');
-- SELECT * FROM public.plan_members LIMIT 10;
