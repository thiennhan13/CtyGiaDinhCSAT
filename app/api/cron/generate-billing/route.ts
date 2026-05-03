import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function GET(request: Request) {
  // Check authorization for Vercel Cron
  if (process.env.CRON_SECRET) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  
  // 1. Xác định billing_period là tháng vừa qua
  // Currently we use Node date
  const lastMonthDate = subMonths(new Date(), 1);
  const startOfLastMonthStr = format(startOfMonth(lastMonthDate), 'yyyy-MM-dd');
  // Simplistic last day
  const endOfLastMonthStr = format(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0), 'yyyy-MM-dd');
  const billingPeriod = format(lastMonthDate, 'yyyy-MM'); // "2026-04"

  console.log(`Bắt đầu quá trình chốt sổ tháng ${billingPeriod}`);

  try {
    // 2 & 3. Dùng RPC hoặc truy vấn thủ công. Vì không có RPC sẵn, ta truy vấn thông qua JS.
    // Lấy tất cả session attendance trong tháng có status = 'attended'
    
    // We get sessions from last month
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('session_id, class_id')
      .gte('date', startOfLastMonthStr)
      .lte('date', endOfLastMonthStr);

    if (sessionErr) throw sessionErr;
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No sessions found for last month.' });
    }

    const sessionIds = sessions.map(s => s.session_id);

    // Lấy attendance cho các session này
    const { data: attendances, error: attErr } = await supabase
      .from('session_attendance')
      .select('session_id, student_id, status')
      .in('session_id', sessionIds)
      .eq('status', 'attended');

    if (attErr) throw attErr;

    // Build map session_id -> class_id
    const sessionClassMap: Record<string, string> = {};
    sessions.forEach(s => {
      sessionClassMap[s.session_id] = s.class_id;
    });

    // Count attendances per student per class
    // Key: "student_id|class_id" -> count
    const studentClassCounts: Record<string, number> = {};
    
    attendances?.forEach(att => {
      const classId = sessionClassMap[att.session_id];
      const key = `${att.student_id}|${classId}`;
      studentClassCounts[key] = (studentClassCounts[key] || 0) + 1;
    });

    // Lấy thông tin tuition_fee_per_session từ class_students
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('class_id, student_id, tuition_fee_per_session');

    if (csErr) throw csErr;

    const feeMap: Record<string, number> = {};
    classStudents?.forEach(cs => {
      const key = `${cs.student_id}|${cs.class_id}`;
      // ensuring numeric type
      feeMap[key] = parseFloat(String(cs.tuition_fee_per_session)) || 0;
    });

    const paymentsToInsert = [];

    // 4 & 5. Tạo payments
    for (const [key, count] of Object.entries(studentClassCounts)) {
      const [studentId, classId] = key.split('|');
      const feePerSession = feeMap[key] || 0;
      const totalAmount = count * feePerSession;

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
    }

    return NextResponse.json({ message: `Đã chốt sổ thành công cho ${paymentsToInsert.length} hóa đơn.`, billingPeriod });

  } catch (error: any) {
    console.error('Error generating billing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
