-- ============================================================
-- WrapBridge — Contractor accounts and company chat
-- Run this in Supabase SQL Editor after the existing migrations.
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'New Contractor',
  title text NOT NULL DEFAULT 'Independent Installer',
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience >= 0 AND years_experience <= 80),
  location text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  service_radius text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT 'Available for projects',
  specialties text[] NOT NULL DEFAULT '{}',
  certifications text[] NOT NULL DEFAULT '{}',
  rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  completed_jobs integer NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
  is_listed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_profiles_listed
  ON contractor_profiles (is_listed, years_experience DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS contractor_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES shops(id) ON DELETE SET NULL,
  company_name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'Contractor inquiry',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_threads_contractor
  ON contractor_threads (contractor_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_threads_company
  ON contractor_threads (company_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS contractor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES contractor_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('company', 'contractor')),
  text text NOT NULL CHECK (length(trim(text)) > 0),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_messages_thread_sent
  ON contractor_messages (thread_id, sent_at ASC);

CREATE OR REPLACE FUNCTION touch_contractor_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_contractor_profiles ON contractor_profiles;
CREATE TRIGGER trg_touch_contractor_profiles
  BEFORE UPDATE ON contractor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION touch_contractor_updated_at();

DROP TRIGGER IF EXISTS trg_touch_contractor_threads ON contractor_threads;
CREATE TRIGGER trg_touch_contractor_threads
  BEFORE UPDATE ON contractor_threads
  FOR EACH ROW
  EXECUTE FUNCTION touch_contractor_updated_at();

CREATE OR REPLACE FUNCTION bump_contractor_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE contractor_threads
  SET last_message_at = NEW.sent_at,
      updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_contractor_thread_last_message ON contractor_messages;
CREATE TRIGGER trg_bump_contractor_thread_last_message
  AFTER INSERT ON contractor_messages
  FOR EACH ROW
  EXECUTE FUNCTION bump_contractor_thread_last_message();

ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies can read listed contractor profiles" ON contractor_profiles;
CREATE POLICY "Companies can read listed contractor profiles"
  ON contractor_profiles FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (is_listed = true AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'company'))
    OR (
      EXISTS (
        SELECT 1
        FROM contractor_threads
        WHERE contractor_threads.contractor_id = contractor_profiles.id
          AND contractor_threads.company_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Contractors can insert own profile" ON contractor_profiles;
CREATE POLICY "Contractors can insert own profile"
  ON contractor_profiles FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'contractor')
  );

DROP POLICY IF EXISTS "Contractors can update own profile" ON contractor_profiles;
CREATE POLICY "Contractors can update own profile"
  ON contractor_profiles FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Thread participants can read contractor threads" ON contractor_threads;
CREATE POLICY "Thread participants can read contractor threads"
  ON contractor_threads FOR SELECT
  USING (
    company_id = auth.uid()
    OR auth.uid() = (SELECT owner_id FROM contractor_profiles WHERE id = contractor_threads.contractor_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Companies can create contractor threads" ON contractor_threads;
CREATE POLICY "Companies can create contractor threads"
  ON contractor_threads FOR INSERT
  WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'company')
  );

DROP POLICY IF EXISTS "Thread participants can update contractor threads" ON contractor_threads;
CREATE POLICY "Thread participants can update contractor threads"
  ON contractor_threads FOR UPDATE
  USING (
    company_id = auth.uid()
    OR auth.uid() = (SELECT owner_id FROM contractor_profiles WHERE id = contractor_threads.contractor_id)
  )
  WITH CHECK (
    company_id = auth.uid()
    OR auth.uid() = (SELECT owner_id FROM contractor_profiles WHERE id = contractor_threads.contractor_id)
  );

DROP POLICY IF EXISTS "Thread participants can read contractor messages" ON contractor_messages;
CREATE POLICY "Thread participants can read contractor messages"
  ON contractor_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM contractor_threads t
      JOIN contractor_profiles c ON c.id = t.contractor_id
      WHERE t.id = contractor_messages.thread_id
        AND (t.company_id = auth.uid() OR c.owner_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Thread participants can send contractor messages" ON contractor_messages;
CREATE POLICY "Thread participants can send contractor messages"
  ON contractor_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM contractor_threads t
      JOIN contractor_profiles c ON c.id = t.contractor_id
      WHERE t.id = contractor_messages.thread_id
        AND (
          (sender_role = 'company' AND t.company_id = auth.uid())
          OR (sender_role = 'contractor' AND c.owner_id = auth.uid())
        )
    )
  );
