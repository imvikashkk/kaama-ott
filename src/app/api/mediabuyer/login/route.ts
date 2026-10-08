import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/mbAuth';

const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_TRIES = 10;
interface Bucket { count: number; windowStart: number }
const attempts = new Map<string, Bucket>();

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfterSecs: 0 };
  }
  if (bucket.count >= MAX_TRIES) {
    const retryAfterSecs = Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSecs };
  }
  bucket.count += 1;
  return { limited: false, retryAfterSecs: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req);
    const { limited, retryAfterSecs } = isRateLimited(ip);
    if (limited) {
      const mins = Math.ceil(retryAfterSecs / 60);
      return NextResponse.json(
        { success: false, message: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } },
      );
    }

    const { email, password } = await req.json();

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ success: false, message: 'Email and password required' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT id, name, email, password_hash, is_active
       FROM clients
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const client = res.rows[0];

    if (!client.is_active) {
      return NextResponse.json({ success: false, message: 'Account is inactive' }, { status: 403 });
    }

    if (!client.password_hash) {
      return NextResponse.json({ success: false, message: 'Password not set — contact admin' }, { status: 401 });
    }

    const valid = await verifyPassword(password.trim(), client.password_hash);
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    attempts.delete(ip);
    const token = generateToken(client.id);
    const response = NextResponse.json({ success: true, data: { id: client.id, name: client.name } });
    response.cookies.set('mr_mb_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err) {
    console.error('mb login error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
