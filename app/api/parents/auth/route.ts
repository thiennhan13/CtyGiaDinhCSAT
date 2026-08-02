import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // ── Rate Limiting: 50 requests/IP/phút ──
  const ip = getClientIp(request);
  const rl = rateLimit(ip, 50);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Sử dụng Service Role Key để vượt RLS an toàn (chỉ chạy trên Server)
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('students')
      .select('student_id')
      .eq('parent_number', cleanPhone)
      .limit(1);

    if (error) {
      console.error('Supabase error:', error.message);
      return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy học sinh với số điện thoại này.' }, { status: 404 });
    }

    // Set HttpOnly Cookie bảo mật — trình duyệt không thể đọc/sửa
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'parent_session',
      value: cleanPhone,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 ngày
    });

    return NextResponse.json(
      { success: true, redirectUrl: '/parents' },
      {
        headers: {
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    );

  } catch (err) {
    console.error('Parent auth error:', err);
    return NextResponse.json({ error: 'Có lỗi xảy ra' }, { status: 500 });
  }
}

