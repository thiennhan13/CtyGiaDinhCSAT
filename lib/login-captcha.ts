import 'server-only';

type LoginAction = 'parent_login' | 'staff_login';
type Verification = { ok: true } | { ok: false; status: 403 | 503; error: string };
const unavailable = (): Verification => ({ ok: false, status: 503, error: 'Chưa xác minh được đăng nhập. Vui lòng thử lại hoặc liên hệ CSAT.' });
const rejected = (): Verification => ({ ok: false, status: 403, error: 'Vui lòng xác minh lại trước khi đăng nhập.' });

function config() {
  const flag = process.env.TURNSTILE_LOGIN_ENABLED;
  const enabled = !!flag && flag !== 'false';
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || '';
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || '';
  let hostname = '';
  try { hostname = new URL(process.env.APP_ORIGIN || '').hostname; } catch { /* Fail closed when enabled. */ }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  const testKey = [siteKey, secret].some(key => /^[123]x0+[A-Z]+$/.test(key));
  const ready = flag === 'true' && !!siteKey && !!secret && !!hostname && (!testKey || (local && process.env.VERCEL_ENV !== 'production'));
  return { enabled, ready, siteKey, secret, hostname };
}

// Only these public values cross the server/client boundary. Never serialize the config.
export function loginCaptchaPresentation() {
  const value = config();
  return { enabled: value.enabled, siteKey: value.ready ? value.siteKey : '' };
}

export async function verifyLoginCaptcha(token: string | undefined, action: LoginAction, fetcher: typeof fetch = fetch): Promise<Verification> {
  const value = config();
  if (!value.enabled) return { ok: true };
  if (!value.ready) return unavailable();
  if (!token || token.length > 2048) return rejected();
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: value.secret, response: token }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return unavailable();
    const result = await response.json();
    if (result?.success !== true || result.hostname !== value.hostname || result.action !== action) return rejected();
    const issued = Date.parse(result.challenge_ts);
    if (!Number.isFinite(issued) || Date.now() - issued > 300000 || issued - Date.now() > 60000) return rejected();
    return { ok: true };
  } catch { return unavailable(); }
}
