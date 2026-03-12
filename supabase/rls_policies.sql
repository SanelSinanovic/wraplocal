-- ============================================================
-- WrapLocal — RLS Policies
-- Run this in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ── SHOPS ────────────────────────────────────────────────
-- Anyone (including logged-out customers) can read all shops
drop policy if exists "Public can read shops" on shops;
create policy "Public can read shops"
  on shops for select
  using (true);

-- Only the shop owner can insert their own shop
drop policy if exists "Owner can insert shop" on shops;
create policy "Owner can insert shop"
  on shops for insert
  with check (auth.uid() = owner_id);

-- Only the shop owner can update their own shop
drop policy if exists "Owner can update shop" on shops;
create policy "Owner can update shop"
  on shops for update
  using (auth.uid() = owner_id);

-- ── PORTFOLIO IMAGES ─────────────────────────────────────
drop policy if exists "Public can read portfolio images" on portfolio_images;
create policy "Public can read portfolio images"
  on portfolio_images for select
  using (true);

-- ── SHOP SLOTS ───────────────────────────────────────────
drop policy if exists "Public can read shop slots" on shop_slots;
create policy "Public can read shop slots"
  on shop_slots for select
  using (true);

-- ── PROFILES ─────────────────────────────────────────────
-- Users can read their own profile
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Users can upsert their own profile
drop policy if exists "Users can upsert own profile" on profiles;
create policy "Users can upsert own profile"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── BOOKINGS ─────────────────────────────────────────────
-- Customers see their own bookings; shop owners see bookings for their shop
drop policy if exists "Customers can read own bookings" on bookings;
create policy "Customers can read own bookings"
  on bookings for select
  using (
    auth.uid() = customer_id
    or auth.uid() = (select owner_id from shops where id = bookings.shop_id)
  );

drop policy if exists "Customers can create bookings" on bookings;
create policy "Customers can create bookings"
  on bookings for insert
  with check (auth.uid() = customer_id);

-- ── MESSAGES ─────────────────────────────────────────────
drop policy if exists "Booking participants can read messages" on messages;
create policy "Booking participants can read messages"
  on messages for select
  using (
    auth.uid() = (select customer_id from bookings where id = messages.booking_id)
    or auth.uid() = (select owner_id from shops where id = (select shop_id from bookings where id = messages.booking_id))
  );

drop policy if exists "Booking participants can send messages" on messages;
create policy "Booking participants can send messages"
  on messages for insert
  with check (auth.uid() = sender_id);
