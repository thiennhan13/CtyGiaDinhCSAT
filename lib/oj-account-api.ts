import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { createAdminClient } from '@/lib/supabase/service';
import { ojConfig, OJError } from '@/lib/csat-oj-server';
import { grantRequest, grantErrorResponse } from '@/lib/oj-grants-server';
import { ojContext, ojSummary, ojOrganizations, ojContests, ojClassResults } from '@/lib/oj-grants';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function readOJAccount(request: Request, parentOnly: boolean) {
  const auth = await businessSession(false); if (auth.response) return auth.response;
  const actorId = auth.user.id;
  try {
    const input = z.object({ student: z.uuid(), kind: z.enum(['summary', 'organizations', 'contests', 'session']).default('summary'),
      session: z.uuid().optional(), cursor: z.string().max(4096).optional(), contest: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    if (parentOnly) {
      const access = await auth.supabase.rpc('parent_access');
      if (access.error || access.data?.state !== 'active' || access.data.student_id !== input.student) return json({ error: 'Không có quyền xem học sinh.' }, 403);
    }
    const db = createAdminClient();
    async function context() {
      const r = await db.rpc('oj_account_context', { p_student: input.student, p_session: input.kind === 'session' ? input.session ?? null : null, p_actor: actorId });
      if (r.error) throw r.error;
      return ojContext.parse(r.data);
    }
    const before = await context(), mapping = before.mapping;
    if (!mapping) return json({ connected: false });
    if (mapping.instance_id !== ojConfig().instance) throw new OJError('source_mismatch');
    const root = 'accounts/' + mapping.profile_id + '/';
    const options = { revision: mapping.grant_revision };
    let remote;
    try {
      if (input.kind === 'summary') remote = await grantRequest(root, ojSummary, options);
      else if (input.kind === 'organizations') remote = await grantRequest(root + 'organizations/?' + new URLSearchParams({ limit: '20', ...(input.cursor ? { cursor: input.cursor } : {}) }), ojOrganizations, options);
      else if (input.kind === 'contests') remote = await grantRequest(root + 'contests/' + (input.contest ? encodeURIComponent(input.contest) + '/' : '') + '?' + new URLSearchParams({ mode: 'all', limit: '20', ...(input.cursor ? { cursor: input.cursor } : {}) }), ojContests, options);
      else {
        if (!input.session || !before.contest_ids.length) return json({ connected: true, no_contests: true });
        if (!before.roster.some(r => r.profile_id === mapping.profile_id)) throw new OJError('link_unavailable', 409);
        const body = { contest_ids: before.contest_ids, roster_profile_ids: before.roster.map(r => r.profile_id), roster_complete: before.roster_complete,
          roster_grants: before.roster.map(r => ({ profile_id: r.profile_id, revision: r.revision })) };
        if (Buffer.byteLength(JSON.stringify(body)) > 16384) throw new OJError('invalid_roster', 422);
        remote = await grantRequest(root + 'class-results/', ojClassResults, { ...options, body });
      }
    } catch (error) {
      if (error instanceof OJError && ['account_unavailable', 'revision_conflict', 'grant_revoked', 'grant_revision_mismatch'].includes(error.code)) {
        await db.rpc('oj_invalidate_account', { p_student: input.student, p_revision: mapping.revision });
      }
      throw error;
    }
    if (remote.data.account.profile_id !== mapping.profile_id) throw new OJError('invalid_response');
    if (JSON.stringify(before) !== JSON.stringify(await context())) return json({ error: 'Quyền hoặc liên kết vừa thay đổi. Vui lòng tải lại.', code: 'link_unavailable' }, 409);
    return json({ connected: true, as_of: remote.as_of, data: remote.data });
  } catch (error) {
    if (error instanceof OJError) return grantErrorResponse(error);
    if (error instanceof z.ZodError) return json({ error: 'Dữ liệu kết nối không hợp lệ.' }, 422);
    return businessError(error);
  }
}
