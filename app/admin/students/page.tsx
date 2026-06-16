import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { StudentsClient } from './StudentsClient';
import StudentsLoading from './loading';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; fee?: string }>;
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const searchTerm = params.search || '';
  const statusFilter = params.status || 'Đang học';
  const feeFilter = params.fee || 'Tất cả';

  const supabase = await createClient();

  // Xây dựng query tùy theo bộ lọc
  let query;
  if (feeFilter === 'Chưa nộp học phí') {
    query = supabase
      .from('students')
      .select('*, payments!inner(status)', { count: 'exact' })
      .neq('is_deleted', true)
      .eq('payments.status', 'unpaid');
  } else {
    query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .neq('is_deleted', true);
  }

  if (statusFilter !== 'Tất cả') {
    query = query.eq('status', statusFilter);
  }

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%,province.ilike.%${searchTerm}%`);
  }

  const { data, count, error } = await query
    .order('name', { ascending: true })
    .order('student_id', { ascending: true })
    .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching students:', error);
  }

  const totalStudents = count ?? 0;
  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE) || 1;

  return (
    // Bắt buộc wrap Suspense vì StudentsClient dùng useSearchParams()
    <Suspense fallback={<StudentsLoading />}>
      <StudentsClient
        initialStudents={(data as any) ?? []}
        totalStudents={totalStudents}
        totalPages={totalPages}
        currentPage={currentPage}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        feeFilter={feeFilter}
      />
    </Suspense>
  );
}
