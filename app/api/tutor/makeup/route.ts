import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const schema = z.object({ class_id: z.uuid(), date: z.iso.date(), start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), requestId: z.uuid().optional() });
export async function POST(request: Request) {
  const session = await businessSession(false, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Lịch học bù không hợp lệ.' }, { status: 422 });
  const p = parsed.data;
  const { data, error } = await session.supabase.rpc('manage_class', { p_action: 'add_sessions', p_class_id: p.class_id,
    p_data: { sessions: [{ date: p.date, start_time: p.start_time, end_time: p.end_time }] }, p_request_id: p.requestId ?? crypto.randomUUID() });
  return error ? businessError(error) : NextResponse.json(data);
}
