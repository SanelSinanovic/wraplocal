-- ============================================================
-- WrapBridge — Admin RLS Policies
-- Run this in: Supabase → SQL Editor → New query → Run
--
-- Prerequisite: set one user's profile role to 'admin':
--   UPDATE profiles SET role = 'admin' WHERE id = '<YOUR_USER_UUID>';
-- ============================================================

-- Helper: check if the current user is an admin
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── PROFILES — admin can read ALL profiles ───────────────
drop policy if exists "Admin can read all profiles" on profiles;
create policy "Admin can read all profiles"
  on profiles for select
  using (is_admin());

-- ── BOOKINGS — admin can read ALL bookings ───────────────
drop policy if exists "Admin can read all bookings" on bookings;
create policy "Admin can read all bookings"
  on bookings for select
  using (is_admin());

-- ── SHOPS — admin can update ANY shop (e.g. toggle listing) ──
drop policy if exists "Admin can update any shop" on shops;
create policy "Admin can update any shop"
  on shops for update
  using (is_admin());

-- ── REVIEWS — admin can read ALL reviews ─────────────────
drop policy if exists "Admin can read all reviews" on reviews;
create policy "Admin can read all reviews"
  on reviews for select
  using (is_admin());

-- ── MESSAGES — admin can read ALL messages ───────────────
drop policy if exists "Admin can read all messages" on messages;
create policy "Admin can read all messages"
  on messages for select
  using (is_admin());
