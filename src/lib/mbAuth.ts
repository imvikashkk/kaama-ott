import { createHmac, scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const MB_SECRET = process.env.MB_AUTH_SECRET ?? 'mb-dev-secret-change-in-prod';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  try {
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(storedHash, 'hex');
    return hash.length === storedBuf.length && timingSafeEqual(hash, storedBuf);
  } catch {
    return false;
  }
}

export function generateToken(clientId: number): string {
  const hmac = createHmac('sha256', MB_SECRET).update(String(clientId)).digest('hex');
  return `${clientId}.${hmac}`;
}

export function verifyToken(token: string | undefined): number | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const idStr = token.slice(0, dot);
  const hmac  = token.slice(dot + 1);
  const clientId = parseInt(idStr);
  if (isNaN(clientId)) return null;
  const expected = createHmac('sha256', MB_SECRET).update(String(clientId)).digest('hex');
  if (expected !== hmac) return null;
  return clientId;
}
