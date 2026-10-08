import { verifyAdminToken } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const LIMIT = 100;

// Derived state: 'cancelled' rows are ones replaced by a later purchase/grant (or revoked)
const STATE_SQL = `CASE
  WHEN s.status = 'active' AND s.end_date > NOW() THEN 'active'
  WHEN s.status = 'active' THEN 'expired'
  ELSE 'cancelled' END`;

const unauthorized = () => NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('mr_admin')?.value)) return unauthorized();

  const url    = new URL(req.url);
  const page   = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const state  = url.searchParams.get('state') || 'active';
  const search = (url.searchParams.get('search') || '').replace(/\D/g, '');
  const source = url.searchParams.get('source') || '';

  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (['active', 'expired', 'cancelled'].includes(state)) {
    params.push(state);
    conds.push(`(${STATE_SQL}) = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conds.push(`u.mobile LIKE $${params.length}`);
  }
  if (['payment', 'admin'].includes(source)) {
    params.push(source);
    conds.push(`s.source = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  try {
    const [rows, cnt, stats, plans] = await Promise.all([
      pool.query(
        `SELECT s.id, s.user_id, u.mobile, p.name AS plan_name, pay.amount,
                s.start_date, s.end_date, s.source, s.note, ${STATE_SQL} AS state,
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.end_date - NOW())) / 86400))::int AS days_left
         FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         JOIN plans p ON p.id = s.plan_id
         LEFT JOIN payments pay ON pay.id = s.payment_id
         ${where}
         ORDER BY s.created_at DESC
         LIMIT ${LIMIT} OFFSET ${(page - 1) * LIMIT}`,
        params,
      ),
      pool.query(
        `SELECT COUNT(*) FROM subscriptions s JOIN users u ON u.id = s.user_id ${where}`,
        params,
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active' AND end_date > NOW())                       AS active,
           COUNT(*) FILTER (WHERE status = 'active' AND end_date <= NOW())                      AS expired,
           COUNT(*) FILTER (WHERE status = 'active' AND end_date > NOW() AND source = 'payment') AS active_paid,
           COUNT(*) FILTER (WHERE status = 'active' AND end_date > NOW() AND source = 'admin')   AS active_granted
         FROM subscriptions`,
      ),
      pool.query(`SELECT id, name, price, duration_days FROM plans WHERE is_active = true ORDER BY price ASC`),
    ]);

    const total = parseInt(cnt.rows[0].count);
    return NextResponse.json({
      success: true,
      data: rows.rows,
      stats: stats.rows[0],
      plans: plans.rows,
      total,
      page,
      totalPages: Math.ceil(total / LIMIT) || 1,
    });
  } catch (err) {
    console.error('admin subscriptions GET error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// Grant: adds `days` on top of any running subscription (same rule as a purchase)
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('mr_admin')?.value)) return unauthorized();

  const { mobile: rawMobile, planId, days: rawDays, note } = await req.json();
  const mobile = String(rawMobile ?? '').replace(/\D/g, '').slice(-10);
  const days = parseInt(rawDays);

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return NextResponse.json({ success: false, message: 'Enter a valid 10-digit mobile number' }, { status: 400 });
  }
  if (!planId) {
    return NextResponse.json({ success: false, message: 'Select a plan' }, { status: 400 });
  }
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return NextResponse.json({ success: false, message: 'Days must be between 1 and 3650' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const plan = await client.query(`SELECT id FROM plans WHERE id = $1`, [planId]);
    if (plan.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }

    const userRes = await client.query(
      `INSERT INTO users (mobile) VALUES ($1)
       ON CONFLICT (mobile) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [mobile],
    );
    const userId: number = userRes.rows[0].id;

    const running = await client.query(
      `SELECT MAX(end_date) AS end_date FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date > NOW()`,
      [userId],
    );

    await client.query(
      `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );
    const inserted = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, end_date, status, source, note)
       VALUES ($1, $2, GREATEST(NOW(), COALESCE($3::timestamptz, NOW())) + make_interval(days => $4), 'active', 'admin', $5)
       RETURNING id, end_date`,
      [userId, planId, running.rows[0].end_date, days, note?.trim() || null],
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: { mobile, ...inserted.rows[0] } }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('admin subscriptions POST error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// Revoke: ends an active subscription immediately
export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('mr_admin')?.value)) return unauthorized();

  const id = parseInt(new URL(req.url).searchParams.get('id') || '');
  if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });

  try {
    const res = await pool.query(
      `UPDATE subscriptions SET status = 'cancelled', end_date = LEAST(end_date, NOW())
       WHERE id = $1 AND status = 'active' RETURNING id`,
      [id],
    );
    if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Not an active subscription' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('admin subscriptions DELETE error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
