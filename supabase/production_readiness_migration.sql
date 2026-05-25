-- ============================================================
-- WrapBridge — Production readiness hardening
-- Run this after the existing migrations in Supabase SQL Editor.
-- ============================================================

-- ── Booking payment audit trail ─────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
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

-- ── Insurance approval listing gate ───────────────────────
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_doc_url text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_status text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_verified boolean NOT NULL DEFAULT false;

UPDATE shops
SET insurance_verified = (insurance_status = 'verified')
WHERE insurance_verified IS DISTINCT FROM (insurance_status = 'verified');

UPDATE shops
SET is_listed = false
WHERE COALESCE(insurance_verified, false) <> true
   OR insurance_status IS DISTINCT FROM 'verified';

CREATE OR REPLACE FUNCTION enforce_shop_listing_requirements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_listed = true AND (
    COALESCE(NEW.stripe_onboarded, false) <> true
    OR COALESCE(NEW.insurance_verified, false) <> true
    OR NEW.insurance_status IS DISTINCT FROM 'verified'
  ) THEN
    NEW.is_listed := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_shop_listing_requirements ON shops;
CREATE TRIGGER trg_enforce_shop_listing_requirements
  BEFORE INSERT OR UPDATE OF is_listed, stripe_onboarded, insurance_status, insurance_verified
  ON shops
  FOR EACH ROW
  EXECUTE FUNCTION enforce_shop_listing_requirements();

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

CREATE TABLE IF NOT EXISTS booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount < 1000000),
  payment_type text NOT NULL DEFAULT 'full' CHECK (payment_type IN ('full', 'deposit')),
  deposit_pct integer NOT NULL DEFAULT 100 CHECK (deposit_pct BETWEEN 10 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'declined', 'cancelled')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_booking_quotes_booking_created
  ON booking_quotes (booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES booking_quotes(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  payment_type text NOT NULL CHECK (payment_type IN ('full', 'deposit', 'remaining')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  full_amount numeric(12,2) NOT NULL CHECK (full_amount > 0),
  platform_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed')),
  refund_status text CHECK (refund_status IS NULL OR refund_status IN ('partial', 'full')),
  dispute_status text CHECK (dispute_status IS NULL OR dispute_status IN ('open', 'won', 'lost')),
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking
  ON booking_payments (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payments_payment_intent
  ON booking_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Backfill one legacy payment row per paid booking where possible.
INSERT INTO booking_payments (
  booking_id,
  stripe_payment_intent_id,
  payment_type,
  amount,
  full_amount,
  platform_fee,
  status,
  refund_status,
  dispute_status,
  paid_at
)
SELECT
  id,
  stripe_payment_intent_id,
  'full',
  GREATEST(COALESCE(total, amount, 0), 0.01),
  GREATEST(COALESCE(amount, total, 0), 0.01),
  COALESCE(fee, 0),
  CASE WHEN payment_verified THEN 'succeeded' ELSE 'pending' END,
  refund_status,
  dispute_status,
  COALESCE(payment_confirmed_at, created_at)
FROM bookings
WHERE payment_verified = true
  AND stripe_payment_intent_id IS NOT NULL
ON CONFLICT (stripe_payment_intent_id) DO NOTHING;

-- ── Foreign keys that older setup files may not have created ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_shop_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_shop_id_fkey
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── Protect payment columns from browser-side updates ────────────────────
CREATE OR REPLACE FUNCTION protect_booking_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.amount := 0;
    NEW.fee := 0;
    NEW.total := 0;
    NEW.payment_verified := false;
    NEW.stripe_payment_intent_id := NULL;
    NEW.payment_confirmed_at := NULL;
    NEW.refund_status := NULL;
    NEW.dispute_status := NULL;
    RETURN NEW;
  END IF;

  IF NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.fee IS DISTINCT FROM OLD.fee
    OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.payment_verified IS DISTINCT FROM OLD.payment_verified
    OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
    OR NEW.payment_confirmed_at IS DISTINCT FROM OLD.payment_confirmed_at
    OR NEW.refund_status IS DISTINCT FROM OLD.refund_status
    OR NEW.dispute_status IS DISTINCT FROM OLD.dispute_status THEN
    RAISE EXCEPTION 'Payment fields can only be changed by server-side functions';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_booking_payment_fields ON bookings;
CREATE TRIGGER trg_protect_booking_payment_fields
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_booking_payment_fields();

-- ── RLS: bookings ─────────────────────────────────────────
ALTER TABLE booking_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
CREATE POLICY "Customers can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Shop owners can update shop bookings" ON bookings;
CREATE POLICY "Shop owners can update shop bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = bookings.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM shops WHERE id = bookings.shop_id));

DROP POLICY IF EXISTS "Booking participants can read messages" ON messages;
CREATE POLICY "Booking participants can read messages"
  ON messages FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM bookings WHERE id = messages.booking_id)
    OR auth.uid() = (SELECT owner_id FROM shops WHERE id = (SELECT shop_id FROM bookings WHERE id = messages.booking_id))
    OR is_admin()
  );

DROP POLICY IF EXISTS "Booking participants can send messages" ON messages;
CREATE POLICY "Booking participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (SELECT customer_id FROM bookings WHERE id = messages.booking_id)
      OR auth.uid() = (SELECT owner_id FROM shops WHERE id = (SELECT shop_id FROM bookings WHERE id = messages.booking_id))
      OR is_admin()
    )
  );

