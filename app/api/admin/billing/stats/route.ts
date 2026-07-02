import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin' && user.email !== 'csattutor@gmail.com')) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const billingPeriod = searchParams.get('billingPeriod');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    // Lấy sessions kèm tutor_id_snapshot + date để hiển thị chi tiết từng buổi
    let query = supabase
      .from('sessions')
      .select('session_id, class_id, date, csat_fee_snapshot, tutor_id_snapshot, classes(name, csat_fee_per_session, tutors(tutor_id, name))')
      .eq('status', 'completed')
      .order('date', { ascending: true });

    if (billingPeriod) {
      query = query.eq('billing_period', billingPeriod);
    } else if (startDateStr && endDateStr) {
      query = query.gte('date', startDateStr).lte('date', endDateStr).is('billing_period', null);
    } else {
      return NextResponse.json({ error: 'Must provide billingPeriod or both startDate and endDate' }, { status: 400 });
    }

    const { data: sessions, error: sessionErr } = await query;
    if (sessionErr) throw sessionErr;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        totalStudentTuition: 0,
        tutorSalaries: [],
        totalCenterRevenue: 0,
        totalCsatRevenue: 0,
        studentInvoicePreview: [],
        tutorSalaryDetail: [],
      });
    }

    const sessionIds = sessions.map(s => s.session_id);

    // Fetch attendance — thêm students(name) để hiển thị tên trong preview
    const { data: attendances, error: attErr } = await supabase
      .from('session_attendance')
      .select('session_id, student_id, status, tuition_fee_snapshot, students(name)')
      .in('session_id', sessionIds)
      .eq('status', 'attended');

    if (attErr) throw attErr;

    // Fetch fees as fallback (backward compatible)
    const classIds = Array.from(new Set(sessions.map(s => s.class_id)));
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('class_id, student_id, tuition_fee_per_session')
      .in('class_id', classIds);

    if (csErr) throw csErr;

    const feeMap: Record<string, number> = {};
    classStudents?.forEach(cs => {
      feeMap[`${cs.student_id}|${cs.class_id}`] = parseFloat(String(cs.tuition_fee_per_session)) || 0;
    });

    // FIX BUG #1: Fetch tên gia sư theo tutor_id_snapshot (không phải gia sư hiện tại của lớp)
    const snapshotTutorIds = [...new Set(
      sessions.map(s => s.tutor_id_snapshot).filter((id): id is string => !!id)
    )];

    const snapshotTutorMap: Record<string, { tutor_id: string; name: string }> = {};
    if (snapshotTutorIds.length > 0) {
      const { data: snapshotTutors } = await supabase
        .from('tutors')
        .select('tutor_id, name')
        .in('tutor_id', snapshotTutorIds);

      snapshotTutors?.forEach(t => {
        snapshotTutorMap[t.tutor_id] = t;
      });
    }

    // =====================================================
    // COMPUTE: Tổng kết + Chi tiết gia sư + Preview hóa đơn
    // =====================================================
    let totalStudentTuition = 0;
    let totalCsatRevenue    = 0;
    let totalTutorSalary    = 0;

    // Cấu trúc tổng kết gia sư (tổng + chi tiết từng lớp + từng buổi)
    const tutorStatsMap: Record<string, {
      tutor_id: string;
      name: string;
      salary: number;
      csat_deducted: number;
      tuition_collected: number;
      classes: Record<string, {
        class_id: string;
        class_name: string;
        session_count: number;
        tuition: number;
        csat: number;
        sessions: Array<{
          date: string;
          attended_count: number;
          tuition: number;
          csat: number;
          net: number;
        }>;
      }>;
    }> = {};

    // Cấu trúc preview hóa đơn học sinh (key: student_id|class_id)
    const studentInvoiceMap: Record<string, {
      student_id: string;
      student_name: string;
      class_id: string;
      class_name: string;
      session_count: number;
      total_amount: number;
      has_zero_fee: boolean;
    }> = {};

    sessions.forEach(session => {
      const classId   = session.class_id;
      const cls       = session.classes as any;
      const className = cls?.name ?? '---';
      const currentTutor = cls?.tutors as any;

      // FIX BUG #1: Ưu tiên snapshot tutor → fallback về current tutor
      const snapshotTutor = session.tutor_id_snapshot
        ? snapshotTutorMap[session.tutor_id_snapshot]
        : null;
      const tutorId   = snapshotTutor?.tutor_id ?? currentTutor?.tutor_id ?? 'unknown';
      const tutorName = snapshotTutor?.name     ?? currentTutor?.name     ?? 'Không rõ';

      // FIX BUG #2: csat_fee_snapshot ưu tiên → fallback csat_fee_per_session
      const csatFee = session.csat_fee_snapshot != null
        ? parseFloat(String(session.csat_fee_snapshot))
        : (cls?.csat_fee_per_session ? parseFloat(String(cls.csat_fee_per_session)) : 0);

      // Khởi tạo entry gia sư
      if (!tutorStatsMap[tutorId]) {
        tutorStatsMap[tutorId] = {
          tutor_id: tutorId, name: tutorName,
          salary: 0, csat_deducted: 0, tuition_collected: 0,
          classes: {},
        };
      }
      // Khởi tạo entry lớp trong gia sư
      if (!tutorStatsMap[tutorId].classes[classId]) {
        tutorStatsMap[tutorId].classes[classId] = {
          class_id: classId, class_name: className,
          session_count: 0, tuition: 0, csat: 0, sessions: [],
        };
      }

      // Tính học phí từ điểm danh
      const attended = (attendances ?? []).filter(a => a.session_id === session.session_id);
      let sessionTuition = 0;
      attended.forEach(att => {
        const fallback = feeMap[`${att.student_id}|${classId}`] || 0;
        const fee = att.tuition_fee_snapshot != null
          ? parseFloat(String(att.tuition_fee_snapshot))
          : fallback;
        sessionTuition += fee;

        // Cập nhật preview hóa đơn học sinh
        const studentName = (att.students as any)?.name ?? att.student_id;
        const invKey = `${att.student_id}|${classId}`;
        if (!studentInvoiceMap[invKey]) {
          studentInvoiceMap[invKey] = {
            student_id:   att.student_id,
            student_name: studentName,
            class_id:     classId,
            class_name:   className,
            session_count: 0,
            total_amount:  0,
            has_zero_fee:  false,
          };
        }
        studentInvoiceMap[invKey].session_count += 1;
        studentInvoiceMap[invKey].total_amount  += fee;
        if (fee === 0) studentInvoiceMap[invKey].has_zero_fee = true;
      });

      // Không thu phí CSAT nếu không có học sinh đi học (tránh âm lương)
      const actualCsatFee      = sessionTuition > 0 ? csatFee : 0;
      const tutorSessionSalary = sessionTuition - actualCsatFee;

      totalStudentTuition += sessionTuition;
      totalCsatRevenue    += actualCsatFee;
      totalTutorSalary    += tutorSessionSalary;

      // Cập nhật stats gia sư (tổng)
      tutorStatsMap[tutorId].tuition_collected += sessionTuition;
      tutorStatsMap[tutorId].csat_deducted     += actualCsatFee;
      tutorStatsMap[tutorId].salary            += tutorSessionSalary;

      // Cập nhật chi tiết lớp trong gia sư
      const classEntry = tutorStatsMap[tutorId].classes[classId];
      classEntry.session_count += 1;
      classEntry.tuition       += sessionTuition;
      classEntry.csat          += actualCsatFee;
      classEntry.sessions.push({
        date:          session.date,
        attended_count: attended.length,
        tuition:       sessionTuition,
        csat:          actualCsatFee,
        net:           tutorSessionSalary,
      });
    });

    const centerRevenue = totalStudentTuition - totalTutorSalary;

    // Format tutorSalaryDetail — flatten classes map thành array
    const tutorSalaryDetail = Object.values(tutorStatsMap)
      .map(t => ({
        tutor_id:          t.tutor_id,
        name:              t.name,
        salary:            t.salary,
        csat_deducted:     t.csat_deducted,
        tuition_collected: t.tuition_collected,
        classes: Object.values(t.classes).map(c => ({
          ...c,
          sessions: (c.sessions || []).slice().sort((s1: any, s2: any) => (s1.date || '').localeCompare(s2.date || '')),
        })).sort((a, b) => b.tuition - a.tuition),
      }))
      .sort((a, b) => b.salary - a.salary);

    // Format studentInvoicePreview — sort by class_name, then student_name
    const studentInvoicePreview = Object.values(studentInvoiceMap)
      .sort((a, b) =>
        a.class_name.localeCompare(b.class_name) ||
        a.student_name.localeCompare(b.student_name)
      );

    return NextResponse.json({
      totalStudentTuition,
      totalTutorSalary,
      tutorSalaries: Object.values(tutorStatsMap)
        .map(t => ({
          tutor_id: t.tutor_id, name: t.name,
          salary: t.salary, csat_deducted: t.csat_deducted, tuition_collected: t.tuition_collected,
        }))
        .sort((a, b) => b.salary - a.salary),
      totalCenterRevenue: centerRevenue,
      totalCsatRevenue,
      // MỚI: dữ liệu chi tiết cho UI preview
      studentInvoicePreview,
      tutorSalaryDetail,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
