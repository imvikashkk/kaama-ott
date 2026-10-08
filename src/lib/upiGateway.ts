// Server-only client for the Api Seva Hub UPI collection gateway — the token comes from env and is never exposed to the browser
import crypto from 'crypto';
import QRCode from 'qrcode';

// The gateway returns no expiry — the pay sheet counts down to this and the watcher gives up after it
const EXPIRY_MINUTES = 15;

const cfg = () => ({
  baseUrl: (process.env.APISEVA_BASE_URL ?? '').replace(/\/+$/, ''),
  token: process.env.APISEVA_TOKEN ?? '',
  payeeName: process.env.APISEVA_PAYEE_NAME ?? 'Kaama',
});

export interface UpiOrder {
  orderId: string;
  gatewayOrderId?: string;
  amount: number;
  payeeName: string;
  vpa: string;
  upiLink: string;
  qrCode: string;
  expiresAt: string | null;
}

export interface UpiOrderStatus {
  paid: boolean;
  failed: boolean;
  status: string;
  gatewayTxnId: string | null;
  // null when the gateway doesn't report it — the dynamic QR already fixes the amount
  amount: number | null;
  raw: object;
}

async function post(path: string, body: object) {
  const c = cfg();
  const res = await fetch(`${c.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: c.token, ...body }),
    cache: 'no-store',
  });
  return { ok: res.ok, data: await res.json().catch(() => null) };
}

export async function createUpiOrder(
  amount: number,
  _note: string,
  customer: { userId: number; mobile: string },
): Promise<UpiOrder | { error: string }> {
  const c = cfg();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
  if (!c.baseUrl || !c.token) {
    console.error('Api Seva env missing (APISEVA_BASE_URL / APISEVA_TOKEN)');
    return { error: 'Payment init failed' };
  }

  // Doubles as our txn_id — alphanumeric only, unique per attempt
  const txnid = `KS${customer.userId}T${Date.now()}${crypto.randomInt(100, 999)}`;
  const mobile = customer.mobile.replace(/\D/g, '').slice(-10);

  try {
    const { ok, data } = await post('/v/qr/collection', {
      type: 'dynamic',
      amount: String(amount),
      // Users only sign up with a mobile number — derive name/email
      name: 'Kaama User',
      email: `${mobile || customer.userId}@kaama.online`,
      mobile,
      txnid,
      callback: `${appUrl}/api/payment/callback`,
    });
    if (!ok || data?.statuscode !== 'TXN' || !data.upi_string) {
      console.error('Api Seva create failed:', data?.statuscode ?? '', data?.message ?? '');
      return { error: 'Payment init failed' };
    }

    const upiLink = String(data.upi_string);
    return {
      orderId: txnid,
      gatewayOrderId: String(data.upi_tr ?? ''),
      amount,
      payeeName: c.payeeName,
      vpa: upiLink.match(/[?&]pa=([^&]+)/)?.[1] ?? '',
      upiLink,
      // The order's `tr` travels in the QR, so a scanned payment is still matched to this order
      qrCode: await QRCode.toDataURL(upiLink, { width: 480, margin: 1 }),
      expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString(),
    };
  } catch (err) {
    console.error('Api Seva create error:', err);
    return { error: 'Payment init failed' };
  }
}

export async function getUpiOrderStatus(txnid: string): Promise<UpiOrderStatus | null> {
  try {
    const { ok, data } = await post('/v/qr/query', { txnid });
    if (!ok || data?.statuscode !== 'TXN' || !data.txn_status) return null;
    const status = String(data.txn_status).toUpperCase();
    const amount = parseFloat(data.amount);
    return {
      paid: status === 'SUCCESS',
      failed: status === 'FAILED',
      status,
      gatewayTxnId: data.bankutr ?? null,
      amount: Number.isFinite(amount) ? amount : null,
      raw: data,
    };
  } catch (err) {
    console.error('Api Seva status error:', err);
    return null;
  }
}
