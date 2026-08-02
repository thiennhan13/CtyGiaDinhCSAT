import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Rate limit check cho Tutor/Admin login.
 * Frontend gọi endpoint này TRƯỚC KHI gọi Supabase Auth,
 * để chặn spam đăng nhập từ cùng 1 IP.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, 50);

  if (!rl.success) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return NextResponse.json(
    { success: true },
    {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    }
  );
}
