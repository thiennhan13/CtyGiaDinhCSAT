import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service';
import { z } from 'zod';

const renewSchema = z.object({
  class_id: z.string().uuid("Class ID không hợp lệ"),
  new_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date must be YYYY-MM-DD"),
  // Chấp nhận tutor_id tùy chọn để tương thích ngược với client cũ nhưng KHÔNG dùng nó để xác thực
  tutor_id: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Vui lòng đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = renewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { class_id, new_end_date } = parsed.data;
    const adminSupabase = createAdminClient();

    // 1. Kiểm tra thông tin lớp học trong DB
    const { data: cls, error: clsError } = await adminSupabase
      .from('classes')
      .select('class_id, tutor_id, start_date, end_date')
      .eq('class_id', class_id)
      .single();

    if (clsError || !cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học.' }, { status: 404 });
    }

    // 2. Kiểm tra quyền: Admin HOẶC Gia sư phụ trách lớp đó
    const role = user.app_metadata?.role || user.user_metadata?.role || 'tutor';
    const isAdmin = role === 'admin';

    if (!isAdmin) {
      // Tìm gia sư tương ứng với auth_uid của user hiện tại
      const { data: tutor, error: tutorError } = await adminSupabase
        .from('tutors')
        .select('tutor_id, status, is_deleted')
        .eq('auth_uid', user.id)
        .single();

      if (tutorError || !tutor || tutor.status !== 'active' || tutor.is_deleted) {
        return NextResponse.json({ error: 'Tài khoản gia sư không hợp lệ hoặc đã bị vô hiệu hóa.' }, { status: 403 });
      }

      if (cls.tutor_id !== tutor.tutor_id) {
        return NextResponse.json({ error: 'Bạn không có quyền gia hạn lớp học này.' }, { status: 403 });
      }
    }

    // 3. Kiểm tra logic ngày: Ngày kết thúc mới không được trước ngày bắt đầu
    if (cls.start_date && new Date(new_end_date) < new Date(cls.start_date)) {
      return NextResponse.json({ error: 'Ngày kết thúc mới không được trước ngày bắt đầu lớp.' }, { status: 400 });
    }

    // 4. Thực hiện cập nhật an toàn
    const { error: updateError } = await adminSupabase
      .from('classes')
      .update({ end_date: new_end_date })
      .eq('class_id', class_id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      message: 'Gia hạn lớp học thành công',
      class_id, 
      new_end_date 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
