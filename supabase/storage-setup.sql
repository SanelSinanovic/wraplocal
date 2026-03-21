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
