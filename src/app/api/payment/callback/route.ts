import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { settleUpiOrder } from '@/lib/paymentWatcher';

// Api Seva Hub callback: GET ?amount=&status=&txnid=&utr=&payment_mode=&payid=&apitxnid=
// It is unsigned, so it's only a nudge — settleUpiOrder re-checks the order via the gateway's query API
async function handle(params: URLSearchParams) {
  try {
    const txnId = params.get('txnid') ?? params.get('apitxnid');
    if (!txnId) return new NextResponse('OK');

    const payRes = await pool.query(`SELECT txn_id, amount, status FROM payments WHERE txn_id = $1`, [txnId]);
    const pay = payRes.rows[0];
    if (!pay) {
      console.error('payment callback: unknown txn', txnId);
      return new NextResponse('OK');
    }

    if (pay.status === 'pending') {
      const { state } = await settleUpiOrder(pay.txn_id, Number(pay.amount), null);
      console.log(`payment callback: ${pay.txn_id} (${params.get('status')}) → ${state}`);
    }
    return new NextResponse('OK');
  } catch (err) {
    console.error('payment callback error:', err);
    return new NextResponse('ERROR', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req.nextUrl.searchParams);
}

// Accept a POST too (JSON or form) in case the gateway switches method
export async function POST(req: NextRequest) {
  const text = await req.text();
  let params = new URLSearchParams(text);
  try {
    params = new URLSearchParams(Object.entries(JSON.parse(text)).map(([k, v]) => [k, String(v)]));
  } catch {}
  for (const [k, v] of req.nextUrl.searchParams) if (!params.has(k)) params.set(k, v);
  return handle(params);
}
