import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createTutorSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, "Tên gia sư phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không hợp lệ"),
});

const deleteTutorSchema = z.object({
  action: z.literal('delete'),
  tutor_id: z.string().uuid("Tutor ID không hợp lệ"),
});

const tutorActionSchema = z.discriminatedUnion('action', [
  createTutorSchema,
  deleteTutorSchema
]);

/**
 * API Quản lý Gia sư (Admin Only)
 * Sử dụng Service Role để bypass RLS và quản lý Auth Users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Kiểm tra quyền Admin (Security Layer 1)
    if (!user || (user.app_metadata?.role !== 'admin' && user.user_metadata?.role !== 'admin')) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = tutorActionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // HÀNH ĐỘNG: TẠO MỚI GIA SƯ
    if (parsed.data.action === 'create') {
      const { name, email, phone } = parsed.data;

      // Bước A: Tạo tài khoản Auth cho Gia sư (Mật khẩu là SĐT)
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email, 
        password: phone,
        email_confirm: true,
        user_metadata: { name: name, phone: phone },
        app_metadata: { role: 'staff' },
      });

      if (authError) throw authError;

      // Bước B: Lưu vào bảng tutors trong DB
      const { data: tutorData, error: dbError } = await adminClient
        .from('tutors')
        .insert([{ 
          auth_uid: authData.user.id, 
          name, 
          email: email,
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
    if (parsed.data.action === 'delete') {
      // Soft delete: set is_deleted = true, status = 'inactive'
      const { error: deleteError } = await adminClient.from('tutors').update({ is_deleted: true, status: 'inactive' }).eq('tutor_id', parsed.data.tutor_id);
      if (deleteError) throw deleteError;

      // Tùy chọn: Bạn có thể ban auth, nhưng không xóa cứng. Cẩn thận cascading.
      return NextResponse.json({ message: 'Đã vô hiệu hóa gia sư (soft delete)' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin Tutors API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
