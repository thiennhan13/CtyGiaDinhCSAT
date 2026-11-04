import 'server-only';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/service';
import { ojConfig, OJError, ojMessage } from '@/lib/csat-oj-server';
import { NextResponse } from 'next/server';
export class GrantError extends OJError {
  constructor(code: string, status = 503, public retryAfter = 0) { super(code, status); }
}
export async function grantRequest<T>(path: string, schema: z.ZodType<T>, options: { manage?: boolean; revision?: number; body?: unknown } = {}) {
  const config = ojConfig(), db = createAdminClient(), manage = options.manage === true;
  if (!/^(accounts|connections)\//.test(path) || path.includes('..') || path.includes('://')) throw new GrantError('invalid_path');
  const slot = await db.rpc('oj_request_slot', { p_instance: config.instance, p_manage: manage, p_retry: 0 });
  if (slot.error) throw new GrantError('unreachable');
  if (slot.data > 0) throw new GrantError('rate_limited', 429, slot.data);
  let response: Response;
  try {
    response = await fetch(config.origin + '/api/csat/v2/' + path, { method: options.body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSAT-OJ-Instance': config.instance, 'X-CSAT-Portal-Key': manage ? config.manage : config.read,
        ...(options.revision === undefined ? {} : { 'X-CSAT-Grant-Revision': String(options.revision) }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  } catch { throw new GrantError('unreachable'); }
  if (response.status === 429) {
    const raw = response.headers.get('retry-after') || '';
    const seconds = /^\d+$/.test(raw) ? Number(raw) : Math.ceil((Date.parse(raw) - Date.now()) / 1000);
    const retry = Number.isFinite(seconds) ? Math.max(1, Math.min(86400, seconds)) : 60;
    await db.rpc('oj_request_slot', { p_instance: config.instance, p_manage: manage, p_retry: retry });
    throw new GrantError('rate_limited', 429, retry);
  }
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ error: z.string().regex(/^[a-z_]{1,80}$/) }).safeParse(raw);
    throw new GrantError(parsed.success ? parsed.data.error : 'upstream_error', response.status);
  }
  const parsed = z.object({ api_version: z.literal('csat-portal-v2'), instance_id: z.literal(config.instance), as_of: z.iso.datetime({ offset: true }), data: schema }).safeParse(raw);
  if (!parsed.success) throw new GrantError('invalid_response');
  return parsed.data;
}
export function grantErrorResponse(error: OJError) {
  const status = [403, 404, 409, 422, 429].includes(error.status) ? error.status : 503;
  return NextResponse.json({ error: ojMessage(error), code: error.code }, { status, headers: { 'Cache-Control': 'private, no-store',
    ...(error instanceof GrantError && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) } });
}
