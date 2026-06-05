-- ============================================================
-- WrapBridge - Profile role hardening
-- Run this in Supabase SQL Editor after existing RLS migrations.
-- ============================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Users may create only their own customer/company profile row if the auth
-- trigger has not already created it. Admin roles must be assigned manually
-- from trusted SQL or service-role code.
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own signup profile" ON public.profiles;
CREATE POLICY "Users can insert own signup profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role IN ('customer', 'company')
  );

-- Users can edit their own profile details, but role changes are blocked by
-- the trigger below. Admins keep elevated profile-management access.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own non-role profile" ON public.profiles;
CREATE POLICY "Users can update own non-role profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_client_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'Profile role cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_client_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_profile_role_change();
