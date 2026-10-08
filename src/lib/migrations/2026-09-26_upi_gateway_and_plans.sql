-- UPI gateway watcher columns + new plan lineup. Safe to re-run.
BEGIN;

-- ── UPI gateway: background status watcher ──────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cf_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_ip   VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent  TEXT;
CREATE INDEX IF NOT EXISTS idx_pay_pending ON payments(created_at) WHERE status = 'pending';

-- ── Plans: 1 Day / 1 Month / 6 Months / 1 Year ──────────────────────
-- Old plans are deactivated, not deleted — payments/subscriptions still reference them
INSERT INTO plans (name, original_price, price, duration_days, description)
SELECT v.name, v.original_price, v.price, v.duration_days, v.description
FROM (VALUES
  ('1 Day',    299,  179, 1,   'Ek din ka full access'),
  ('1 Month',  499,  249, 30,  'Poora mahine ka mazza'),
  ('6 Months', 999,  399, 180, 'Chhe mahine ka full entertainment'),
  ('1 Year',   1499, 599, 365, 'Poore saal ka unlimited mazza')
) AS v(name, original_price, price, duration_days, description)
WHERE NOT EXISTS (
  SELECT 1 FROM plans p
  WHERE p.name = v.name AND p.price = v.price AND p.duration_days = v.duration_days
);

UPDATE plans SET is_active = (name, price, duration_days) IN (
  ('1 Day', 179, 1), ('1 Month', 249, 30), ('6 Months', 399, 180), ('1 Year', 599, 365)
);

COMMIT;

SELECT id, name, price, original_price, duration_days, is_active FROM plans ORDER BY is_active DESC, price;
