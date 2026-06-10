-- Migration 006: Ensure RPC functions for collaborator search exist
-- Run this in the Supabase SQL Editor if the autocomplete or adding collaborators doesn't work.

-- 1. Function to look up a user ID by email (used when adding a collaborator)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$;

-- 2. Function to search users by email with autocomplete (returns name + email)
--    Excludes the current user from results. Uses ILIKE for case-insensitive partial match.
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
    AND u.email != (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
  LIMIT 8;
$$;

-- 3. Ensure the profiles table has an email column (for reference/convenience)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 4. Sync existing profile emails from auth.users (one-time backfill)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 5. Grant execute on the RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(text) TO authenticated;

-- 6. Ensure plan_members INSERT policy works correctly for plan owners
-- The existing "plan_members: owner manage" policy uses USING(invited_by = auth.uid())
-- which covers INSERT via implicit WITH CHECK. This should work, but let's add an
-- explicit INSERT policy for clarity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plan_members'
    AND policyname = 'plan_members: owner insert'
  ) THEN
    CREATE POLICY "plan_members: owner insert"
      ON public.plan_members
      FOR INSERT
      WITH CHECK (invited_by = auth.uid());
  END IF;
END $$;
