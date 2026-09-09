import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const schema = z.object({ paymentId: z.uuid(), requestId: z.uuid(), expectedBalance: z.number(),
  reason: z.string().trim().min(1).max(2000).default('Ghi nhận thanh toán'), reverseEventId: z.uuid().optional() });
export async function POST(request: Request) {
  const session = await businessSession(true, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin giao dịch không hợp lệ.' }, { status: 422 });
  const p = parsed.data;
  const { data, error } = await session.supabase.rpc('record_payment_event', { p_payment_id: p.paymentId, p_request_id: p.requestId,
    p_expected_balance: p.expectedBalance, p_reason: p.reason, p_reverse_event_id: p.reverseEventId ?? null });
  return error ? businessError(error) : NextResponse.json(data);
}
