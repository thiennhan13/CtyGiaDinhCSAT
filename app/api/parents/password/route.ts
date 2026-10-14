import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/parents';

// Retire cached clients explicitly; never mutate retained Auth identities.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  return NextResponse.json({ error: 'Phụ huynh hiện tra cứu bằng số điện thoại, không sử dụng mật khẩu.' }, {
    status: 410, headers: { 'Cache-Control': 'private, no-store' },
  });
}
