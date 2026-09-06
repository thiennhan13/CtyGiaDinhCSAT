import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/parents';

// Retired endpoint for cached clients. Never changes a Supabase Auth password.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  return NextResponse.json({ error: 'Cổng phụ huynh đã chuyển sang tra cứu bằng số điện thoại, không sử dụng mật khẩu.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
