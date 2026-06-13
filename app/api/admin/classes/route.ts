import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createClassSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, "Tên lớp phải có ít nhất 2 ký tự"),
  class_type: z.string(),
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
  start_date: z.string().date("Ngày bắt đầu không hợp lệ"),
  end_date: z.string().date("Ngày kết thúc không hợp lệ"),
  schedule_configs: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ"),
    end_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ")
  })).min(1, "Vui lòng cấu hình ít nhất 1 buổi trong tuần")
});

const editSessionSchema = z.object({
  action: z.literal('edit_session'),
  session_id: z.string().uuid("Session ID không hợp lệ"),
  date: z.string().date("Ngày không hợp lệ"),
  start_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Giờ không hợp lệ")
});

const changeTutorSchema = z.object({
  action: z.literal('change_tutor'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
  new_tutor_id: z.string().uuid("Tutor ID không hợp lệ"),
  effective_date: z.string().date("Ngày hiệu lực không hợp lệ"),
  notes: z.string().optional(),
});

const updateCsatFeeSchema = z.object({
  action: z.literal('update_csat_fee'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
  new_csat_fee: z.number().min(0, "Phí CSAT không được âm"),
  effective_date: z.string().date("Ngày hiệu lực không hợp lệ"),
  notes: z.string().optional(),
});

const updateStudentFeeSchema = z.object({
  action: z.literal('update_student_fee'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
  student_id: z.string().uuid("Student ID không hợp lệ"),
  new_fee: z.number().min(0, "Học phí không được âm"),
  student_name: z.string().optional()
});

const classActionSchema = z.discriminatedUnion('action', [
  createClassSchema,
  archiveClassSchema,
  hardDeleteClassSchema,
  extendClassSchema,
  editSessionSchema,
  changeTutorSchema,
  updateCsatFeeSchema,
  updateStudentFeeSchema,
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin' && user.email !== 'csattutor@gmail.com')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = classActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // ==============================
    // ACTION: create
    // ==============================
    if (parsed.data.action === 'create') {
      const { name, class_type, tutor_id, csat_fee_per_session, start_date, end_date, students, sessions } = parsed.data;

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

      const { data, error } = await adminClient.rpc('create_class_full', {
        p_name: name,
        p_class_type: class_type,
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

    // ==============================
    // ACTION: archive
    // ==============================
    if (parsed.data.action === 'archive') {
      const classId = parsed.data.class_id;
      const { error } = await adminClient.from('classes').update({ status: 'inactive' }).eq('class_id', classId);
      if (error) throw error;
      await adminClient.from('sessions').update({ status: 'cancelled' }).eq('class_id', classId).eq('status', 'scheduled');
      await adminClient.from('class_students').update({ status: 'dropped' }).eq('class_id', classId).eq('status', 'active');
      return NextResponse.json({ message: 'Ngừng dạy lớp và huỷ các lịch học sắp tới thành công' });
    }

    // ==============================
    // ACTION: hard_delete
    // ==============================
    if (parsed.data.action === 'hard_delete') {
      const classId = parsed.data.class_id;
      const { error } = await adminClient.from('classes').delete().eq('class_id', classId);
      if (error) throw error;
      return NextResponse.json({ message: 'Xóa lớp thành công' });
    }

    // ==============================
    // ACTION: extend — Tạo lịch hàng loạt
    // Fix Bug #1: lưu tutor_id_snapshot khi tạo buổi học
    // ==============================
    if (parsed.data.action === 'extend') {
      const { class_id, start_date, end_date, schedule_configs } = parsed.data;

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

      // Lấy cả csat_fee và tutor_id để set snapshot (Fix Bug #1)
      const { data: cls } = await adminClient
        .from('classes')
        .select('csat_fee_per_session, tutor_id')
        .eq('class_id', class_id)
        .single();

      const fee = cls?.csat_fee_per_session || 0;
      const tutorId = cls?.tutor_id || null;

      const generatedSessions: any[] = [];
      let currentDate = parseLocalDate(start_date);
      const targetEndDate = parseLocalDate(end_date);

      if (currentDate > targetEndDate) {
        return NextResponse.json({ error: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' }, { status: 400 });
      }

      while (currentDate <= targetEndDate) {
        const dayOfWeek = currentDate.getDay();
        const configsForDay = schedule_configs.filter(c => c.dayOfWeek === dayOfWeek);

        for (const config of configsForDay) {
          generatedSessions.push({
            class_id,
            date: formatLocalDate(currentDate),
            start_time: config.start_time,
            end_time: config.end_time,
            csat_fee_snapshot: fee,
            tutor_id_snapshot: tutorId, // Fix Bug #1: chốt gia sư tại thời điểm tạo lịch
            status: 'scheduled'
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (generatedSessions.length === 0) {
        return NextResponse.json({ error: 'Không có buổi học nào được tạo với lịch cố định này trong khoảng thời gian đã chọn.' }, { status: 400 });
      }

      const { error: insertErr } = await adminClient.from('sessions').insert(generatedSessions);
      if (insertErr) throw insertErr;

      return NextResponse.json({ message: `Đã tạo ${generatedSessions.length} buổi học thành công.` });
    }

    // ==============================
    // ACTION: edit_session
    // ==============================
    if (parsed.data.action === 'edit_session') {
      const { session_id, date, start_time, end_time } = parsed.data;
      const { error } = await adminClient.from('sessions')
        .update({ date, start_time, end_time })
        .eq('session_id', session_id);

      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật buổi học thành công' });
    }

    // ==============================
    // ACTION: change_tutor — ATOMIC via RPC
    // Fix Bug #1: cập nhật tutor_id_snapshot cho buổi scheduled
    // Fix Bug #3: toàn bộ logic trong 1 PostgreSQL transaction
    // ==============================
    if (parsed.data.action === 'change_tutor') {
      const { class_id, new_tutor_id, effective_date, notes } = parsed.data;

      const { data: rpcResult, error: rpcErr } = await adminClient.rpc('change_tutor_safe', {
        p_class_id:       class_id,
        p_new_tutor_id:   new_tutor_id,
        p_effective_date: effective_date,
        p_changed_by:     user.email ?? 'unknown',
        p_notes:          notes ?? null,
      });

      if (rpcErr) throw rpcErr;

      return NextResponse.json({
        message:          (rpcResult as any)?.message ?? 'Đổi gia sư thành công.',
        updated_sessions: (rpcResult as any)?.updated_sessions ?? 0,
      });
    }

    // ==============================
    // ACTION: update_csat_fee — ATOMIC via RPC
    // Fix Bug #2: fill null snapshots với phí cũ trước khi đổi
    // Fix Bug #3: toàn bộ logic trong 1 PostgreSQL transaction
    // ==============================
    if (parsed.data.action === 'update_csat_fee') {
      const { class_id, new_csat_fee, effective_date, notes } = parsed.data;

      const { data: rpcResult, error: rpcErr } = await adminClient.rpc('update_csat_fee_safe', {
        p_class_id:       class_id,
        p_new_fee:        new_csat_fee,
        p_effective_date: effective_date,
        p_changed_by:     user.email ?? 'unknown',
        p_notes:          notes ?? null,
      });

      if (rpcErr) throw rpcErr;

      return NextResponse.json({
        message:              (rpcResult as any)?.message ?? 'Cập nhật phí CSAT thành công.',
        updated_sessions:     (rpcResult as any)?.updated_sessions ?? 0,
        null_snapshots_fixed: (rpcResult as any)?.null_snapshots_fixed ?? 0,
      });
    }

    // ==============================
    // ACTION: update_student_fee
    // ==============================
    if (parsed.data.action === 'update_student_fee') {
      const { class_id, student_id, new_fee, student_name } = parsed.data;

      // 1. Get old fee
      const { data: oldData } = await adminClient
        .from('class_students')
        .select('tuition_fee_per_session')
        .eq('class_id', class_id)
        .eq('student_id', student_id)
        .single();
      
      const oldFee = oldData?.tuition_fee_per_session || 0;

      // 2. Update fee
      const { error: updateErr } = await adminClient
        .from('class_students')
        .update({ tuition_fee_per_session: new_fee })
        .eq('class_id', class_id)
        .eq('student_id', student_id);

      if (updateErr) throw updateErr;

      // 3. Log change
      await adminClient.from('class_change_log').insert({
        class_id,
        change_type: 'student_fee_change',
        old_value: String(oldFee),
        new_value: String(new_fee),
        old_label: `Học phí cũ (${student_name || 'Học sinh'})`,
        new_label: `Học phí mới (${student_name || 'Học sinh'})`,
        changed_by: user.email,
        notes: `student_id: ${student_id}`
      });

      return NextResponse.json({ message: 'Cập nhật học phí thành công' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin Classes API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
