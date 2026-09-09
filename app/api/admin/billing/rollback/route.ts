import { NextResponse } from 'next/server';
import { businessSession } from '@/lib/business-api';
export async function POST() {
  const session = await businessSession(); if (session.response) return session.response;
  return NextResponse.json({ error: 'Kỳ đã chốt được giữ nguyên. Hãy lập khoản điều chỉnh; kỳ cũ cần đối soát riêng.', code: 'CLOSED_PERIOD' }, { status: 409 });
}
