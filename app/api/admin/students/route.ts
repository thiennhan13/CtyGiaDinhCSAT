import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kiểm tra quyền Admin
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối. Chỉ Admin mới có thể thực hiện.' }, { status: 403 });
    }

    const { action, name, student_id } = await request.json();
    const adminClient = createAdminClient();

    if (action === 'create') {
      if (!name) return NextResponse.json({ error: 'Thiếu tên học sinh' }, { status: 400 });
      const { data, error } = await adminClient.from('students').insert([{ name }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Thêm học sinh thành công', data });
    }

    if (action === 'delete') {
      if (!student_id) return NextResponse.json({ error: 'Thiếu mã học sinh' }, { status: 400 });
      const { error } = await adminClient.from('students').update({ is_deleted: true }).eq('student_id', student_id);
      if (error) throw error;
      return NextResponse.json({ message: 'Xóa học sinh thành công' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Student API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
