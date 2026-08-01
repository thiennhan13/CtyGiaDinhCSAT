import { createClient } from '@/lib/supabase/server';
import type { Tutor } from '@/types/database';

export async function getTutors(params: {
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const page = params.page || 1;
  const limit = params.limit || 20;

  const { data, count, error } = await supabase
    .from('tutors')
    .select('*', { count: 'exact' })
    .neq('is_deleted', true)
    .order('created_at', { ascending: false })
    .order('tutor_id', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('Lỗi khi lấy danh sách gia sư:', error);
    return { data: [], count: 0 };
  }

  return { data, count: count || 0 };
}
