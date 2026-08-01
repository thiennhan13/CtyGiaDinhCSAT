import { createClient } from '@/lib/supabase/server';
import type { Class } from '@/types/database';

export async function getClasses(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  classType?: string;
}) {
  const supabase = await createClient();
  const page = params.page || 1;
  const limit = params.limit || 20;
  
  let query = supabase.from('classes').select('*, tutors(name)', { count: 'exact' });

  if (params.status && params.status !== 'Tất cả') {
    query = query.eq('status', params.status);
  }
  
  if (params.classType && params.classType !== 'Tất cả') {
    query = query.eq('class_type', params.classType);
  }
  
  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .order('class_id', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('Lỗi khi lấy danh sách lớp:', error);
    return { data: [], count: 0 };
  }

  return { data, count: count || 0 };
}
