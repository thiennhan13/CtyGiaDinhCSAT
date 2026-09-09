import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
import { billingPresentation, type BillingReport } from '@/lib/billing-report';
export async function GET(request: Request) {
  const session = await businessSession(); if (session.response) return session.response;
  const params = new URL(request.url).searchParams;
  let period = params.get('billingPeriod');
  const periodId = params.get('periodId');
  if (periodId) {
    if (!z.uuid().safeParse(periodId).success) return NextResponse.json({ error: 'ID kỳ không hợp lệ.' }, { status: 422 });
    const found = await session.supabase.from('billing_periods').select('label').eq('period_id', periodId).single();
    if (found.error) return businessError(found.error);
    period = found.data.label;
  }
  const start = params.get('startDate'), end = params.get('endDate');
  if (!period && (!z.iso.date().safeParse(start).success || !z.iso.date().safeParse(end).success || start! > end!))
    return NextResponse.json({ error: 'Khoảng ngày không hợp lệ.' }, { status: 422 });
  const { data, error } = await session.supabase.rpc('billing_report', { p_start_date: period ? null : start, p_end_date: period ? null : end, p_period: period });
  return error ? businessError(error) : NextResponse.json(billingPresentation(data as BillingReport));
}
