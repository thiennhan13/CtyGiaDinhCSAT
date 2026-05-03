import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

/**
 * API Quản lý Gia sư (Admin Only)
 * Sử dụng Service Role để bypass RLS và quản lý Auth Users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Kiểm tra quyền Admin (Security Layer 1)
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, name, phone, tutor_id } = body;
    const adminClient = createAdminClient();

    // HÀNH ĐỘNG: TẠO MỚI GIA SƯ
    if (action === 'create') {
      if (!name || !phone) {
        return NextResponse.json({ error: 'Thiếu tên hoặc số điện thoại' }, { status: 400 });
      }

      // Bước A: Tạo tài khoản Auth cho Gia sư (Mật khẩu mặc định là số điện thoại)
      // Lưu ý: Trong môi trường thật nên dùng password ngẫu nhiên và gửi mail
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: `${phone}@csattutor.com`, // Email giả lập từ SĐT
        password: phone,
        email_confirm: true,
        user_metadata: { name: name }
      });

      if (authError) throw authError;

      // Bước B: Lưu vào bảng tutors trong DB
      const { data: tutorData, error: dbError } = await adminClient
        .from('tutors')
        .insert([{ 
          auth_uid: authData.user.id, 
          name, 
          phone,
          status: 'active' 
        }])
        .select()
        .single();

      if (dbError) {
        // Rollback Auth user nếu lỗi DB
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw dbError;
      }

      return NextResponse.json({ message: 'Tạo gia sư thành công', data: tutorData });
    }

    // HÀNH ĐỘNG: XÓA GIA SƯ
    if (action === 'delete') {
      if (!tutor_id) return NextResponse.json({ error: 'Thiếu mã gia sư' }, { status: 400 });

      // Cập nhật trạng thái thành is_deleted thay vì xóa cứng
      const { error: updateError } = await adminClient.from('tutors').update({ is_deleted: true, status: 'inactive' }).eq('tutor_id', tutor_id);
      if (updateError) throw updateError;

      // Không xóa Auth User để giữ lịch sử nếu cần thiết, hoặc có thể ban user đó
      return NextResponse.json({ message: 'Xóa gia sư thành công (Soft delete)' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin Tutors API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
