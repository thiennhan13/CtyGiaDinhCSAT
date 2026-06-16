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
    // Lấy sessions kèm tutor_id_snapshot (Fix Bug #1) và fallback qua classes.tutors
    let query = supabase
      .from('sessions')
      .select('session_id, class_id, csat_fee_snapshot, tutor_id_snapshot, classes(name, csat_fee_per_session, tutors(tutor_id, name))')
      .eq('status', 'completed');

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
        totalCsatRevenue: 0
      });
    }

    const sessionIds = sessions.map(s => s.session_id);

    // Fetch attendance
    const { data: attendances, error: attErr } = await supabase
      .from('session_attendance')
      .select('session_id, student_id, status, tuition_fee_snapshot')
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
    // Điều này đảm bảo khi đổi gia sư, lịch sử lương vẫn được gán đúng người đã dạy
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

    // Compute
    let totalStudentTuition = 0;
    let totalCsatRevenue = 0;
    let totalTutorSalary = 0;

    const tutorStatsMap: Record<string, {
      tutor_id: string;
      name: string;
      salary: number;
      csat_deducted: number;
      tuition_collected: number;
    }> = {};

    sessions.forEach(session => {
      const classId = session.class_id;
      const cls = session.classes as any;
      const currentTutor = cls?.tutors as any;

      // FIX BUG #1: Ưu tiên snapshot tutor (chính xác) → fallback về current tutor (dữ liệu cũ)
      const snapshotTutor = session.tutor_id_snapshot
        ? snapshotTutorMap[session.tutor_id_snapshot]
        : null;
      const tutorId   = snapshotTutor?.tutor_id ?? currentTutor?.tutor_id ?? 'unknown';
      const tutorName = snapshotTutor?.name     ?? currentTutor?.name     ?? 'Không rõ';

      // FIX BUG #2: csat_fee_snapshot luôn không null sau khi chạy migration
      // Vẫn giữ fallback để backward compatible với dữ liệu rất cũ
      const csatFee = session.csat_fee_snapshot != null
        ? parseFloat(String(session.csat_fee_snapshot))
        : (cls?.csat_fee_per_session ? parseFloat(String(cls.csat_fee_per_session)) : 0);

      if (!tutorStatsMap[tutorId]) {
        tutorStatsMap[tutorId] = {
          tutor_id: tutorId,
          name: tutorName,
          salary: 0,
          csat_deducted: 0,
          tuition_collected: 0
        };
      }

      // Tính học phí từ điểm danh
      const attended = attendances?.filter(a => a.session_id === session.session_id) || [];
      let sessionTuition = 0;
      attended.forEach(att => {
        const fallback = feeMap[`${att.student_id}|${classId}`] || 0;
        const fee = att.tuition_fee_snapshot != null
          ? parseFloat(String(att.tuition_fee_snapshot))
          : fallback;
        sessionTuition += fee;
      });

      // Không thu phí CSAT nếu không có học sinh đi học (tránh âm lương)
      const actualCsatFee = sessionTuition > 0 ? csatFee : 0;
      const tutorSessionSalary = sessionTuition - actualCsatFee;

      totalStudentTuition += sessionTuition;
      totalCsatRevenue    += actualCsatFee;
      totalTutorSalary    += tutorSessionSalary;

      tutorStatsMap[tutorId].tuition_collected += sessionTuition;
      tutorStatsMap[tutorId].csat_deducted     += actualCsatFee;
      tutorStatsMap[tutorId].salary            += tutorSessionSalary;
    });

    const centerRevenue = totalStudentTuition - totalTutorSalary;

    return NextResponse.json({
      totalStudentTuition,
      totalTutorSalary,
      tutorSalaries: Object.values(tutorStatsMap).sort((a, b) => b.salary - a.salary),
      totalCenterRevenue: centerRevenue,
      totalCsatRevenue
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
