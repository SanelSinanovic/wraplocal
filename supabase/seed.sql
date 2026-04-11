-- ============================================================
-- WrapLocal — Supabase Seed
-- Run this in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Add extra columns the app needs (safe to run if table already exists)
alter table shops add column if not exists color    text default '#FF4D00';
alter table shops add column if not exists avatar   text;
alter table shops add column if not exists distance text;

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
-- This trigger fires every time a new user signs up via Supabase Auth.
-- Pass { data: { role: 'customer' | 'company', name: '...' } } in signUp options.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SHOPS ─────────────────────────────────────────────────
insert into shops (id, name, rating, review_count, location, city, zip, distance, price_from, availability, tags, bio, phone, website, banner_url, color, avatar)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Chrome Kings Wraps', 4.9, 214,
    'Atlanta, GA', 'Atlanta', '30305', '2.1 mi', 1200, 'Today',
    ARRAY['Full Wraps', 'Color Change', 'PPF'],
    'Atlanta''s premier wrap studio since 2015. Certified 3M installers with a 5-year warranty on all work.',
    '(404) 555-0123', 'chromekingswraps.com',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    '#FF4D00', 'CK'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Phantom Wraps Studio', 4.7, 98,
    'Alpharetta, GA', 'Alpharetta', '30009', '4.5 mi', 950, 'Tomorrow',
    ARRAY['Partial Wraps', 'Racing Stripes', 'Vinyl'],
    'Specializing in creative custom designs. Our artists turn your vision into reality on any vehicle.',
    '(770) 555-0198', 'phantomwraps.com',
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=600&q=80',
    '#7C3AED', 'PW'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Velocity Custom Wraps', 4.8, 156,
    'Roswell, GA', 'Roswell', '30075', '6.8 mi', 1450, 'Today',
    ARRAY['Fleet Wraps', 'Commercial', 'Full Wraps'],
    'Top choice for fleet and commercial vehicle wraps in the metro area. Volume discounts available.',
    '(678) 555-0177', 'velocitywraps.com',
    'https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=600&q=80',
    '#059669', 'VC'
  )
on conflict (id) do nothing;

-- ── PORTFOLIO IMAGES ──────────────────────────────────────
insert into portfolio_images (shop_id, url, display_order) values
  ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&q=80', 1),
  ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80', 2),
  ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=80', 3),
  ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&q=80', 1),
  ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=400&q=80', 2),
  ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80', 3),
  ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', 1),
  ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=400&q=80', 2),
  ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=80', 3)
on conflict do nothing;

-- ── TIME SLOTS ────────────────────────────────────────────
insert into shop_slots (shop_id, label, is_active) values
  ('11111111-1111-1111-1111-111111111111', '9:00 AM',  true),
  ('11111111-1111-1111-1111-111111111111', '11:00 AM', true),
  ('11111111-1111-1111-1111-111111111111', '2:00 PM',  true),
  ('11111111-1111-1111-1111-111111111111', '4:00 PM',  true),
  ('22222222-2222-2222-2222-222222222222', '10:00 AM', true),
  ('22222222-2222-2222-2222-222222222222', '1:00 PM',  true),
  ('22222222-2222-2222-2222-222222222222', '3:00 PM',  true),
  ('33333333-3333-3333-3333-333333333333', '8:00 AM',  true),
  ('33333333-3333-3333-3333-333333333333', '12:00 PM', true),
  ('33333333-3333-3333-3333-333333333333', '3:30 PM',  true),
  ('33333333-3333-3333-3333-333333333333', '5:00 PM',  true)
on conflict do nothing;

-- ============================================================
-- NOTES:
-- Profiles and bookings are created through the app (sign up + booking flow).
-- To create a test customer account: sign up via the app with role 'customer'.
-- To create a test company account: sign up via the app with role 'company',
--   then manually set owner_id on the shop row you want them to own:
--   UPDATE shops SET owner_id = '<their-uuid>' WHERE id = '11111111-...';
-- ============================================================

-- Email existence check for signup validation
CREATE OR REPLACE FUNCTION public.email_exists(email_address text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = email_address);
$$;
