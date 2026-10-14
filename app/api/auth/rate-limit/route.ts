import { NextResponse } from 'next/server';
// Login limits are now enforced together with authentication in /api/auth/login.
export async function POST() {
  return NextResponse.json({ error: 'Vui lòng tải lại trang đăng nhập.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
