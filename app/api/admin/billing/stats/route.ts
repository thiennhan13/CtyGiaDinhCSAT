import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  billingPeriod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

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
    let query = supabase
      .from('sessions')
      .select('session_id, class_id, csat_fee_snapshot, classes(name, csat_fee_per_session, tutors(tutor_id, name))')
      .eq('status', 'completed');

    if (billingPeriod) {
      // Historical view
      query = query.eq('billing_period', billingPeriod);
    } else if (startDateStr && endDateStr) {
      // Preview mode for unbilled sessions
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

    // 2. Fetch attendance
    const { data: attendances, error: attErr } = await supabase
      .from('session_attendance')
      .select('session_id, student_id, status, tuition_fee_snapshot')
      .in('session_id', sessionIds)
      .eq('status', 'attended');

    if (attErr) throw attErr;

    // 3. Fetch fees as fallback backward compatible
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

    // Compute
    let totalStudentTuition = 0;
    let totalCsatRevenue = 0;
    let totalTutorSalary = 0;

    const tutorStatsMap: Record<string, { tutor_id: string, name: string, salary: number, csat_deducted: number, tuition_collected: number }> = {};

    sessions.forEach(session => {
      const classId = session.class_id;
      const cls = session.classes as any;
      const tutor = cls?.tutors as any;
      const tutorId = tutor?.tutor_id || 'unknown';
      
      const csatFee = session.csat_fee_snapshot != null ? parseFloat(String(session.csat_fee_snapshot)) : (cls?.csat_fee_per_session ? parseFloat(String(cls.csat_fee_per_session)) : 0);
      
      if (!tutorStatsMap[tutorId]) {
        tutorStatsMap[tutorId] = { tutor_id: tutorId, name: tutor?.name, salary: 0, csat_deducted: 0, tuition_collected: 0 };
      }

      // Attended students for this session
      const attended = attendances?.filter(a => a.session_id === session.session_id) || [];
      
      let sessionTuition = 0;
      attended.forEach(att => {
        const fallback = feeMap[`${att.student_id}|${classId}`] || 0;
        const fee = att.tuition_fee_snapshot != null ? parseFloat(String(att.tuition_fee_snapshot)) : fallback;
        sessionTuition += fee;
      });

      // Nếu không có học sinh nào đi học (sessionTuition = 0), không thu phí CSAT của trung tâm 
      // để tránh âm lương gia sư.
      const actualCsatFee = sessionTuition > 0 ? csatFee : 0;

      const tutorSessionSalary = sessionTuition - actualCsatFee;

      totalStudentTuition += sessionTuition;
      totalCsatRevenue += actualCsatFee; // Center revenue per session
      
      tutorStatsMap[tutorId].tuition_collected += sessionTuition;
      tutorStatsMap[tutorId].csat_deducted += actualCsatFee;
      tutorStatsMap[tutorId].salary += tutorSessionSalary;
      totalTutorSalary += tutorSessionSalary;
    });

    // Center revenue = (Total Student Tuition - Total Tutor Salary)
    // Wait mathematically: Center Revenue = Total CSAT. Wait! Is it?
    // User definition of total revenue: Center gets the CSAT fees. Plus whatever isn't paid to tutor. If Tutor is paid (sessionTuition - CSAT), the remaining from sessionTuition is CSAT. So Center Revenue exactly equals Total CSAT.
    const centerRevenue = totalStudentTuition - totalTutorSalary; 

    return NextResponse.json({
      totalStudentTuition,
      tutorSalaries: Object.values(tutorStatsMap).sort((a,b) => b.salary - a.salary),
      totalCenterRevenue: centerRevenue,
      totalCsatRevenue
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
