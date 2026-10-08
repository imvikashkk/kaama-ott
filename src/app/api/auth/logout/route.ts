import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Clear auth cookies
  res.cookies.set('mr_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('mr_has_sub', '', { path: '/', maxAge: 0 });
  res.cookies.set('mr_uid', '', { path: '/', maxAge: 0 });
  res.cookies.set('mr_sub', '', { path: '/', maxAge: 0 });
  return res;
}
