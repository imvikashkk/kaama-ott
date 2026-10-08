import type { NextRequest } from 'next/server';
import pool from './db';
import { activateSubscription } from './activateSubscription';
import { getUpiOrderStatus } from './upiGateway';

const INTERVAL_MS = 5000;
// Orders older than this are no longer polled — UPI QR links expire well before it
const WINDOW = '1 hour';
// Still pending this long after the QR expiry → give up and mark failed
const EXPIRY_GRACE_MS = 5 * 60 * 1000;

export type SettleResult =
  | { state: 'paid'; freshToken: string }
  | { state: 'failed' }
  | { state: 'pending' };

// Shared by /api/payment/verify and the background watcher — the gateway status is the source of truth
export async function settleUpiOrder(
  txnId: string,
  expectedAmount: number,
  req: NextRequest | null,
): Promise<SettleResult> {
  const check = await getUpiOrderStatus(txnId);
  if (!check) return { state: 'pending' };

  if (check.failed) {
    await pool.query(
      `UPDATE payments SET status='failed', gateway_response=$1, updated_at=NOW()
       WHERE txn_id=$2 AND status='pending'`,
      [JSON.stringify(check.raw), txnId],
    );
    return { state: 'failed' };
  }

  if (!check.paid) return { state: 'pending' };

  // Guard against a partial payment being marked as a full plan purchase
  if (check.amount !== null && check.amount + 0.001 < expectedAmount) {
    console.error('UPI amount mismatch:', txnId, check.amount, expectedAmount);
    return { state: 'pending' };
  }

  const result = await activateSubscription(txnId, check.gatewayTxnId, check.raw, check.amount ?? expectedAmount, '', '', req);
  return result ? { state: 'paid', freshToken: result.freshToken } : { state: 'pending' };
}

async function tick() {
  const res = await pool.query(
    `SELECT txn_id, amount, created_at, gateway_response->>'expiresAt' AS expires_at
     FROM payments
     WHERE status = 'pending' AND created_at > NOW() - INTERVAL '${WINDOW}'`,
  );

  for (const row of res.rows) {
    try {
      const { state } = await settleUpiOrder(row.txn_id, Number(row.amount), null);
      if (state !== 'pending') {
        console.log(`payment watcher: ${row.txn_id} → ${state}`);
        continue;
      }

      const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : NaN;
      if (!Number.isNaN(expiresAt) && Date.now() > expiresAt + EXPIRY_GRACE_MS) {
        await pool.query(
          `UPDATE payments SET status='failed', updated_at=NOW() WHERE txn_id=$1 AND status='pending'`,
          [row.txn_id],
        );
        console.log(`payment watcher: ${row.txn_id} → expired`);
      }
    } catch (err) {
      console.error('payment watcher error:', row.txn_id, err);
    }
  }
}

const g = globalThis as typeof globalThis & { __paymentWatcher?: ReturnType<typeof setInterval> };

// Idempotent — dev hot reload re-runs instrumentation, so keep a single timer per process
export function startPaymentWatcher() {
  if (g.__paymentWatcher) return;
  let running = false;
  g.__paymentWatcher = setInterval(async () => {
    // Skip a tick if the previous one is still waiting on the gateway
    if (running) return;
    running = true;
    try {
      await tick();
    } catch (err) {
      console.error('payment watcher tick error:', err);
    } finally {
      running = false;
    }
  }, INTERVAL_MS);
  console.log('payment watcher started');
}
