-- ============================================================
-- ADD STREET ADDRESS TO SHOPS
-- Run this migration ONCE in your Supabase SQL editor.
-- ============================================================

ALTER TABLE shops ADD COLUMN IF NOT EXISTS address text;
