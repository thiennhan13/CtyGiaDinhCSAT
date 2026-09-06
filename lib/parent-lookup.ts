import { createHash, createHmac, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { getClientIp } from '@/lib/rate-limit';

export const LOOKUP_COOKIE = 'csat_parent_lookup';
export const lookupCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const,
  path: '/', maxAge: 12 * 60 * 60,
};
export const newLookupToken = () => randomBytes(32).toString('base64url');
export const hashLookupToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function readLookupHash(): Promise<string | null> {
  const token = (await cookies()).get(LOOKUP_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashLookupToken(token) : null;
}
export function lookupClientKey(request: Request): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Thiếu cấu hình máy chủ.');
  // Persist only a keyed digest, not the visitor IP. Never expose this key to the browser.
  return createHmac('sha256', key).update('csat-parent-lookup:' + getClientIp(request)).digest('hex');
}
