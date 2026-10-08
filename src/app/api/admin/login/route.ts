import { NextRequest, NextResponse } from 'next/server';
import { generateAdminToken } from '@/lib/adminAuth';

const WINDOW_MS  = 2 * 60 * 60 * 1000; // 2 hours
const MAX_TRIES  = 10;

interface Bucket { count: number; windowStart: number }
const attempts = new Map<string, Bucket>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSecs: number } {
  const now    = Date.now();
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

    const { username, password } = await req.json();

    if (
      !username ||
      !password ||
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 },
      );
    }

    // Successful login — clear the bucket
    attempts.delete(ip);

    const token = generateAdminToken();

    const res = NextResponse.json({ success: true });
    res.cookies.set('mr_admin', token, {
      path: '/',
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}
