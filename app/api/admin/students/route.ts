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

    const body = await request.json();
    const { action, student_id, name, age, province, parent_phone, facebook_link, status, default_tuition_fee } = body;
    const adminClient = createAdminClient();

    if (action === 'create') {
      if (!name || !age || !province || !parent_phone) return NextResponse.json({ error: 'Vui lòng điền đủ thông tin bắt buộc' }, { status: 400 });
      const { data, error } = await adminClient.from('students').insert([{ 
        name, age: parseInt(age, 10), province, parent_phone, facebook_link, status: status || 'Đang học', default_tuition_fee: default_tuition_fee ? parseInt(default_tuition_fee, 10) : 100000
      }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Thêm học sinh thành công', data });
    }

    if (action === 'update') {
      if (!student_id) return NextResponse.json({ error: 'Thiếu mã học sinh' }, { status: 400 });
      const { data, error } = await adminClient.from('students').update({ 
        name, age: age ? parseInt(age, 10) : null, province, parent_phone, facebook_link, status, default_tuition_fee: default_tuition_fee ? parseInt(default_tuition_fee, 10) : null
      }).eq('student_id', student_id).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Cập nhật thành công', data });
    }

    if (action === 'delete') {
      if (!student_id) return NextResponse.json({ error: 'Thiếu mã học sinh' }, { status: 400 });
      // Soft Delete
      const { error } = await adminClient.from('students').update({ is_deleted: true, status: 'Đã nghỉ' }).eq('student_id', student_id);
      if (error) throw error;
      return NextResponse.json({ message: 'Đã chuyển học sinh vào danh sách đã xóa/cũ' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Student API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
