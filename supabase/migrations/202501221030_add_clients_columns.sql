-- Align users table with mobile client expectations
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS consent_accepted boolean DEFAULT false;

-- helper index for lookups by phone
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
