-- OTP codes storage for custom SMS authentication
CREATE TABLE IF NOT EXISTS phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempt_count integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON phone_otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires_at ON phone_otp_codes(expires_at);

ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_all_phone_otp ON phone_otp_codes;
CREATE POLICY service_all_phone_otp ON phone_otp_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- optional retention cleanup (30 min)
CREATE OR REPLACE FUNCTION purge_expired_phone_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otp_codes
  WHERE (expires_at < now() - interval '30 minutes') OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
