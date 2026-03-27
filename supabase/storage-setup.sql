-- Run this once in your Supabase dashboard SQL editor:
-- Dashboard → SQL Editor → paste this → Run

-- 1. Create the shop-images storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Anyone can view images
CREATE POLICY "Public read shop images"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-images');

-- 3. Authenticated users can upload images to their own folder
CREATE POLICY "Auth users upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-images'
  AND auth.role() = 'authenticated'
);

-- 4. Authenticated users can update (replace) their own images
CREATE POLICY "Auth users update own shop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Add listing status column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_listed boolean DEFAULT false;

-- 6. Add preferred_dates column to bookings table (stores JSON array of customer's preferred dates/times)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_dates text;

-- 7. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (booking_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Customers can insert their own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- 8. Function + trigger to recompute shop rating after a review is inserted
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shops
  SET
    rating = (SELECT ROUND(AVG(stars)::numeric, 1) FROM reviews WHERE shop_id = NEW.shop_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE shop_id = NEW.shop_id)
  WHERE id = NEW.shop_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_inserted ON reviews;
CREATE TRIGGER on_review_inserted
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_shop_rating();

-- 9. Add state, zip, lat/lng columns to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS state text DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS zip   text DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS latitude  double precision;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS longitude double precision;

-- 10. Shop availability: working days config + blocked date management
ALTER TABLE shops ADD COLUMN IF NOT EXISTS working_days text DEFAULT '1,2,3,4,5,6';

CREATE TABLE IF NOT EXISTS shop_blocked_dates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  UNIQUE (shop_id, blocked_date)
);

ALTER TABLE shop_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Anyone (including customers in BookingFlow) can read blocked dates
CREATE POLICY "Public read shop blocked dates"
  ON shop_blocked_dates FOR SELECT USING (true);

-- Only the shop owner can insert/update/delete their blocked dates
CREATE POLICY "Shop owner insert blocked dates"
  ON shop_blocked_dates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  );

CREATE POLICY "Shop owner delete blocked dates"
  ON shop_blocked_dates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  );

-- 11. Stripe Connect: store each shop's connected account ID
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_account_id text;

