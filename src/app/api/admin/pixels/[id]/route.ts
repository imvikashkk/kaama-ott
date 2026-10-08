import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdminToken } from '@/lib/adminAuth';

function authCheck(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('mr_admin')?.value);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  const { id } = await params;
  const pixelId = parseInt(id);
  if (isNaN(pixelId)) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json();
    console.log('[pixels PUT] received body:', JSON.stringify(body));
    const { slug, label, pixel_id, access_token, ad_account_id = null, is_default, client_id } = body;

    if (!client_id) {
      return NextResponse.json({ success: false, message: 'client_id (user) is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (is_default) {
        await client.query(`UPDATE pixels SET is_default = false WHERE is_default = true AND id != $1`, [pixelId]);
      }

      const res = await client.query(
        `UPDATE pixels
         SET slug=$1, label=$2, pixel_id=$3, access_token=$4, ad_account_id=$5, is_default=$6, client_id=$7, updated_at=NOW()
         WHERE id=$8
         RETURNING id, slug, label, pixel_id, ad_account_id, is_default, client_id`,
        [
          slug.toLowerCase().trim(), label.trim(), pixel_id.trim(), access_token.trim(),
          ad_account_id, Boolean(is_default), parseInt(client_id), pixelId,
        ],
      );

      await client.query('COMMIT');

      if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: res.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('pixels PUT error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  const { id } = await params;
  const pixelId = parseInt(id);
  if (isNaN(pixelId)) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });

  try {
    const res = await pool.query(`DELETE FROM pixels WHERE id=$1 RETURNING id`, [pixelId]);
    if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('pixels DELETE error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
