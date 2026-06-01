import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createClassSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, "Tên lớp phải có ít nhất 2 ký tự"),
  tutor_id: z.string().uuid("Tutor ID không hợp lệ"),
  csat_fee_per_session: z.number().min(0, "CSAT fee không được âm"),
  start_date: z.string().date("Ngày bắt đầu không hợp lệ"),
  end_date: z.string().date("Ngày kết thúc không hợp lệ"),
  students: z.array(z.object({
    student_id: z.string().uuid(),
    tuition_fee_per_session: z.number().min(0)
  })),
  sessions: z.array(z.object({
    date: z.string().date(),
    start_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ"),
    end_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ")
  }))
});

const archiveClassSchema = z.object({
  action: z.literal('archive'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
});

const hardDeleteClassSchema = z.object({
  action: z.literal('hard_delete'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
});

const extendClassSchema = z.object({
  action: z.literal('extend'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
  end_date: z.string().date("Ngày không hợp lệ")
});

const classActionSchema = z.discriminatedUnion('action', [
  createClassSchema,
  archiveClassSchema,
  hardDeleteClassSchema,
  extendClassSchema
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kiểm tra quyền Admin
    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = classActionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (parsed.data.action === 'create') {
      const { name, tutor_id, csat_fee_per_session, start_date, end_date, students, sessions } = parsed.data;

      // 1. Check for conflicts
      if (sessions.length > 0) {
        const { data: existingSessions, error: fetchErr } = await adminClient
          .from('sessions')
          .select('date, start_time, end_time, classes!inner(name, tutor_id)')
          .eq('classes.tutor_id', tutor_id)
          .in('date', sessions.map(s => s.date));

        if (fetchErr) throw fetchErr;

        let conflictFound = false;
        let conflictMsg = '';
        for (const newSession of sessions) {
          const existingOnSameDate = existingSessions?.filter(s => s.date === newSession.date);
          if (existingOnSameDate && existingOnSameDate.length > 0) {
            for (const existing of existingOnSameDate) {
              if (newSession.start_time < existing.end_time && newSession.end_time > existing.start_time) {
                conflictFound = true;
                conflictMsg = `Trùng lịch gia sư: Ngày ${newSession.date}, Giờ mới: ${newSession.start_time}-${newSession.end_time}, Giờ cũ (${(existing.classes as any).name}): ${existing.start_time}-${existing.end_time}`;
                break;
              }
            }
          }
          if (conflictFound) break;
        }

        if (conflictFound) {
          return NextResponse.json({ error: conflictMsg }, { status: 400 });
        }
      }

      // 2. Call RPC create_class_full
      const { data, error } = await adminClient.rpc('create_class_full', {
        p_name: name,
        p_tutor_id: tutor_id,
        p_csat_fee: csat_fee_per_session,
        p_start_date: start_date,
        p_end_date: end_date,
        p_students: students,
        p_sessions: sessions
      });

      if (error) throw error;
      return NextResponse.json({ message: 'Tạo lớp và lịch dạy thành công', data: { class_id: data } });
    }

    if (parsed.data.action === 'archive') {
      const classId = parsed.data.class_id;
      // 1. Chuyển lớp thành inactive
      const { error } = await adminClient.from('classes').update({ status: 'inactive' }).eq('class_id', classId);
      if (error) throw error;
      
      // 2. Huỷ các session chưa học (scheduled) để không bị tính doanh thu hay hiển thị sắp tới
      await adminClient.from('sessions').update({ status: 'cancelled' }).eq('class_id', classId).eq('status', 'scheduled');

      // 3. Chuyển class_students cũng thành dropped
      await adminClient.from('class_students').update({ status: 'dropped' }).eq('class_id', classId).eq('status', 'active');

      return NextResponse.json({ message: 'Ngừng dạy lớp và huỷ các lịch học sắp tới thành công' }); 
    }

    if (parsed.data.action === 'hard_delete') {
      const classId = parsed.data.class_id;
      const { error } = await adminClient.from('classes').delete().eq('class_id', classId);
      if (error) throw error;
      return NextResponse.json({ message: 'Xóa lớp thành công' });
    }

    if (parsed.data.action === 'extend') {
      const classId = parsed.data.class_id;
      const targetEndDateStr = parsed.data.end_date;

      // Ensure timezone-safe parsing: YYYY-MM-DD to local Midnight
      const parseLocalDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      };

      const formatLocalDate = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      // 1. Find the latest session to know where to start generating from
      const { data: latestSession, error: latestErr } = await adminClient
        .from('sessions')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false })
        .limit(1)
        .single();
        
      if (latestErr || !latestSession) {
        return NextResponse.json({ error: 'Không tìm thấy buổi học nào để gia hạn. Vui lòng thêm lịch thủ công trước.' }, { status: 400 });
      }

      // 2. Fetch the latest up to 30 sessions to derive a robust pattern
      // Because there might be holidays or cancelled weeks, we look back further.
      const { data: recentSessions, error: patternErr } = await adminClient
        .from('sessions')
        .select('date, start_time, end_time, csat_fee_snapshot')
        .eq('class_id', classId)
        .order('date', { ascending: false })
        .limit(30);

      if (patternErr || !recentSessions || recentSessions.length === 0) {
        return NextResponse.json({ error: 'Lỗi khi lấy mẫu lịch học khôi phục.' }, { status: 400 });
      }

      // 3. Extract the "Default Pattern"
      // We map dayOfWeek (0-6) -> Latest session schedule for that day
      const patternMap = new Map<number, {start_time: string, end_time: string, csat_fee_snapshot: number}>();
      for (const s of recentSessions) {
        const d = parseLocalDate(s.date);
        const dayOfWeek = d.getDay();
        if (!patternMap.has(dayOfWeek)) {
          patternMap.set(dayOfWeek, {
            start_time: s.start_time,
            end_time: s.end_time,
            csat_fee_snapshot: s.csat_fee_snapshot
          });
        }
      }

      if (patternMap.size === 0) {
        return NextResponse.json({ error: 'Không thể trích xuất mẫu lịch học từ lịch sử.' }, { status: 400 });
      }

      const generatedSessions = [];
      let currentDate = parseLocalDate(latestSession.date);
      currentDate.setDate(currentDate.getDate() + 1); // Start from the day after the latest session
      
      const targetEndDate = parseLocalDate(targetEndDateStr);
      if (currentDate > targetEndDate) {
        return NextResponse.json({ error: 'Ngày kết thúc phải lớn hơn ngày của buổi học hiện tại.' }, { status: 400 });
      }

      while (currentDate <= targetEndDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (patternMap.has(dayOfWeek)) {
          const p = patternMap.get(dayOfWeek)!;
          generatedSessions.push({
            class_id: classId,
            date: formatLocalDate(currentDate),
            start_time: p.start_time,
            end_time: p.end_time,
            csat_fee_snapshot: p.csat_fee_snapshot,
            status: 'scheduled'
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (generatedSessions.length === 0) {
        return NextResponse.json({ error: 'Không thể tạo lịch mới từ mẫu hiện tại, có thể thời gian gia hạn quá ngắn.' }, { status: 400 });
      }

      const { error: insertErr } = await adminClient.from('sessions').insert(generatedSessions);
      if (insertErr) throw insertErr;

      return NextResponse.json({ message: `Đã gia hạn đến ngày ${targetEndDateStr} (${generatedSessions.length} buổi học mới).` });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Classes API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
