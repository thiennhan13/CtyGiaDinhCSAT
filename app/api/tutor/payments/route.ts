import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
export async function GET() {
  const session = await businessSession('tutor'); if (session.response) return session.response;
  const result = await session.supabase.rpc('tutor_payment_accounts');
  return result.error ? businessError(result.error) : NextResponse.json({ payments: result.data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(request: Request) {
  const session = await businessSession('tutor', request); if (session.response) return session.response;
  const input = z.object({ paymentId: z.uuid(), requestId: z.uuid(), expectedBalance: z.number().positive() }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Chứng từ không hợp lệ.' }, { status: 422 });
  const p = input.data;
  const result = await session.supabase.rpc('tutor_record_receipt', { p_payment_id: p.paymentId, p_request_id: p.requestId, p_expected_balance: p.expectedBalance });
  return result.error ? businessError(result.error) : NextResponse.json(result.data);
}