DROP POLICY IF EXISTS "Booking participants can read quotes" ON booking_quotes;
CREATE POLICY "Booking participants can read quotes"
  ON booking_quotes FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM bookings WHERE id = booking_quotes.booking_id)
    OR auth.uid() = (SELECT owner_id FROM shops WHERE id = booking_quotes.shop_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "Shop owners can create quotes" ON booking_quotes;
CREATE POLICY "Shop owners can create quotes"
  ON booking_quotes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = (SELECT owner_id FROM shops WHERE id = booking_quotes.shop_id)
    AND booking_quotes.shop_id = (SELECT shop_id FROM bookings WHERE id = booking_quotes.booking_id)
  );

DROP POLICY IF EXISTS "Shop owners can update quotes" ON booking_quotes;
CREATE POLICY "Shop owners can update quotes"
  ON booking_quotes FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = booking_quotes.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM shops WHERE id = booking_quotes.shop_id));

DROP POLICY IF EXISTS "Booking participants can read payments" ON booking_payments;
CREATE POLICY "Booking participants can read payments"
  ON booking_payments FOR SELECT
  USING (
    auth.uid() = (SELECT customer_id FROM bookings WHERE id = booking_payments.booking_id)
    OR auth.uid() = (SELECT owner_id FROM shops WHERE id = (SELECT shop_id FROM bookings WHERE id = booking_payments.booking_id))
    OR is_admin()
  );

-- Only service-role edge functions write booking_payments.

-- ── RLS: safer public shop reads ───────────────────────────
DROP POLICY IF EXISTS "Public can read shops" ON shops;
CREATE POLICY "Public can read listed shops"
  ON shops FOR SELECT
  USING (
    (is_listed = true AND stripe_onboarded = true AND insurance_verified = true AND insurance_status = 'verified')
    OR auth.uid() = owner_id
    OR is_admin()
  );

-- Keep portfolio public only for listed shops; owners/admins can still see their own.
DROP POLICY IF EXISTS "Public can read portfolio images" ON portfolio_images;
CREATE POLICY "Public can read listed shop portfolio images"
  ON portfolio_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = portfolio_images.shop_id
        AND (
          (shops.is_listed = true AND shops.stripe_onboarded = true AND shops.insurance_verified = true AND shops.insurance_status = 'verified')
          OR shops.owner_id = auth.uid()
          OR is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Shop owners can insert portfolio images" ON portfolio_images;
CREATE POLICY "Shop owners can insert portfolio images"
  ON portfolio_images FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM shops WHERE id = portfolio_images.shop_id));

DROP POLICY IF EXISTS "Shop owners can delete portfolio images" ON portfolio_images;
CREATE POLICY "Shop owners can delete portfolio images"
  ON portfolio_images FOR DELETE
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = portfolio_images.shop_id));

DROP POLICY IF EXISTS "Shop owners can update portfolio images" ON portfolio_images;
CREATE POLICY "Shop owners can update portfolio images"
  ON portfolio_images FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = portfolio_images.shop_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM shops WHERE id = portfolio_images.shop_id));

-- Reviews: customers can only review their own completed bookings.
DROP POLICY IF EXISTS "Customers can insert their own review" ON reviews;
CREATE POLICY "Customers can insert their own review"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.shop_id = reviews.shop_id
        AND bookings.status = 'completed'
    )
  );

-- ── Storage hardening ──────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id IN ('insurance-docs');

DROP POLICY IF EXISTS "Insurance docs are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Insurance docs readable by owner or admin" ON storage.objects;
CREATE POLICY "Insurance docs readable by owner or admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'insurance-docs'
  AND (
    (storage.foldername(name))[1] IN (SELECT id::text FROM shops WHERE owner_id = auth.uid())
    OR is_admin()
  )
);

DROP POLICY IF EXISTS "Auth users upload shop images" ON storage.objects;
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
    SELECT 1 FROM bookings
    WHERE bookings.id::text = (storage.foldername(name))[2]
      AND (
        bookings.customer_id = auth.uid()
        OR auth.uid() = (SELECT owner_id FROM shops WHERE shops.id = bookings.shop_id)
        OR is_admin()
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
