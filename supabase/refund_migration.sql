-- ============================================================
-- REFUND & DISPUTE SUPPORT
-- Run this migration ONCE in your Supabase SQL editor.
-- ============================================================

-- ── New columns on bookings ──────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status text;        -- null | 'partial' | 'full'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispute_status text;       -- null | 'open' | 'won' | 'lost'

-- Index for webhook lookups by payment intent
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON bookings (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ── RLS: shops can see their own refund/dispute status (already covered by SELECT *) ──
-- No additional RLS changes needed — existing row-level policies use column-agnostic SELECT *.
