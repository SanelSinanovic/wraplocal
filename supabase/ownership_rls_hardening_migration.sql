-- ============================================================
-- WrapBridge — Ownership RLS hardening
-- Run this after production_readiness_migration.sql.
-- Purpose: make sure app tables are RLS-protected and private rows
-- are only readable/writable by the owning user, booking participant,
-- shop owner, or admin as appropriate.
-- ============================================================

-- RLS must be enabled on every table reachable from the browser.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shop_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shop_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_payments ENABLE ROW LEVEL SECURITY;

-- Admin helper used by several policies. Keep search_path fixed.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles: a user can only see/change their own profile, unless admin.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
CREATE POLICY "Users can upsert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Bookings: only the customer, the owning shop, or admin can read.
DROP POLICY IF EXISTS "Customers can read own bookings" ON public.bookings;
CREATE POLICY "Customers can read own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = bookings.shop_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Shop owners can update shop bookings" ON public.bookings;
CREATE POLICY "Shop owners can update shop bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = bookings.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = bookings.shop_id));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Messages: sender must be a participant in that booking.
DROP POLICY IF EXISTS "Booking participants can read messages" ON public.messages;
CREATE POLICY "Booking participants can read messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM public.bookings WHERE id = messages.booking_id)
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = (SELECT shop_id FROM public.bookings WHERE id = messages.booking_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Booking participants can send messages" ON public.messages;
CREATE POLICY "Booking participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (SELECT customer_id FROM public.bookings WHERE id = messages.booking_id)
      OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = (SELECT shop_id FROM public.bookings WHERE id = messages.booking_id))
      OR public.is_admin()
    )
  );

-- Quotes and payments: visible only to booking participants or admin.
DROP POLICY IF EXISTS "Booking participants can read quotes" ON public.booking_quotes;
CREATE POLICY "Booking participants can read quotes"
  ON public.booking_quotes FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM public.bookings WHERE id = booking_quotes.booking_id)
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = booking_quotes.shop_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Shop owners can create quotes" ON public.booking_quotes;
CREATE POLICY "Shop owners can create quotes"
  ON public.booking_quotes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = (SELECT owner_id FROM public.shops WHERE id = booking_quotes.shop_id)
    AND booking_quotes.shop_id = (SELECT shop_id FROM public.bookings WHERE id = booking_quotes.booking_id)
  );

DROP POLICY IF EXISTS "Shop owners can update quotes" ON public.booking_quotes;
CREATE POLICY "Shop owners can update quotes"
  ON public.booking_quotes FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = booking_quotes.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = booking_quotes.shop_id));

DROP POLICY IF EXISTS "Booking participants can read payments" ON public.booking_payments;
CREATE POLICY "Booking participants can read payments"
  ON public.booking_payments FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM public.bookings WHERE id = booking_payments.booking_id)
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = (SELECT shop_id FROM public.bookings WHERE id = booking_payments.booking_id))
    OR public.is_admin()
  );

-- Shops/portfolio are public only when fully approved; owners/admins can see their own.
DROP POLICY IF EXISTS "Public can read shops" ON public.shops;
DROP POLICY IF EXISTS "Public can read listed shops" ON public.shops;
CREATE POLICY "Public can read listed shops"
  ON public.shops FOR SELECT
  USING (
    (is_listed = true AND stripe_onboarded = true AND insurance_verified = true AND insurance_status = 'verified')
    OR auth.uid() = owner_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Owner can insert shop" ON public.shops;
CREATE POLICY "Owner can insert shop"
  ON public.shops FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update shop" ON public.shops;
CREATE POLICY "Owner can update shop"
  ON public.shops FOR UPDATE
  USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Public can read portfolio images" ON public.portfolio_images;
DROP POLICY IF EXISTS "Public can read listed shop portfolio images" ON public.portfolio_images;
CREATE POLICY "Public can read listed shop portfolio images"
  ON public.portfolio_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = portfolio_images.shop_id
        AND (
          (shops.is_listed = true AND shops.stripe_onboarded = true AND shops.insurance_verified = true AND shops.insurance_status = 'verified')
          OR shops.owner_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Shop owners can insert portfolio images" ON public.portfolio_images;
CREATE POLICY "Shop owners can insert portfolio images"
  ON public.portfolio_images FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = portfolio_images.shop_id));

DROP POLICY IF EXISTS "Shop owners can delete portfolio images" ON public.portfolio_images;
CREATE POLICY "Shop owners can delete portfolio images"
  ON public.portfolio_images FOR DELETE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = portfolio_images.shop_id));

DROP POLICY IF EXISTS "Shop owners can update portfolio images" ON public.portfolio_images;
CREATE POLICY "Shop owners can update portfolio images"
  ON public.portfolio_images FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = portfolio_images.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = portfolio_images.shop_id));

DROP POLICY IF EXISTS "Public can read shop slots" ON public.shop_slots;
CREATE POLICY "Public can read shop slots"
  ON public.shop_slots FOR SELECT
  USING (true);

-- Reviews are public marketplace content, but creation must belong to the booking customer.
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Customers can insert their own review" ON public.reviews;
CREATE POLICY "Customers can insert their own review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.shop_id = reviews.shop_id
        AND bookings.status = 'completed'
    )
  );

-- Availability is public marketplace information. Owners can manage their own blocked dates.
DROP POLICY IF EXISTS "Public read shop blocked dates" ON public.shop_blocked_dates;
CREATE POLICY "Public read shop blocked dates"
  ON public.shop_blocked_dates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Shop owner insert blocked dates" ON public.shop_blocked_dates;
CREATE POLICY "Shop owner insert blocked dates"
  ON public.shop_blocked_dates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Shop owner delete blocked dates" ON public.shop_blocked_dates;
CREATE POLICY "Shop owner delete blocked dates"
  ON public.shop_blocked_dates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid())
  );

-- Storage: insurance documents are sensitive and must not be publicly readable.
UPDATE storage.buckets SET public = false WHERE id = 'insurance-docs';

DROP POLICY IF EXISTS "Insurance docs are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Insurance docs readable by owner or admin" ON storage.objects;
CREATE POLICY "Insurance docs readable by owner or admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'insurance-docs'
  AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Auth users upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload only their own shop image folders" ON storage.objects;
CREATE POLICY "Users upload only their own shop image folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Booking participants upload chat files" ON storage.objects;
CREATE POLICY "Booking participants upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'chat'
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id::text = (storage.foldername(name))[2]
      AND (
        bookings.customer_id = auth.uid()
        OR auth.uid() = (SELECT owner_id FROM public.shops WHERE shops.id = bookings.shop_id)
        OR public.is_admin()
      )
  )
);

DROP POLICY IF EXISTS "Users upload own booking design files" ON storage.objects;
CREATE POLICY "Users upload own booking design files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'booking-designs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Auth users update own shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users update only their own shop image folders" ON storage.objects;
CREATE POLICY "Users update only their own shop image folders"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete only their own shop image folders" ON storage.objects;
CREATE POLICY "Users delete only their own shop image folders"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
