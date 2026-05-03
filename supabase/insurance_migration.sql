-- Insurance Document Upload & Verification
-- Adds columns for document URL and verification status to shops table
-- Creates insurance-docs storage bucket

-- New columns on shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_doc_url text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_status text; -- null | 'pending' | 'verified' | 'rejected'
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_verified boolean NOT NULL DEFAULT false;

-- Storage bucket for insurance documents (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-docs', 'insurance-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own shop folder
CREATE POLICY "Shop owners can upload insurance docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'insurance-docs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM shops WHERE owner_id = auth.uid()
  )
);

-- Allow authenticated users to update (upsert) their own docs
CREATE POLICY "Shop owners can update insurance docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'insurance-docs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM shops WHERE owner_id = auth.uid()
  )
);

-- Allow public read access (admin reviews docs via direct URL)
CREATE POLICY "Insurance docs are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'insurance-docs');
