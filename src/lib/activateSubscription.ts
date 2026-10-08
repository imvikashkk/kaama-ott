import { createHash } from 'crypto';
import pool from './db';
import type { NextRequest } from 'next/server';
import { generateUserToken } from './userAuth';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

async function resolvePixel(campaignSlug: string): Promise<{ pixelId: string; accessToken: string } | null> {
  if (!campaignSlug) return null;
  const res = await pool.query(`SELECT pixel_id, access_token FROM pixels WHERE slug = $1`, [campaignSlug]);
  if (res.rows.length === 0) return null;
  return { pixelId: res.rows[0].pixel_id, accessToken: res.rows[0].access_token };
}

async function sendMetaPurchaseEvent({
  pixelId, accessToken, eventId, value, ip, userAgent, phone, sourceUrl, fbp, fbc,
  metaCampaignId, metaCampaignName,
}: {
  pixelId: string; accessToken: string;
  eventId: string; value: number; ip: string; userAgent: string;
  phone: string; sourceUrl: string; fbp: string; fbc: string;
  metaCampaignId?: string | null; metaCampaignName?: string | null;
}): Promise<string | null> {
  try {
    const customData: Record<string, unknown> = { currency: 'INR', value };
    if (metaCampaignId)   customData.campaign_id   = metaCampaignId;
    if (metaCampaignName) customData.campaign_name = metaCampaignName;

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: {
          client_ip_address: ip,
          client_user_agent: userAgent,
          ph: sha256(normalizePhone(phone)),
          ...(fbp && { fbp }),
          ...(fbc && { fbc }),
        },
        custom_data: customData,
      }],
    };
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const result = await response.json();
    console.log('Meta CAPI:', result);
    if (result.error) return result.error.message ?? 'CAPI error';
    return null;
  } catch (err) {
    console.error('Meta CAPI error:', err);
    return String(err);
  }
}

export async function activateSubscription(
  txnId: string,
  gatewayTxnId: string | null,
  rawData: object,
  amount: number,
  fbp: string,
  fbc: string,
  req: NextRequest | null, // null when called from the background watcher
): Promise<{ freshToken: string; newEndDate: Date; alreadyProcessed?: boolean } | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const payRes = await pool.query(
    `SELECT id, user_id, plan_id, status, campaign_slug,
            fbp, fbc, meta_campaign_id, meta_campaign_name, amount, client_ip, user_agent
     FROM payments WHERE txn_id = $1`,
    [txnId],
  );
  if (payRes.rows.length === 0) return null;
  const pay = payRes.rows[0];

  const userRes = await pool.query(`SELECT id, mobile FROM users WHERE id = $1`, [pay.user_id]);
  const user = userRes.rows[0];

  const makeToken = (endDate: Date) => {
    if (!user) return '';
    const secsLeft = Math.max(60, Math.ceil((endDate.getTime() - Date.now()) / 1000));
    return generateUserToken(user.id, secsLeft);
  };

  if (pay.status === 'success') {
    // Already processed — look up existing subscription end_date for token
    const existing = await pool.query(
      `SELECT end_date FROM subscriptions WHERE user_id=$1 AND status='active' AND end_date > NOW() ORDER BY end_date DESC LIMIT 1`,
      [pay.user_id],
    );
    const endDate = existing.rows.length > 0 ? new Date(existing.rows[0].end_date) : new Date(Date.now() + 60000);
    return { freshToken: makeToken(endDate), newEndDate: endDate, alreadyProcessed: true };
  }

  const planRes = await pool.query(`SELECT duration_days FROM plans WHERE id = $1`, [pay.plan_id]);
  if (planRes.rows.length === 0) return null;
  const { duration_days } = planRes.rows[0];

  const client = await pool.connect();
  let newEndDate: Date = new Date();
  let paymentId: number | null = null;

  try {
    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE payments SET status='success', gateway_txn_id=$1, gateway_response=$2, updated_at=NOW()
       WHERE txn_id=$3 AND status='pending'
       RETURNING id`,
      [gatewayTxnId, JSON.stringify(rawData), txnId],
    );

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
      const existing = await pool.query(
        `SELECT end_date FROM subscriptions WHERE user_id=$1 AND status='active' AND end_date > NOW() ORDER BY end_date DESC LIMIT 1`,
        [pay.user_id],
      );
      const endDate = existing.rows.length > 0 ? new Date(existing.rows[0].end_date) : new Date(Date.now() + 60000);
      return { freshToken: makeToken(endDate), newEndDate: endDate, alreadyProcessed: true };
    }

    paymentId = updateRes.rows[0].id;

    const existingRes = await client.query(
      `SELECT end_date FROM subscriptions
       WHERE user_id=$1 AND status='active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [pay.user_id],
    );

    const baseDate = existingRes.rows.length > 0
      ? new Date(existingRes.rows[0].end_date)
      : new Date();

    newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + duration_days);

    await client.query(
      `UPDATE subscriptions SET status='cancelled' WHERE user_id=$1 AND status='active'`,
      [pay.user_id],
    );
    await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, end_date, status, payment_id) VALUES ($1,$2,$3,'active',$4)`,
      [pay.user_id, pay.plan_id, newEndDate, paymentId],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
  client.release();

  if (paymentId) {
    // Attribution used — remove from phone_attributions so next visit tracks fresh
    if (user?.mobile) {
      await pool.query(`DELETE FROM phone_attributions WHERE mobile = $1`, [user.mobile]).catch(() => {});
    }

    // Prefer values saved at initiate — the paying browser, not whoever triggered activation
    const ip = pay.client_ip || req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = pay.user_agent || req?.headers.get('user-agent') || 'Unknown';

    const pixel = await resolvePixel(pay.campaign_slug ?? '');
    if (pixel) {
      const capiError = await sendMetaPurchaseEvent({
        pixelId: pixel.pixelId,
        accessToken: pixel.accessToken,
        eventId: txnId,
        value: amount || parseFloat(pay.amount) || 0,
        ip,
        userAgent,
        phone: user?.mobile ?? '',
        sourceUrl: `${appUrl}/subscription`,
        fbp: pay.fbp || fbp || '',
        fbc: pay.fbc || fbc || '',
        metaCampaignId:   pay.meta_campaign_id,
        metaCampaignName: pay.meta_campaign_name,
      });

      await pool.query(
        `UPDATE payments SET capi_sent=$1, capi_error=$2 WHERE id=$3`,
        [capiError === null, capiError, paymentId],
      );
    }
  }

  return { freshToken: makeToken(newEndDate), newEndDate };
}
