import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { createAdminClient } from '@/lib/supabase/service';
import { ojConfig, OJError } from '@/lib/csat-oj-server';
import { grantRequest, grantErrorResponse } from '@/lib/oj-grants-server';
import { ojGrantReceipt } from '@/lib/oj-grants';
import { readLoginBody } from '@/lib/login-security';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('exchange'), studentId: z.uuid(), code: z.string().regex(/^[A-Za-z0-9_-]{43}$/), requestId: z.uuid().refine(value => value[14] === '4'), revision: z.number().int().nonnegative(), reason: z.string().trim().min(1).max(500) }).strict(),
  z.object({ action: z.enum(['recover', 'abandon']), requestId: z.uuid() }).strict(),
  z.object({ action: z.literal('mapping'), kind: z.enum(['class', 'session']), id: z.uuid(), values: z.array(z.number().int().positive()).max(20), revision: z.number().int().nonnegative() }).strict(),
]);
const json = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  const session = await businessSession(false); if (session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const classId = z.uuid().nullable().safeParse(params.get('class'));
  if (!classId.success) return NextResponse.json({ error: 'Lớp không hợp lệ.' }, { status: 422 });
  const result = await session.supabase.rpc('oj_grants_workspace', { p_class: classId.data, p_search: (params.get('q') || '').slice(0, 80) });
  if (result.error) return businessError(result.error);
  if (session.user.app_metadata?.role !== 'admin') return json(result.data);
  // Configuration validity only; keys and instance values never leave the server.
  let connectionReady = false;
  try { ojConfig(); connectionReady = true; } catch { /* Disabled or incomplete configuration. */ }
  return json({ ...result.data, connection_ready: connectionReady });
}
export async function POST(request: Request) {
  const session = await businessSession(false, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await readLoginBody(request));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu kết nối không hợp lệ.' }, { status: 422 });
  const p = parsed.data;
  try {
    if (p.action === 'mapping') {
      const r = await session.supabase.rpc('oj_save_local_mapping', { p_kind: p.kind, p_id: p.id, p_values: p.values, p_revision: p.revision });
      return r.error ? businessError(r.error) : json({ success: true });
    }
    if (session.user.app_metadata?.role !== 'admin') return NextResponse.json({ error: 'Chỉ admin được đổi mã.' }, { status: 403 });
    const config = ojConfig();
    if (p.action === 'abandon' || p.action === 'recover') {
      const op = await session.supabase.rpc('oj_exchange_operation', { p_request: p.requestId, p_abandon: p.action === 'abandon' });
      if (op.error) return businessError(op.error);
      if (op.data.instance_id !== config.instance) throw new OJError('source_mismatch');
      if (p.action === 'abandon' || op.data.state === 'complete') return json({ success: true });
      if (op.data.state !== 'pending') throw new OJError('link_unavailable', 409);
    } else if (p.action === 'exchange') {
      const op = await session.supabase.rpc('oj_begin_exchange', { p_student: p.studentId, p_instance: config.instance, p_request: p.requestId,
        p_expected: p.revision, p_digest: createHash('sha256').update(p.code).digest('hex'), p_reason: p.reason });
      if (op.error) return businessError(op.error);
      if (op.data.state === 'complete') return json({ success: true });
    }
    const remote = p.action === 'exchange'
      ? await grantRequest('connections/exchange/', ojGrantReceipt, { manage: true, body: { code: p.code, request_id: p.requestId } })
      : await grantRequest('connections/exchanges/' + p.requestId + '/', ojGrantReceipt, { manage: true });
    const r = await createAdminClient().rpc('oj_finish_exchange', { p_request: p.requestId, p_profile: remote.data.account.profile_id,
      p_grant: remote.data.grant.id, p_grant_revision: remote.data.grant.revision, p_username: remote.data.account.username });
    return r.error ? businessError(r.error) : json({ success: true });
  } catch (error) { return error instanceof OJError ? grantErrorResponse(error) : businessError(error); }
}
