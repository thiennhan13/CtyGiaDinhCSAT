import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const schema = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), billingPeriod: z.string().trim().min(1).max(255),
  previewToken: z.string().min(1), requestId: z.uuid(), zeroFeeAttendanceIds: z.array(z.uuid()).default([]) });
export async function GET() {
  return NextResponse.json({ error: 'Chốt sổ yêu cầu POST và xác nhận dữ liệu xem trước.' }, { status: 405, headers: { Allow: 'POST' } });
}
export async function POST(request: Request) {
  const session = await businessSession(true, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin chốt sổ không hợp lệ.' }, { status: 422 });
  const p = parsed.data;
  const { data, error } = await session.supabase.rpc('close_billing_period', { p_start_date: p.startDate, p_end_date: p.endDate,
    p_label: p.billingPeriod, p_preview_token: p.previewToken, p_request_id: p.requestId, p_zero_fee_attendance_ids: p.zeroFeeAttendanceIds });
  return error ? businessError(error) : NextResponse.json(data);
}
