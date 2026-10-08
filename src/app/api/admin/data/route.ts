import { verifyAdminToken } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('mr_admin')?.value)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const url          = new URL(req.url);
  const page         = Math.max(1, parseInt(url.searchParams.get('page')      || '1'));
  const statusFilter = url.searchParams.get('status')    || 'all';
  const from         = url.searchParams.get('from')      || '';
  const to           = url.searchParams.get('to')        || '';
  const clientId     = url.searchParams.get('client_id')   || '';
  const slugSearch   = url.searchParams.get('slug_search') || '';
  const mobileSearch = (url.searchParams.get('mobile') || '').replace(/\D/g, '');
  const limit        = 100;
  const offset       = (page - 1) * limit;

  const validStatuses = ['success', 'pending', 'failed'];

  // ── data query ──────────────────────────────────────────────────────────────
  const dataConditions: string[] = [];
  const dataParams: (string | number)[] = [];

  if (from) {
    dataParams.push(from);
    dataConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${dataParams.length}::date`);
  }
  if (to) {
    dataParams.push(to);
    dataConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $${dataParams.length}::date`);
  }
  if (validStatuses.includes(statusFilter)) {
    dataParams.push(statusFilter);
    dataConditions.push(`p.status = $${dataParams.length}`);
  }
  if (clientId === 'organic') {
    dataConditions.push(`p.campaign_slug IS NULL`);
  } else if (clientId) {
    dataParams.push(clientId);
    dataConditions.push(`c.id = $${dataParams.length}`);
  }
  if (slugSearch) {
    dataParams.push(`%${slugSearch}%`);
    dataConditions.push(`p.campaign_slug ILIKE $${dataParams.length}`);
  }
  if (mobileSearch) {
    dataParams.push(`%${mobileSearch}%`);
    dataConditions.push(`p.user_id IN (SELECT id FROM users WHERE mobile LIKE $${dataParams.length})`);
  }
  const dataWhere = dataConditions.length ? `WHERE ${dataConditions.join(' AND ')}` : '';

  // ── count query (with JOINs to support client_id filter) ─────────────────
  const countConditions: string[] = [];
  const countParams: (string | number)[] = [];

  if (from) {
    countParams.push(from);
    countConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${countParams.length}::date`);
  }
  if (to) {
    countParams.push(to);
    countConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $${countParams.length}::date`);
  }
  if (validStatuses.includes(statusFilter)) {
    countParams.push(statusFilter);
    countConditions.push(`p.status = $${countParams.length}`);
  }
  if (clientId === 'organic') {
    countConditions.push(`p.campaign_slug IS NULL`);
  } else if (clientId) {
    countParams.push(clientId);
    countConditions.push(`c.id = $${countParams.length}`);
  }
  if (slugSearch) {
    countParams.push(`%${slugSearch}%`);
    countConditions.push(`p.campaign_slug ILIKE $${countParams.length}`);
  }
  if (mobileSearch) {
    countParams.push(`%${mobileSearch}%`);
    countConditions.push(`p.user_id IN (SELECT id FROM users WHERE mobile LIKE $${countParams.length})`);
  }
  const countWhere = countConditions.length ? `WHERE ${countConditions.join(' AND ')}` : '';

  // ── stats query ──────────────────────────────────────────────────────────
  const statsConditions: string[] = [];
  const statsParams: (string | number)[] = [];

  if (from) {
    statsParams.push(from);
    statsConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${statsParams.length}::date`);
  }
  if (to) {
    statsParams.push(to);
    statsConditions.push(`(p.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $${statsParams.length}::date`);
  }
  if (clientId === 'organic') {
    statsConditions.push(`p.campaign_slug IS NULL`);
  } else if (clientId) {
    statsParams.push(clientId);
    statsConditions.push(`c.id = $${statsParams.length}`);
  }
  if (slugSearch) {
    statsParams.push(`%${slugSearch}%`);
    statsConditions.push(`p.campaign_slug ILIKE $${statsParams.length}`);
  }
  if (mobileSearch) {
    statsParams.push(`%${mobileSearch}%`);
    statsConditions.push(`p.user_id IN (SELECT id FROM users WHERE mobile LIKE $${statsParams.length})`);
  }
  const statsWhere = statsConditions.length ? `WHERE ${statsConditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes, statsRes] = await Promise.all([
      pool.query(
        `SELECT
           u.id         AS user_id,
           u.mobile     AS user_number,
           p.amount     AS user_payment,
           p.status     AS payment_status,
           p.created_at AS date_time,
           p.txn_id,
           p.campaign_slug,
           c.name          AS media_buyer_name,
           px.pixel_id,
           px.ad_account_id,
           p.meta_campaign_id,
           p.meta_campaign_name
         FROM payments p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN pixels px ON px.slug = p.campaign_slug
         LEFT JOIN clients c ON c.id = px.client_id
         ${dataWhere}
         ORDER BY p.created_at DESC
         LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`,
        [...dataParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*)
         FROM payments p
         LEFT JOIN pixels px ON px.slug = p.campaign_slug
         LEFT JOIN clients c ON c.id = px.client_id
         ${countWhere}`,
        countParams,
      ),
      pool.query(
        `SELECT
           COUNT(*)                                          AS total_payments,
           COUNT(*) FILTER (WHERE p.status = 'success')     AS total_successful,
           COUNT(*) FILTER (WHERE p.status = 'pending')     AS total_pending,
           COUNT(*) FILTER (WHERE p.status = 'failed')      AS total_failed,
           COUNT(DISTINCT p.user_id)                        AS total_users
         FROM payments p
         LEFT JOIN pixels px ON px.slug = p.campaign_slug
         LEFT JOIN clients c ON c.id = px.client_id
         ${statsWhere}`,
        statsParams,
      ),
    ]);

    return NextResponse.json({
      success: true,
      data:  dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      stats: statsRes.rows[0],
      page,
      limit,
    });
  } catch (err) {
    console.error('admin data error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
