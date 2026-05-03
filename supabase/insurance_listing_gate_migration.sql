-- ============================================================
-- WrapBridge — Insurance approval listing gate
-- Run this in Supabase SQL Editor if production_readiness_migration.sql
-- has already been applied. This makes insurance approval mandatory
-- before a shop can appear publicly or stay listed.
-- ============================================================

ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_doc_url text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_status text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS insurance_verified boolean NOT NULL DEFAULT false;

-- Keep the boolean in sync with the status field for existing rows.
UPDATE shops
SET insurance_verified = (insurance_status = 'verified')
WHERE insurance_verified IS DISTINCT FROM (insurance_status = 'verified');

-- Immediately hide any shop that is not insurance-approved.
UPDATE shops
SET is_listed = false
WHERE COALESCE(insurance_verified, false) <> true
   OR insurance_status IS DISTINCT FROM 'verified';

-- Database safety net: even if client code tries to list a shop early,
-- force is_listed back to false until Stripe and insurance are both approved.
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

-- Public reads should only expose shops that are listed, Stripe-ready,
-- and insurance-approved. Owners/admins can still see pending shops.
DROP POLICY IF EXISTS "Public can read shops" ON shops;
DROP POLICY IF EXISTS "Public can read listed shops" ON shops;
CREATE POLICY "Public can read listed shops"
  ON shops FOR SELECT
  USING (
    (is_listed = true AND stripe_onboarded = true AND insurance_verified = true AND insurance_status = 'verified')
    OR auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Public can read portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Public can read listed shop portfolio images" ON portfolio_images;
CREATE POLICY "Public can read listed shop portfolio images"
  ON portfolio_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = portfolio_images.shop_id
        AND (
          (shops.is_listed = true AND shops.stripe_onboarded = true AND shops.insurance_verified = true AND shops.insurance_status = 'verified')
          OR shops.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );
