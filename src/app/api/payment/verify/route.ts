import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { activateSubscription } from '@/lib/activateSubscription';
import { settleUpiOrder } from '@/lib/paymentWatcher';
import { verifyUserToken } from '@/lib/userAuth';

function setCookies(res: NextResponse, token: string, maxAge: number, userId: string, mobile: string) {
  const opts = { path: '/', maxAge, sameSite: 'lax' as const, httpOnly: true, secure: process.env.NODE_ENV === 'production' };
  res.cookies.set('mr_has_sub', '1', opts);
  res.cookies.set('mr_token', token, opts);
  res.cookies.set('mr_uid', userId, { ...opts, httpOnly: false });
  res.cookies.set('mr_mob', mobile, { ...opts, httpOnly: false });
}

export async function POST(req: NextRequest) {
  try {
    const { txnId } = await req.json();

    if (!txnId) {
      return NextResponse.json({ success: false, message: 'txnId required' }, { status: 400 });
    }

    const payRes = await pool.query(
      `SELECT p.id, p.user_id, p.status, p.amount, u.mobile
       FROM payments p JOIN users u ON u.id = p.user_id
       WHERE p.txn_id = $1`,
      [txnId],
    );

    if (payRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment record not found' });
    }

    const pay = payRes.rows[0];

    // Only the paying user may verify — otherwise a guessed txnId would hand out their session
    if (verifyUserToken(req.cookies.get('mr_token')?.value) !== pay.user_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const buildResponse = (freshToken: string) => {
      const response = NextResponse.json({ success: true });
      const maxAge   = 216000;
      setCookies(response, freshToken, maxAge, String(pay.user_id), pay.mobile ?? '');
      return response;
    };

    // Fast path: background watcher already processed — activateSubscription just returns a fresh token
    if (pay.status === 'success') {
      const result = await activateSubscription(txnId, null, {}, 0, '', '', req);
      if (result) return buildResponse(result.freshToken);
    }

    if (pay.status === 'failed') {
      return NextResponse.json({ success: false, message: 'Payment failed' });
    }

    const settled = await settleUpiOrder(txnId, Number(pay.amount), req);
    if (settled.state === 'paid') return buildResponse(settled.freshToken);
    if (settled.state === 'failed') return NextResponse.json({ success: false, message: 'Payment failed' });
    return NextResponse.json({ success: false, message: 'Payment not completed yet' });
  } catch (err) {
    console.error('payment/verify error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
