import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/mbAuth';

export async function GET(req: NextRequest) {
  const token    = req.cookies.get('mr_mb_token')?.value;
  const clientId = verifyToken(token);
  if (!clientId) return NextResponse.json({ success: false }, { status: 401 });

  const url        = new URL(req.url);
  const page       = Math.max(1, parseInt(url.searchParams.get('page')   || '1'));
  const status     = url.searchParams.get('status')     || 'all';
  const from       = url.searchParams.get('from')       || '';
  const to         = url.searchParams.get('to')         || '';
  const slugSearch = url.searchParams.get('slug_search')|| '';
  const limit      = 100;
  const offset     = (page - 1) * limit;

  const validStatuses = ['success', 'pending', 'failed'];

  const buildConds = () => {
    const conds: string[] = [`px.client_id = $1`];
    const params: (string | number)[] = [clientId];
    if (from) { params.push(from); conds.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${params.length}::date`); }
    if (to)   { params.push(to);   conds.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $${params.length}::date`); }
    if (validStatuses.includes(status)) { params.push(status); conds.push(`p.status = $${params.length}`); }
    if (slugSearch) { params.push(`%${slugSearch}%`); conds.push(`p.campaign_slug ILIKE $${params.length}`); }
    return { conds, params };
  };

  try {
    const { conds: dataConds, params: dataParams } = buildConds();
    const { conds: cntConds,  params: cntParams  } = buildConds();
    const { conds: stConds,   params: stParams   } = buildConds();

    const [dataRes, cntRes, statsRes] = await Promise.all([
      pool.query(
        `SELECT p.id, u.mobile AS user_mobile, p.amount, p.status, p.campaign_slug,
                p.meta_campaign_id, p.meta_campaign_name, p.created_at,
                px.pixel_id, px.ad_account_id
         FROM payments p
         JOIN pixels px ON px.slug = p.campaign_slug
         JOIN users  u  ON u.id   = p.user_id
         WHERE ${dataConds.join(' AND ')}
         ORDER BY p.created_at DESC
         LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`,
        [...dataParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*) FROM payments p
         JOIN pixels px ON px.slug = p.campaign_slug
         WHERE ${cntConds.join(' AND ')}`,
        cntParams,
      ),
      pool.query(
        `SELECT
           COUNT(*)                                              AS total,
           COUNT(*) FILTER (WHERE p.status = 'success')         AS successful,
           COUNT(*) FILTER (WHERE p.status = 'pending')         AS pending,
           COUNT(*) FILTER (WHERE p.status = 'failed')          AS failed,
           COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS revenue
         FROM payments p
         JOIN pixels px ON px.slug = p.campaign_slug
         WHERE ${stConds.join(' AND ')}`,
        stParams,
      ),
    ]);

    return NextResponse.json({
      success: true,
      data:    dataRes.rows,
      total:   parseInt(cntRes.rows[0].count),
      stats:   statsRes.rows[0],
      page,
      limit,
    });
  } catch (err) {
    console.error('mb payments error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
