import 'server-only';
import { createHmac } from 'node:crypto';

// Shared source budget across staff and parent entry points; never persist raw IPs.
export function authAttemptKeys(request: Request, identity: string) {
  const key = process.env.AUTH_RATE_LIMIT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing authentication configuration');
  const source = process.env.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown'
    : 'local';
  const digest = (value: string) => createHmac('sha256', key).update(value).digest('hex');
  return { p_source: digest('auth-source:' + source), p_identity: digest('auth-identity:' + identity) };
}

// Bound the stream too: Content-Length can be absent or supplied incorrectly.
export async function readLoginBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > 4096 || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; }
  finally { reader.releaseLock(); }
}
