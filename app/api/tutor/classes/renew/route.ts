import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { class_id, tutor_id, new_end_date } = await request.json();

    if (!class_id || !tutor_id || !new_end_date) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify ownership
    const { data: cls } = await supabaseAdmin
      .from('classes')
      .select('tutor_id')
      .eq('class_id', class_id)
      .single();

    if (!cls || cls.tutor_id !== tutor_id) {
       return NextResponse.json({ error: 'Unauthorized to renew this class' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('classes')
      .update({ end_date: new_end_date })
      .eq('class_id', class_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Renewed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
