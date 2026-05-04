import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createStudentSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  age: z.union([z.string(), z.number()]).transform(val => Number(val)),
  province: z.string().min(2, "Vui lòng nhập tỉnh thành"),
  contact_phone: z.string().optional(),
  contact_link: z.string().optional(),
  status: z.string().optional().default('Đang học'),
  default_tuition_fee: z.union([z.string(), z.number()]).transform(val => Number(val)).optional().default(100000),
  notes: z.string().optional(),
});

const updateStudentSchema = z.object({
  action: z.literal('update'),
  student_id: z.string().uuid("Student ID không hợp lệ"),
  name: z.string().min(2).optional(),
  age: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  province: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_link: z.string().optional(),
  status: z.string().optional(),
  default_tuition_fee: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  notes: z.string().optional(),
});

const deleteStudentSchema = z.object({
  action: z.literal('delete'),
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
    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối. Chỉ Admin mới có thể thực hiện.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = studentActionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (parsed.data.action === 'create') {
      const { data, error } = await adminClient.from('students').insert([{ 
        name: parsed.data.name, 
        age: parsed.data.age, 
        province: parsed.data.province, 
        contact_phone: parsed.data.contact_phone, 
        contact_link: parsed.data.contact_link, 
        status: parsed.data.status, 
        default_tuition_fee: parsed.data.default_tuition_fee, 
        notes: parsed.data.notes
      }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Thêm học sinh thành công', data });
    }

    if (parsed.data.action === 'update') {
      const { action, student_id, ...updateData } = parsed.data;
      const { data, error } = await adminClient.from('students').update(updateData).eq('student_id', student_id).select().single();
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
