import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createStudentSchema = z.object({
  action:              z.literal('create'),
  // Chỉ bắt buộc tên
  name:                z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  // Tất cả còn lại optional
  date_of_birth:       z.string().date("Ngày sinh không hợp lệ").optional().nullable(),
  // student_contact = liên lạc học sinh (Link FB / SĐT Zalo)
  student_contact:     z.string().optional().nullable(),
  // parent_contact = liên lạc phụ huynh (Link FB / SĐT Zalo)
  parent_contact:      z.string().optional().nullable(),
  province:            z.string().optional().nullable(),
  parent_name:         z.string().optional().nullable(),
  zalo_class_name:     z.string().optional().nullable(),
  status:              z.string().optional().default('Đang học'),
  notes:               z.string().optional().nullable(),
});

const updateStudentSchema = z.object({
  action:              z.literal('update'),
  student_id:          z.string().uuid("Student ID không hợp lệ"),
  name:                z.string().min(2).optional(),
  date_of_birth:       z.string().date("Ngày sinh không hợp lệ").optional().nullable(),
  student_contact:     z.string().optional().nullable(),
  parent_contact:      z.string().optional().nullable(),
  province:            z.string().optional().nullable(),
  parent_name:         z.string().optional().nullable(),
  zalo_class_name:     z.string().optional().nullable(),
  status:              z.string().optional(),
  notes:               z.string().optional().nullable(),
});

const deleteStudentSchema = z.object({
  action:     z.literal('delete'),
  student_id: z.string().uuid("Student ID không hợp lệ"),
});

const studentActionSchema = z.discriminatedUnion('action', [
  createStudentSchema,
  updateStudentSchema,
  deleteStudentSchema
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kiểm tra quyền Admin
    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin' && user.email !== 'csattutor@gmail.com')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = studentActionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (parsed.data.action === 'create') {
      const { data, error } = await adminClient.from('students').insert([{ 
        name:                parsed.data.name, 
        date_of_birth:       parsed.data.date_of_birth ?? null,
        student_contact:     parsed.data.student_contact ?? null,
        parent_contact:      parsed.data.parent_contact ?? null,
        province:            parsed.data.province ?? null,
        parent_name:         parsed.data.parent_name ?? null,
        zalo_class_name:     parsed.data.zalo_class_name ?? null,
        status:              parsed.data.status, 
        notes:               parsed.data.notes ?? null,
      }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Thêm học sinh thành công', data });
    }

    if (parsed.data.action === 'update') {
      const { action, student_id, ...updateData } = parsed.data;
      const { data, error } = await adminClient
        .from('students')
        .update(updateData)
        .eq('student_id', student_id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật thành công', data });
    }

    if (parsed.data.action === 'delete') {
      const studentId = parsed.data.student_id;
      // Hard Delete: Xóa liên kết trước để tránh lỗi Foreign Key
      await adminClient.from('session_attendance').delete().eq('student_id', studentId);
      await adminClient.from('class_students').delete().eq('student_id', studentId);
      await adminClient.from('payments').delete().eq('student_id', studentId);
      
      const { error } = await adminClient.from('students').delete().eq('student_id', studentId);
      if (error) throw error;
      return NextResponse.json({ message: 'Đã xóa hoàn toàn học sinh (hard delete)' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Student API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
