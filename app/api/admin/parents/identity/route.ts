import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
export async function POST(request: Request) {
  const session = await businessSession(true, request); if (session.response) return session.response;
  const input = z.object({ parentId: z.uuid(), authUid: z.uuid(), revision: z.number().int().min(0), reason: z.string().trim().min(1).max(2000), blocked: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Kiểm tra tài khoản và lý do thay đổi.' }, { status: 422 });
  const p = input.data;
  const result = await session.supabase.rpc('admin_transfer_parent', { p_parent_id: p.parentId, p_auth_uid: p.authUid, p_revision: p.revision, p_reason: p.reason, p_blocked: p.blocked });
  return result.error ? businessError(result.error) : NextResponse.json(result.data);
}
