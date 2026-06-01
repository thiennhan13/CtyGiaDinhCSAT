import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, subMonths, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export async function GET(request: Request) {
  // Check authorization via Supabase Auth
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.app_metadata?.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const billingPeriod = searchParams.get('billingPeriod');

  if (!startDateStr || !endDateStr || !billingPeriod) {
    return NextResponse.json({ error: 'Thiếu thông tin ngày bắt đầu, ngày kết thúc hoặc tên kỳ hóa đơn.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  console.log(`Bắt đầu quá trình chốt sổ đợt ${billingPeriod} (Từ ${startDateStr} đến ${endDateStr})`);

  try {
    // 2 & 3. Dùng RPC hoặc truy vấn thủ công.
    // Lấy tất cả session attendance trong khoảng thời gian có status = 'attended'
    
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('session_id, class_id')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .eq('status', 'completed')
      .is('billing_period', null);

    if (sessionErr) throw sessionErr;
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'Không có buổi học nào chưa chốt sổ trong khoảng thời gian này.' });
    }

    const sessionIds = sessions.map(s => s.session_id);

    // Lấy attendance cho các session này kèm theo tuition_fee_snapshot
    const { data: attendances, error: attErr } = await supabase
      .from('session_attendance')
      .select('session_id, student_id, status, tuition_fee_snapshot')
      .in('session_id', sessionIds)
      .eq('status', 'attended');

    if (attErr) throw attErr;

    // Build map session_id -> class_id
    const sessionClassMap: Record<string, string> = {};
    sessions.forEach(s => {
      sessionClassMap[s.session_id] = s.class_id;
    });

    // Sum up the total fee per student per class based on snapshots
    // Key: "student_id|class_id" -> totalAmount
    const studentClassFees: Record<string, number> = {};
    
    // We also need to fetch fallback tuition fees in case snapshot is null (for backward compatibility)
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('class_id, student_id, tuition_fee_per_session');

    if (csErr) throw csErr;

    const fallbackFeeMap: Record<string, number> = {};
    classStudents?.forEach(cs => {
      const key = `${cs.student_id}|${cs.class_id}`;
      fallbackFeeMap[key] = parseFloat(String(cs.tuition_fee_per_session)) || 0;
    });

    attendances?.forEach(att => {
      const classId = sessionClassMap[att.session_id];
      const key = `${att.student_id}|${classId}`;
      let fee = att.tuition_fee_snapshot != null ? parseFloat(String(att.tuition_fee_snapshot)) : fallbackFeeMap[key] || 0;
      studentClassFees[key] = (studentClassFees[key] || 0) + fee;
    });

    const paymentsToInsert = [];

    // 4 & 5. Tạo payments
    for (const [key, totalAmount] of Object.entries(studentClassFees)) {
      const [studentId, classId] = key.split('|');

      if (totalAmount > 0) {
        paymentsToInsert.push({
          student_id: studentId,
          class_id: classId,
          billing_period: billingPeriod,
          amount: totalAmount,
          status: 'unpaid'
        });
      }
    }

    if (paymentsToInsert.length > 0) {
      // Check if already generated for this billing period to prevent duplicate
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('payment_id')
        .eq('billing_period', billingPeriod)
        .limit(1);

      if (existingPayments && existingPayments.length > 0) {
        return NextResponse.json({ message: 'Billing already generated for this period.' });
      }

      const { error: insertErr } = await supabase
        .from('payments')
        .insert(paymentsToInsert);
        
      if (insertErr) throw insertErr;

      // Mark sessions as billed
      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ billing_period: billingPeriod })
        .in('session_id', sessionIds);

      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ message: `Đã chốt sổ thành công cho ${paymentsToInsert.length} hóa đơn.`, billingPeriod });

  } catch (error: any) {
    console.error('Error generating billing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
