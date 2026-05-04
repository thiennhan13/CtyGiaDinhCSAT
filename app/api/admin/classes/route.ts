import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createClassSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, "Tên lớp phải có ít nhất 2 ký tự"),
  tutor_id: z.string().uuid("Tutor ID không hợp lệ"),
});

const deleteClassSchema = z.object({
  action: z.literal('delete'),
  class_id: z.string().uuid("Class ID không hợp lệ"),
});

const classActionSchema = z.discriminatedUnion('action', [
  createClassSchema,
  deleteClassSchema
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
      const { data, error } = await adminClient.from('classes').insert([{ name: parsed.data.name, tutor_id: parsed.data.tutor_id }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Tạo lớp thành công', data });
    }

    if (parsed.data.action === 'delete') {
      const { error } = await adminClient.from('classes').update({ status: 'inactive' }).eq('class_id', parsed.data.class_id);
      if (error) throw error;
      return NextResponse.json({ message: 'Vô hiệu hóa lớp thành công' }); // Use soft delete / inactive instead of hard delete which violates rules.
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Classes API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
