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

    // 1. Kiểm tra xem có hóa đơn nào trong kỳ này ĐÃ THU (paid) hay chưa.
    // Nếu có, KHÔNG ĐƯỢC PHÉP HỦY.
    const { data: paidPayments, error: checkError } = await adminClient
      .from('payments')
      .select('payment_id')
      .eq('billing_period', billingPeriod)
      .eq('status', 'paid')
      .limit(1);

    if (checkError) throw checkError;

    if (paidPayments && paidPayments.length > 0) {
      return NextResponse.json({ error: 'Không thể hủy chốt sổ vì đã có hóa đơn ĐƯỢC THU TIỀN trong kỳ này.' }, { status: 400 });
    }

    // 2. Xóa toàn bộ hóa đơn (unpaid) của kỳ này
    const { error: deleteError } = await adminClient
      .from('payments')
      .delete()
      .eq('billing_period', billingPeriod)
      .eq('status', 'unpaid');

    if (deleteError) throw deleteError;

    // 3. Reset billing_period của sessions về null
    const { error: updateError } = await adminClient
      .from('sessions')
      .update({ billing_period: null })
      .eq('billing_period', billingPeriod);

    if (updateError) throw updateError;

    return NextResponse.json({ message: `Đã hủy chốt sổ đợt "${billingPeriod}" thành công.` });

  } catch (error: any) {
    console.error('Admin Billing Rollback API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
