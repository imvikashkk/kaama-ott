import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/userAuth';

export async function GET(req: NextRequest) {
  try {
    const userId = verifyUserToken(req.cookies.get('mr_token')?.value);
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const res = await pool.query(
      `SELECT s.id, s.status, s.start_date, s.end_date,
              p.name AS plan_name, p.price, p.duration_days,
              pay.txn_id, pay.gateway_txn_id
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       LEFT JOIN payments pay ON pay.id = s.payment_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId],
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (err) {
    console.error('subscription error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
