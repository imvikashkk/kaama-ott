import pool from './db';

// Fixed test/review login — no SMS sent, OTP is always TEST_OTP, subscription never lapses
export const TEST_MOBILE = '9754159491';
export const TEST_OTP = '123456';

export const isTestMobile = (mobile: string) => mobile === TEST_MOBILE;

// Keep an active subscription far in the future; re-grants if it was revoked or is running low
export async function ensureTestSubscription(): Promise<void> {
  const userRes = await pool.query(
    `INSERT INTO users (mobile) VALUES ($1)
     ON CONFLICT (mobile) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [TEST_MOBILE],
  );
  const userId: number = userRes.rows[0].id;

  const live = await pool.query(
    `SELECT id FROM subscriptions
     WHERE user_id = $1 AND status = 'active' AND end_date > NOW() + INTERVAL '30 days'
     LIMIT 1`,
    [userId],
  );
  if (live.rows.length > 0) return;

  const planRes = await pool.query(`SELECT id FROM plans ORDER BY duration_days DESC LIMIT 1`);
  if (planRes.rows.length === 0) return;

  await pool.query(
    `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, end_date, status)
     VALUES ($1, $2, NOW() + INTERVAL '1 year', 'active')`,
    [userId, planRes.rows[0].id],
  );
}
