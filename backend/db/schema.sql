CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE
    CHECK (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name TEXT NOT NULL
    CHECK (CHAR_LENGTH(BTRIM(friend_name)) BETWEEN 1 AND 80),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'repaid')),
  repaid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loans_repayment_state_check CHECK (
    (status = 'unpaid' AND repaid_at IS NULL) OR
    (status = 'repaid' AND repaid_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS loans_user_status_due_idx
  ON loans (user_id, status, due_date);

CREATE INDEX IF NOT EXISTS loans_user_created_idx
  ON loans (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL
    CHECK (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otps_phone_created_idx
  ON otps (phone_number, created_at DESC);
