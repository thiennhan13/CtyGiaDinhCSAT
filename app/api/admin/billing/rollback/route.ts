import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const rollbackSchema = z.object({
  billingPeriod: z.string().min(1, "Kỳ hóa đơn không hợp lệ"),
});

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    // Kiểm tra quyền Admin
    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin' && user.email !== 'csattutor@gmail.com')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = rollbackSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { billingPeriod } = parsed.data;
    const adminClient = createAdminClient();

    // Lỗi 3 FIX: Gọi RPC rollback_billing_partial thay vì logic cũ
    // RPC sẽ tự động:
    //   - Xóa chỉ các hóa đơn UNPAID
    //   - Gỡ billing_period khỏi các sessions chưa được thanh toán
    //   - GIỮ NGUYÊN hóa đơn PAID và sessions tương ứng
    //   - Ném exception nếu không còn gì để xóa
    const { data: rpcResult, error: rpcError } = await adminClient
      .rpc('rollback_billing_partial', {
        p_billing_period: billingPeriod
      });

    if (rpcError) {
      // RPC RAISE EXCEPTION → trả về lỗi có nghĩa cho người dùng
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: (rpcResult as any)?.message || `Đã hủy chốt sổ đợt "${billingPeriod}" thành công.`,
      details: rpcResult
    });

  } catch (error: any) {
    console.error('Admin Billing Rollback API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
