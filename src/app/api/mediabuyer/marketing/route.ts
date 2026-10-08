import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/mbAuth';

// Dates are interpolated into SQL below — only strict YYYY-MM-DD may pass
const validDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

export async function GET(req: NextRequest) {
  const token    = req.cookies.get('mr_mb_token')?.value;
  const clientId = verifyToken(token);
  if (!clientId) return NextResponse.json({ success: false }, { status: 401 });

  const url        = new URL(req.url);
  const from       = validDate(url.searchParams.get('from'));
  const to         = validDate(url.searchParams.get('to'));
  const slugSearch = url.searchParams.get('slug_search') || '';

  const datePayConds: string[] = [];
  if (from) datePayConds.push(`(pay.created_at AT TIME ZONE 'Asia/Kolkata')::date >= '${from}'::date`);
  if (to)   datePayConds.push(`(pay.created_at AT TIME ZONE 'Asia/Kolkata')::date <= '${to}'::date`);
  const joinFilter = [`pay.status = 'success'`, ...datePayConds].filter(Boolean).join(' AND ');

  const pixelFilters: string[] = [`p.client_id = ${clientId}`];
  if (slugSearch) pixelFilters.push(`p.slug ILIKE '%${slugSearch.replace(/'/g, "''")}%'`);
  const pixelWhere = `AND ${pixelFilters.join(' AND ')}`;

  const overviewConds: string[] = [
    `status = 'success'`,
    `campaign_slug IN (SELECT slug FROM pixels WHERE client_id = ${clientId})`,
  ];
  if (from) overviewConds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date >= '${from}'::date`);
  if (to)   overviewConds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date <= '${to}'::date`);
  if (slugSearch) overviewConds.push(`campaign_slug ILIKE '%${slugSearch.replace(/'/g, "''")}%'`);
  const overviewWhere = overviewConds.join(' AND ');

  const metaConds: string[] = [
    `pay.status = 'success'`,
    `pay.campaign_slug IN (SELECT slug FROM pixels WHERE client_id = ${clientId})`,
  ];
  if (from) metaConds.push(`(pay.created_at AT TIME ZONE 'Asia/Kolkata')::date >= '${from}'::date`);
  if (to)   metaConds.push(`(pay.created_at AT TIME ZONE 'Asia/Kolkata')::date <= '${to}'::date`);
  if (slugSearch) metaConds.push(`pay.campaign_slug ILIKE '%${slugSearch.replace(/'/g, "''")}%'`);
  const metaWhere = metaConds.join(' AND ');

  try {
    const [overviewRes, byPixelRes, byMetaRes, pixelsRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                        AS total_purchases,
          COUNT(*) FILTER (WHERE capi_sent = true)       AS capi_sent,
          COUNT(*) FILTER (WHERE capi_sent = false)      AS capi_issues
        FROM payments WHERE ${overviewWhere}
      `),
      pool.query(`
        SELECT p.id, p.slug, p.label, p.pixel_id, p.ad_account_id,
               COUNT(pay.id)                                           AS purchases,
               COUNT(pay.id) FILTER (WHERE pay.capi_sent = true)     AS capi_sent,
               COUNT(pay.id) FILTER (WHERE pay.capi_sent = false)    AS capi_issues
        FROM pixels p
        LEFT JOIN payments pay ON pay.campaign_slug = p.slug AND ${joinFilter}
        WHERE 1=1 ${pixelWhere}
        GROUP BY p.id, p.slug, p.label, p.pixel_id, p.ad_account_id
        ORDER BY purchases DESC
      `),
      pool.query(`
        SELECT pay.meta_campaign_id, pay.meta_campaign_name, pay.campaign_slug,
               p.label AS pixel_label, p.pixel_id, p.ad_account_id,
               COUNT(pay.id)                                           AS purchases,
               COUNT(pay.id) FILTER (WHERE pay.capi_sent = true)     AS capi_sent,
               COUNT(pay.id) FILTER (WHERE pay.capi_sent = false)    AS capi_issues
        FROM payments pay
        LEFT JOIN pixels p ON p.slug = pay.campaign_slug
        WHERE ${metaWhere} AND pay.meta_campaign_id IS NOT NULL
        GROUP BY pay.meta_campaign_id, pay.meta_campaign_name, pay.campaign_slug,
                 p.label, p.pixel_id, p.ad_account_id
        ORDER BY purchases DESC
      `),
      pool.query(
        `SELECT id, slug, label, pixel_id, ad_account_id, is_default
         FROM pixels WHERE client_id = $1 ORDER BY created_at DESC`,
        [clientId],
      ),
    ]);

    return NextResponse.json({
      success:          true,
      overview:         overviewRes.rows[0],
      by_pixel:         byPixelRes.rows,
      by_meta_campaign: byMetaRes.rows,
      pixels:           pixelsRes.rows,
    });
  } catch (err) {
    console.error('mb marketing error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
