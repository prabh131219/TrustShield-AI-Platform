/*
# TrustShield AI — Core Schema

## Purpose
Creates the four core entities for the TrustShield AI fraud-prevention prototype:
TrustedIdentity, SafetyScan, VerificationChallenge, and DecisionPassport.

## Notes
- This is a multi-user app with email/password auth. All tables are owner-scoped.
- `user_id` columns default to `auth.uid()` so inserts that omit the owner succeed.
- RLS enabled on every table; 4 CRUD policies per table scoped to the owner.
- No real bank/UPI/payment processing is represented here — only metadata.
*/

-- 1) TrustedIdentity
CREATE TABLE IF NOT EXISTS trusted_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  identity_type text NOT NULL CHECK (identity_type IN ('family','vendor','company','bank_account','upi_id','email','phone')),
  phone text,
  email text,
  upi_id text,
  account_reference text,
  verification_method text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified','unverified')),
  verified_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trusted_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_trusted_identities" ON trusted_identities;
CREATE POLICY "select_own_trusted_identities" ON trusted_identities FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_trusted_identities" ON trusted_identities;
CREATE POLICY "insert_own_trusted_identities" ON trusted_identities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_trusted_identities" ON trusted_identities;
CREATE POLICY "update_own_trusted_identities" ON trusted_identities FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trusted_identities" ON trusted_identities;
CREATE POLICY "delete_own_trusted_identities" ON trusted_identities FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2) SafetyScan
CREATE TABLE IF NOT EXISTS safety_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_reference text,
  payment_amount numeric(14,2),
  message_text text,
  url text,
  qr_payload text,
  extracted_upi_id text,
  receiver_known text,
  details_changed boolean NOT NULL DEFAULT false,
  risk_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_score integer NOT NULL DEFAULT 0,
  original_decision text NOT NULL CHECK (original_decision IN ('TRUST','VERIFY','STOP')),
  final_decision text NOT NULL CHECK (final_decision IN ('TRUST','VERIFY','STOP')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_safety_scans" ON safety_scans;
CREATE POLICY "select_own_safety_scans" ON safety_scans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_safety_scans" ON safety_scans;
CREATE POLICY "insert_own_safety_scans" ON safety_scans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_safety_scans" ON safety_scans;
CREATE POLICY "update_own_safety_scans" ON safety_scans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_safety_scans" ON safety_scans;
CREATE POLICY "delete_own_safety_scans" ON safety_scans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 3) VerificationChallenge
CREATE TABLE IF NOT EXISTS verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES safety_scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trusted_identity_id uuid REFERENCES trusted_identities(id) ON DELETE SET NULL,
  challenge_method text NOT NULL CHECK (challenge_method IN ('callback','otp')),
  challenge_code text NOT NULL,
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','success','failure','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE verification_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_verification_challenges" ON verification_challenges;
CREATE POLICY "select_own_verification_challenges" ON verification_challenges FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_verification_challenges" ON verification_challenges;
CREATE POLICY "insert_own_verification_challenges" ON verification_challenges FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_verification_challenges" ON verification_challenges;
CREATE POLICY "update_own_verification_challenges" ON verification_challenges FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_verification_challenges" ON verification_challenges;
CREATE POLICY "delete_own_verification_challenges" ON verification_challenges FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4) DecisionPassport
CREATE TABLE IF NOT EXISTS decision_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES safety_scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  passport_data jsonb NOT NULL,
  hash text NOT NULL,
  digital_signature text NOT NULL,
  integrity_status text NOT NULL DEFAULT 'valid' CHECK (integrity_status IN ('valid','tampered','unknown')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE decision_passports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_decision_passports" ON decision_passports;
CREATE POLICY "select_own_decision_passports" ON decision_passports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_decision_passports" ON decision_passports;
CREATE POLICY "insert_own_decision_passports" ON decision_passports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_decision_passports" ON decision_passports;
CREATE POLICY "update_own_decision_passports" ON decision_passports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_decision_passports" ON decision_passports;
CREATE POLICY "delete_own_decision_passports" ON decision_passports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trusted_identities_user ON trusted_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_scans_user ON safety_scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_challenges_scan ON verification_challenges(scan_id);
CREATE INDEX IF NOT EXISTS idx_decision_passports_scan ON decision_passports(scan_id);
