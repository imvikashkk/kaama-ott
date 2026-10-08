import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/mbAuth';
import { verifyAdminToken } from '@/lib/adminAuth';

function authCheck(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('mr_admin')?.value);
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const res = await pool.query(
      `SELECT id, name, email, phone, is_active, created_at,
              (password_hash IS NOT NULL) AS has_password
       FROM clients
       ORDER BY name ASC`,
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (err) {
    console.error('clients GET error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { name, email, phone, password } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const passHash = password?.trim() ? await hashPassword(password.trim()) : null;

    const res = await pool.query(
      `INSERT INTO clients (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, is_active, created_at,
                 (password_hash IS NOT NULL) AS has_password`,
      [name.trim(), email?.trim() || null, phone?.trim() || null, passHash],
    );

    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error('clients POST error:', err);
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get('id') || '');
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });

    const { name, email, phone, password } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });

    let res;
    if (password?.trim()) {
      const passHash = await hashPassword(password.trim());
      res = await pool.query(
        `UPDATE clients
         SET name=$1, email=$2, phone=$3, password_hash=$4, updated_at=NOW()
         WHERE id=$5
         RETURNING id, name, email, phone, is_active, created_at,
                   (password_hash IS NOT NULL) AS has_password`,
        [name.trim(), email?.trim() || null, phone?.trim() || null, passHash, id],
      );
    } else {
      res = await pool.query(
        `UPDATE clients
         SET name=$1, email=$2, phone=$3, updated_at=NOW()
         WHERE id=$4
         RETURNING id, name, email, phone, is_active, created_at,
                   (password_hash IS NOT NULL) AS has_password`,
        [name.trim(), email?.trim() || null, phone?.trim() || null, id],
      );
    }

    if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: unknown) {
    console.error('clients PUT error:', err);
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get('id') || '');
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });

    const pixelCount = await pool.query(`SELECT COUNT(*) FROM pixels WHERE client_id = $1`, [id]);
    if (parseInt(pixelCount.rows[0].count) > 0) {
      return NextResponse.json({ success: false, message: 'Cannot delete: client has pixels assigned' }, { status: 409 });
    }

    const res = await pool.query(`DELETE FROM clients WHERE id=$1 RETURNING id`, [id]);
    if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('clients DELETE error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
