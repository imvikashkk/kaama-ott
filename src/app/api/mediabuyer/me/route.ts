import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/mbAuth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('mr_mb_token')?.value;
  const clientId = verifyToken(token);
  if (!clientId) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const [profileRes, pixelsRes, statsRes, paymentsRes] = await Promise.all([
      pool.query(
        `SELECT id, name, username, email, phone FROM clients WHERE id = $1 AND is_active = true`,
        [clientId],
      ),
      pool.query(
        `SELECT id, slug, label, pixel_id, is_default FROM pixels WHERE client_id = $1 ORDER BY is_default DESC, label ASC`,
        [clientId],
      ),
      pool.query(
        `SELECT
           COUNT(*)                                          AS total,
           COUNT(*) FILTER (WHERE p.status = 'success')     AS successful,
           COUNT(*) FILTER (WHERE p.status = 'pending')     AS pending,
           COUNT(*) FILTER (WHERE p.status = 'failed')      AS failed,
           COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS revenue
         FROM payments p
         JOIN pixels px ON px.slug = p.campaign_slug
         WHERE px.client_id = $1`,
        [clientId],
      ),
      pool.query(
        `SELECT
           p.id, p.amount, p.status, p.campaign_slug, p.created_at,
           u.mobile AS user_mobile
         FROM payments p
         JOIN pixels px ON px.slug = p.campaign_slug
         JOIN users u ON u.id = p.user_id
         WHERE px.client_id = $1
         ORDER BY p.created_at DESC
         LIMIT 50`,
        [clientId],
      ),
    ]);

    if (profileRes.rows.length === 0) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      profile:  profileRes.rows[0],
      pixels:   pixelsRes.rows,
      stats:    statsRes.rows[0],
      payments: paymentsRes.rows,
    });
  } catch (err) {
    console.error('mb me error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
