import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 0. Verify requester is admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Create auth user
    // Generate a dummy email if needed, or use phone for auth. 
    // Supabase allows phone auth, but let's just make an email out of phone for simplicity if phone auth is disabled, or just use phone.
    // Assuming email is used, maybe phone@csattutor.edu.vn
    const dummyEmail = `${phone}@csattutor.edu.vn`;

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: dummyEmail,
      password: phone, // Default password is phone number
      email_confirm: true,
      user_metadata: { name, phone },
      app_metadata: { role: 'staff' },
    });

    if (authError) {
      throw authError;
    }

    const authUid = authData.user.id;

    // 2. Create tutor record
    const { data: tutorData, error: tutorError } = await adminClient
      .from('tutors')
      .insert([
        {
          auth_uid: authUid,
          name: name,
          phone: phone,
        }
      ])
      .select()
      .single();

    if (tutorError) {
      // rollback auth user if tutor creation fails
      await adminClient.auth.admin.deleteUser(authUid);
      throw tutorError;
    }

    return NextResponse.json({ message: 'Tạo gia sư thành công', tutor: tutorData });
  } catch (error: any) {
    console.error('Error creating tutor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
