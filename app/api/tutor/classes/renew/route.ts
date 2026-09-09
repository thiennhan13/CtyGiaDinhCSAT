import { NextResponse } from 'next/server';
import { businessSession } from '@/lib/business-api';
export async function POST() {
  const session = await businessSession(false); if (session.response) return session.response;
  return NextResponse.json({ error: 'Admin cần cập nhật thời hạn và tạo lịch trong cùng thao tác Gia hạn lớp.' }, { status: 409 });
}
