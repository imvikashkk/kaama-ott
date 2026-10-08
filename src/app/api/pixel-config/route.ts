import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('c');

  try {
    if (!slug) return NextResponse.json({ pixelId: null });

    const res = await pool.query(`SELECT pixel_id FROM pixels WHERE slug = $1`, [slug]);
    const pixelId = res.rows[0]?.pixel_id ?? null;
    return NextResponse.json({ pixelId }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return NextResponse.json({ pixelId: null });
  }
}
