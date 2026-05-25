-- ============================================================
-- WrapBridge — Security hardening before production launch
-- Run this in Supabase SQL Editor after existing migrations.
-- ============================================================

-- Do not trust client-provided signup roles. Public signup may only create
-- customer or company profiles; admins must be promoted manually in SQL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('customer', 'company') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'customer'
    END,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Lock helper functions to the intended schema search path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.email_exists(email_address text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = email_address);
$$;