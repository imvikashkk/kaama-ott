import { createHmac } from 'crypto';

const SECRET = process.env.ADMIN_TOKEN_SECRET ?? 'admin-dev-secret-change-in-prod';
const EXPIRY_SECS = 60 * 60 * 8; // 8 hours

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateAdminToken(): string {
  const payload = { iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + EXPIRY_SECS };
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  const sig  = b64url(createHmac('sha256', SECRET).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', SECRET).update(data).digest());
  if (expected !== sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
