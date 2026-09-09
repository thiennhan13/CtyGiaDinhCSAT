import { NextResponse } from 'next/server';
import { businessError, businessSession } from '@/lib/business-api';
import { billingPresentation, type BillingReport } from '@/lib/billing-report';
export async function GET(request: Request) {
  const session = await businessSession(false); if (session.response) return session.response;
  const period = new URL(request.url).searchParams.get('billingPeriod');
  const { data, error } = await session.supabase.rpc('tutor_billing_history', { p_period: period });
  return error ? businessError(error) : NextResponse.json(period ? billingPresentation(data as BillingReport) : data);
}
