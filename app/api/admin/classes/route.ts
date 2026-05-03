import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kiểm tra quyền Admin
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const { action, name, tutor_id, class_id } = await request.json();
    const adminClient = createAdminClient();

    if (action === 'create') {
      if (!name || !tutor_id) return NextResponse.json({ error: 'Thiếu tên lớp hoặc gia sư' }, { status: 400 });
      const { data, error } = await adminClient.from('classes').insert([{ name, tutor_id }]).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Tạo lớp thành công', data });
    }

    if (action === 'delete') {
      if (!class_id) return NextResponse.json({ error: 'Thiếu mã lớp' }, { status: 400 });
      const { error } = await adminClient.from('classes').delete().eq('class_id', class_id);
      if (error) throw error;
      return NextResponse.json({ message: 'Xóa lớp thành công' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Classes API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
