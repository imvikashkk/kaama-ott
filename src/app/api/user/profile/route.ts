import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateUserToken, verifyUserToken } from '@/lib/userAuth';

export async function GET(req: NextRequest) {
  try {
    const userId = verifyUserToken(req.cookies.get('mr_token')?.value);
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const res = await pool.query(
      `SELECT u.id, u.mobile, u.created_at,
              s.status AS sub_status, s.end_date,
              p.name AS plan_name, p.price AS plan_price, p.duration_days,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.end_date - NOW())) / 86400))::int AS days_left
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active' AND s.end_date > NOW()
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE u.id = $1`,
      [userId],
    );

    if (res.rows.length === 0) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    const row = res.rows[0];

    // Keep the proxy's mr_has_sub cookie in sync with the DB, so a subscription
    // granted/revoked by admin — or activated by the payment watcher after the pay sheet
    // was closed — takes effect without the user logging in again
    const hasSub = !!row.sub_status;
    const outOfSync = (req.cookies.get('mr_has_sub')?.value === '1') !== hasSub;
    // Tells the subscription page to send the user straight home
    const response = NextResponse.json({ success: true, data: row, subActivated: outOfSync && hasSub });
    if (outOfSync) {
      const opts = { path: '/', sameSite: 'lax' as const, httpOnly: true, secure: process.env.NODE_ENV === 'production' };
      if (hasSub) {
        const secsLeft = Math.max(60, Math.ceil((new Date(row.end_date).getTime() - Date.now()) / 1000));
        response.cookies.set('mr_token', generateUserToken(userId, secsLeft), { ...opts, maxAge: secsLeft });
        response.cookies.set('mr_has_sub', '1', { ...opts, maxAge: secsLeft });
      } else {
        response.cookies.set('mr_has_sub', '0', { ...opts, maxAge: 60 * 60 * 24 * 3 });
      }
    }
    return response;
  } catch (err) {
    console.error('profile error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
