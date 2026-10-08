import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminToken } from '@/lib/adminAuth';

function authCheck(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('mr_admin')?.value);
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');
  const search = url.searchParams.get('search') || '';
  const pageParam = url.searchParams.get('page');
  const paginate = pageParam !== null;
  const page = Math.max(1, parseInt(pageParam || '1'));
  const LIMIT = 10;
  const offset = (page - 1) * LIMIT;

  try {
    const conds: string[] = [];
    const params: unknown[] = [];

    if (clientId) { params.push(parseInt(clientId)); conds.push(`px.client_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      conds.push(`(px.slug ILIKE $${i} OR px.label ILIKE $${i} OR px.pixel_id ILIKE $${i} OR COALESCE(px.ad_account_id,'') ILIKE $${i})`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const baseSelect = `SELECT px.id, px.slug, px.label, px.pixel_id, px.access_token, px.ad_account_id,
            px.is_default, px.client_id, px.created_at, c.name AS client_name
     FROM pixels px LEFT JOIN clients c ON c.id = px.client_id ${where}`;

    if (paginate) {
      const [rows, cnt] = await Promise.all([
        pool.query(`${baseSelect} ORDER BY px.is_default DESC, px.created_at DESC LIMIT ${LIMIT} OFFSET ${offset}`, params),
        pool.query(`SELECT COUNT(*) FROM pixels px ${where}`, params),
      ]);
      const total = parseInt(cnt.rows[0].count);
      return NextResponse.json({ success: true, data: rows.rows, total, page, totalPages: Math.ceil(total / LIMIT) || 1 });
    } else {
      const res = await pool.query(`${baseSelect} ORDER BY px.is_default DESC, px.created_at ASC`, params);
      return NextResponse.json({ success: true, data: res.rows });
    }
  } catch (err) {
    console.error('pixels GET error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { slug, label, pixel_id, access_token, ad_account_id = null, is_default = false, client_id } = await req.json();

    if (!slug || !label || !pixel_id || !access_token) {
      return NextResponse.json({ success: false, message: 'slug, label, pixel_id, access_token required' }, { status: 400 });
    }
    if (!client_id) {
      return NextResponse.json({ success: false, message: 'client_id (user) is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (is_default) {
        await client.query(`UPDATE pixels SET is_default = false WHERE is_default = true`);
      }

      const res = await client.query(
        `INSERT INTO pixels (slug, label, pixel_id, access_token, ad_account_id, is_default, client_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, slug, label, pixel_id, ad_account_id, is_default, client_id, created_at`,
        [slug.toLowerCase().trim(), label.trim(), pixel_id.trim(), access_token.trim(), ad_account_id, is_default, parseInt(client_id)],
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return NextResponse.json({ success: false, message: 'Slug already exists' }, { status: 409 });
    }
    console.error('pixels POST error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
