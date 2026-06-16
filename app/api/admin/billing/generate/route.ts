import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, subMonths, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export async function GET(request: Request) {
  // Check authorization via Supabase Auth
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.app_metadata?.role !== 'admin' && user.email !== 'csattutor@gmail.com')) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối' }, { status: 403 });
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
    const classIdsSet = new Set<string>();
    sessions.forEach(s => {
      sessionClassMap[s.session_id] = s.class_id;
      classIdsSet.add(s.class_id);
    });

    // Sum up the total fee per student per class based on snapshots
    // Key: "student_id|class_id" -> totalAmount
    const studentClassFees: Record<string, number> = {};
    
    // We also need to fetch fallback tuition fees in case snapshot is null (for backward compatibility)
    const classIds = Array.from(classIdsSet);
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('class_id, student_id, tuition_fee_per_session')
      .in('class_id', classIds);

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
    let zeroAmountCount = 0; // B4: đếm buổi học có phí = 0

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
      } else {
        // B4: Ghi nhận học sinh có học phí = 0 để cảnh báo admin
        zeroAmountCount++;
      }
    }

    if (paymentsToInsert.length > 0) {
      // Kiểm tra: Chỉ chặn nếu còn hóa đơn UNPAID cho kỳ này
      // (tức là admin chưa rollback hết các hóa đơn chưa thu)
      // Không chặn nếu chỉ còn hóa đơn PAID — vì đây là trường hợp hợp lệ:
      // Admin đã rollback một phần (giữ paid), giờ chốt sổ lại cho phần còn lại
      const { data: existingUnpaid } = await supabase
        .from('payments')
        .select('payment_id')
        .eq('billing_period', billingPeriod)
        .eq('status', 'unpaid')
        .limit(1);

      if (existingUnpaid && existingUnpaid.length > 0) {
        return NextResponse.json({ message: 'Kỳ hóa đơn này đã có hóa đơn chưa thu. Hủy chốt sổ trước nếu muốn tạo lại.' });
      }

      const { error: insertErr } = await supabase
        .from('payments')
        .insert(paymentsToInsert);
        
      // Lỗi 23505 = unique_violation: hóa đơn kỳ này đã tồn tại (double-click / double request)
      // Xử lý gracefully thay vì crash 500
      if (insertErr) {
        if (insertErr.code === '23505') {
          return NextResponse.json({ message: 'Kỳ hóa đơn này đã được chốt sổ trước đó.' });
        }
        throw insertErr;
      }

      // Chỉ đánh dấu billing_period cho sessions THỰC SỰ có attendance
      // (tránh khóa sessions hoàn thành nhưng không có học sinh nào attended)
      const sessionIdsWithAttendance = [...new Set(attendances?.map(a => a.session_id) ?? [])];
      if (sessionIdsWithAttendance.length > 0) {
        const { error: updateErr } = await supabase
          .from('sessions')
          .update({ billing_period: billingPeriod })
          .in('session_id', sessionIdsWithAttendance);
        if (updateErr) throw updateErr;
      }
    }

    return NextResponse.json({
      message: `Đã chốt sổ thành công cho ${paymentsToInsert.length} hóa đơn.`,
      billingPeriod,
      zero_amount_count: zeroAmountCount // B4: trả về số buổi bị bỏ qua do học phí = 0
    });

  } catch (error: any) {
    console.error('Error generating billing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
