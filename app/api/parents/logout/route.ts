import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Đăng xuất Phụ huynh — xóa cookie parent_session.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'parent_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Xóa ngay lập tức
  });

  return NextResponse.json({ success: true, redirectUrl: '/login' });
}
