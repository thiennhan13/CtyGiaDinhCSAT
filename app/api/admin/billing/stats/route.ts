import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period');
  
  const parsed = querySchema.safeParse({ period: periodParam });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const period = parsed.data.period;

  // Parse period to dates
  const year = parseInt(period.split('-')[0], 10);
  const month = parseInt(period.split('-')[1], 10);
  
  // start is "YYYY-MM-01"
  const startDateStr = `${period}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDateStr = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

  try {
    // 1. Fetch completed sessions in the month
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('session_id, class_id, csat_fee_snapshot, classes(name, csat_fee_per_session, tutors(tutor_id, name))')
      .gte('date', startDateStr)
      .lt('date', endDateStr) // until 1st of next month
      .eq('status', 'completed');

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
