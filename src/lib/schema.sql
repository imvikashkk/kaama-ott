-- Run this once to set up the DB schema

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  mobile      VARCHAR(15) NOT NULL UNIQUE,
  country_code VARCHAR(5) NOT NULL DEFAULT '91',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
  id         SERIAL PRIMARY KEY,
  mobile     VARCHAR(15) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otps_mobile ON otps(mobile);

CREATE TABLE IF NOT EXISTS plans (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  original_price INTEGER NOT NULL,
  price          INTEGER NOT NULL,
  duration_days  INTEGER NOT NULL,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, original_price, price, duration_days, description)
SELECT v.* FROM (VALUES
  ('1 Day',    299,  179, 1,   'Ek din ka full access'),
  ('1 Month',  499,  249, 30,  'Poora mahine ka mazza'),
  ('6 Months', 999,  399, 180, 'Chhe mahine ka full entertainment'),
  ('1 Year',   1499, 599, 365, 'Poore saal ka unlimited mazza')
) AS v(name, original_price, price, duration_days, description)
WHERE NOT EXISTS (SELECT 1 FROM plans);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  plan_id     INTEGER NOT NULL REFERENCES plans(id),
  start_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date    TIMESTAMPTZ NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | expired | cancelled
  payment_id  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  plan_id           INTEGER NOT NULL REFERENCES plans(id),
  txn_id            VARCHAR(100) NOT NULL UNIQUE,
  amount            INTEGER NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | success | failed
  gateway_txn_id   VARCHAR(200),
  gateway_response JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_txn ON payments(txn_id);
CREATE INDEX IF NOT EXISTS idx_pay_user ON payments(user_id);

-- ── Marketing / Pixel tracking ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS pixels (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(50)  NOT NULL UNIQUE,
  label         VARCHAR(100) NOT NULL,
  pixel_id      VARCHAR(20)  NOT NULL,
  access_token  TEXT         NOT NULL,
  ad_account_id VARCHAR(30),
  is_default    BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Only one pixel can be default at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_pixels_one_default ON pixels(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_pixels_slug ON pixels(slug);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS campaign_slug       VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS capi_sent           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS capi_error          TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_campaign_id    VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_campaign_name  VARCHAR(200);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fbp                 VARCHAR(200);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fbc                 VARCHAR(200);
-- Legacy rename (Postgres has no RENAME COLUMN IF EXISTS)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'easebuzz_txn_id') THEN
    ALTER TABLE payments RENAME COLUMN easebuzz_txn_id TO gateway_txn_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'easebuzz_response') THEN
    ALTER TABLE payments RENAME COLUMN easebuzz_response TO gateway_response;
  END IF;
END $$;

-- ── Media buyers (clients) & first-touch attribution ────────────────

CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50),
  email         VARCHAR(150) UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pixels ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_pixels_client ON pixels(client_id);

CREATE TABLE IF NOT EXISTS phone_attributions (
  mobile             VARCHAR(15) PRIMARY KEY,
  campaign_slug      VARCHAR(50),
  meta_campaign_id   VARCHAR(50),
  meta_campaign_name VARCHAR(200),
  fbp                VARCHAR(200),
  fbc                VARCHAR(200),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Gateway order id (UPI gateway) ──────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS cf_order_id VARCHAR(100);

-- ── UPI gateway: background status watcher ──────────────────────────
-- Client IP/UA saved at initiate so Meta CAPI works when the watcher (no request) activates

ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_ip  VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent TEXT;
CREATE INDEX IF NOT EXISTS idx_pay_pending ON payments(created_at) WHERE status = 'pending';

-- ── OTP brute-force guard ────────────────────────────────────────────

ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- ── Admin-granted subscriptions ──────────────────────────────────────

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'payment'; -- payment | admin
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS note   TEXT;

-- ── MeraOTP (provider generates + verifies the OTP) ──────────────────

ALTER TABLE otps ADD COLUMN IF NOT EXISTS message_id VARCHAR(64);
ALTER TABLE otps ALTER COLUMN otp DROP NOT NULL;
