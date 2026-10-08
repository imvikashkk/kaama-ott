import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/mbAuth';

function auth(req: NextRequest) {
  return verifyToken(req.cookies.get('mr_mb_token')?.value);
}

export async function GET(req: NextRequest) {
  const clientId = auth(req);
  if (!clientId) return NextResponse.json({ success: false }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const LIMIT = 10;
  const offset = (page - 1) * LIMIT;

  const qp: unknown[] = [clientId];
  let extra = '';
  if (search) {
    qp.push(`%${search}%`);
    const i = qp.length;
    extra = ` AND (slug ILIKE $${i} OR label ILIKE $${i} OR pixel_id ILIKE $${i} OR COALESCE(ad_account_id,'') ILIKE $${i})`;
  }

  try {
    const [rows, cnt] = await Promise.all([
      pool.query(
        `SELECT id, slug, label, pixel_id, ad_account_id, is_default FROM pixels WHERE client_id = $1${extra} ORDER BY created_at DESC LIMIT ${LIMIT} OFFSET ${offset}`,
        qp,
      ),
      pool.query(`SELECT COUNT(*) FROM pixels WHERE client_id = $1${extra}`, qp),
    ]);
    const total = parseInt(cnt.rows[0].count);
    return NextResponse.json({ success: true, data: rows.rows, total, page, totalPages: Math.ceil(total / LIMIT) || 1 });
  } catch (err) {
    console.error('mb pixels GET error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const clientId = auth(req);
  if (!clientId) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { slug, label, pixel_id, access_token, ad_account_id = null } = await req.json();
    if (!slug || !label || !pixel_id || !access_token)
      return NextResponse.json({ success: false, message: 'slug, label, pixel_id, access_token required' }, { status: 400 });

    const res = await pool.query(
      `INSERT INTO pixels (slug, label, pixel_id, access_token, ad_account_id, client_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, slug, label, pixel_id, ad_account_id, is_default, client_id, created_at`,
      [slug.toLowerCase().trim(), label.trim(), pixel_id.trim(), access_token.trim(), ad_account_id, clientId],
    );
    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') return NextResponse.json({ success: false, message: 'Slug already exists' }, { status: 409 });
    console.error('mb pixels POST error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
