import { createHmac } from 'crypto';

const SECRET = process.env.USER_TOKEN_SECRET ?? 'user-dev-secret-change-in-prod';

export function generateUserToken(userId: number, secsValid: number): string {
  const exp  = Math.floor(Date.now() / 1000) + secsValid;
  const data = `${userId}.${exp}`;
  const sig  = createHmac('sha256', SECRET).update(data).digest('hex').slice(0, 32);
  return `${data}.${sig}`;
}

export function verifyUserToken(token: string | undefined): number | null {
  if (!token) return null;
  const dot1 = token.indexOf('.');
  const dot2 = token.indexOf('.', dot1 + 1);
  if (dot1 < 0 || dot2 < 0) return null;
  const data = token.slice(0, dot2);
  const sig  = token.slice(dot2 + 1);
  const expected = createHmac('sha256', SECRET).update(data).digest('hex').slice(0, 32);
  if (expected !== sig) return null;
  const exp = parseInt(token.slice(dot1 + 1, dot2));
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const userId = parseInt(token.slice(0, dot1));
  if (isNaN(userId)) return null;
  return userId;
}
