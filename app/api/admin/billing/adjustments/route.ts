import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const base = z.object({ itemId: z.uuid(), status: z.enum(['attended', 'absent']), fee: z.number().nonnegative(), reverseId: z.uuid().optional() });
const schema = z.discriminatedUnion('action', [base.extend({ action: z.literal('preview') }),
  base.extend({ action: z.literal('apply'), reason: z.string().trim().min(1).max(2000), previewToken: z.string().min(1), requestId: z.uuid() })]);
export async function POST(request: Request) {
  const session = await businessSession(true, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin điều chỉnh không hợp lệ.' }, { status: 422 });
  const p = parsed.data;
  const args = { p_item_id: p.itemId, p_status: p.status, p_fee: p.fee, p_reverse_id: p.reverseId ?? null };
  const { data, error } = p.action === 'preview'
    ? await session.supabase.rpc('preview_billing_adjustment', args)
    : await session.supabase.rpc('apply_billing_adjustment', { ...args, p_reason: p.reason, p_preview_token: p.previewToken, p_request_id: p.requestId });
  return error ? businessError(error) : NextResponse.json(data);
}
