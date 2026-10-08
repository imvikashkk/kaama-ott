import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query(
      `SELECT id, name, price, original_price, duration_days, description
       FROM plans WHERE is_active = true ORDER BY price ASC`,
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (err) {
    console.error('plans error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}
