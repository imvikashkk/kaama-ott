import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/userAuth';
import { createUpiOrder } from '@/lib/upiGateway';

export async function POST(req: NextRequest) {
  try {
    const userId = verifyUserToken(req.cookies.get('mr_token')?.value);
    if (!userId)
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );

    const body = await req.json();
    const { planId } = body;
    // _fbp/_fbc from request cookies are most reliable — fallback to body values
    let fbp: string = req.cookies.get('_fbp')?.value || body.fbp || '';
    let fbc: string = req.cookies.get('_fbc')?.value || body.fbc || '';
    let campaignSlug: string = body.campaignSlug ?? '';
    let metaCampaignId: string | null = body.metaCampaignId ?? null;
    let metaCampaignName: string | null = body.metaCampaignName ?? null;

    if (!planId) {
      return NextResponse.json(
        { success: false, message: 'planId required' },
        { status: 400 },
      );
    }

    const [planRes, userRes] = await Promise.all([
      pool.query(
        `SELECT id, name, price FROM plans WHERE id = $1 AND is_active = true`,
        [planId],
      ),
      pool.query(`SELECT id, mobile FROM users WHERE id = $1`, [userId]),
    ]);

    if (planRes.rows.length === 0)
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: 404 },
      );
    if (userRes.rows.length === 0)
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 },
      );

    const plan = planRes.rows[0];
    const user = userRes.rows[0];

    // Fallback to stored first-touch attribution if current session has no campaign
    if (!campaignSlug && user.mobile) {
      const attrRes = await pool.query(
        `SELECT campaign_slug, meta_campaign_id, meta_campaign_name, fbp, fbc FROM phone_attributions WHERE mobile = $1`,
        [user.mobile],
      );
      if (attrRes.rows.length > 0) {
        const attr = attrRes.rows[0];
        campaignSlug = attr.campaign_slug || campaignSlug;
        metaCampaignId = attr.meta_campaign_id || metaCampaignId;
        metaCampaignName = attr.meta_campaign_name || metaCampaignName;
        if (!fbp && attr.fbp) fbp = attr.fbp;
        if (!fbc && attr.fbc) fbc = attr.fbc;
      }
    }

    const order = await createUpiOrder(Number(plan.price), `Kaama ${plan.name} U${userId}`, {
      userId: Number(userId),
      mobile: user.mobile ?? '',
    });

    if ('error' in order) {
      return NextResponse.json(
        { success: false, message: order.error },
        { status: 400 },
      );
    }

    // Gateway order id doubles as our txn id — the status page and verify route key on it
    const txnId = order.orderId;

    await pool.query(
      `INSERT INTO payments (user_id, plan_id, txn_id, amount, status, campaign_slug, cf_order_id, fbp, fbc, meta_campaign_id, meta_campaign_name, gateway_response, client_ip, user_agent)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        userId,
        planId,
        txnId,
        plan.price,
        campaignSlug || null,
        order.gatewayOrderId || order.orderId,
        fbp,
        fbc,
        metaCampaignId,
        metaCampaignName,
        JSON.stringify(order),
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        req.headers.get('user-agent') || null,
      ],
    );

    return NextResponse.json({
      success: true,
      data: { txnId, amount: plan.price },
    });
  } catch (err) {
    console.error('payment/initiate error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}
