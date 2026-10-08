import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/userAuth';

// Returns the UPI link / QR saved at initiate time so the pay page can render it (survives refresh)
export async function GET(req: NextRequest) {
  try {
    const userId = verifyUserToken(req.cookies.get('mr_token')?.value);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const txnId = req.nextUrl.searchParams.get('txnId');
    if (!txnId) {
      return NextResponse.json({ success: false, message: 'txnId required' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT p.user_id, p.status, p.amount, p.gateway_response, pl.name AS plan_name
       FROM payments p JOIN plans pl ON pl.id = p.plan_id
       WHERE p.txn_id = $1`,
      [txnId],
    );
    const pay = res.rows[0];
    if (!pay || pay.user_id !== userId) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const g = pay.status === 'pending' ? (pay.gateway_response ?? {}) : {};
    return NextResponse.json({
      success: true,
      data: {
        status: pay.status,
        amount: Number(pay.amount),
        planName: pay.plan_name,
        payeeName: g.payeeName ?? '',
        upiLink: g.upiLink ?? '',
        qrCode: g.qrCode ?? '',
        expiresAt: g.expiresAt ?? null,
      },
    });
  } catch (err) {
    console.error('payment/order error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
