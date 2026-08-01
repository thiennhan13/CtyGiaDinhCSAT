import { Suspense } from 'react';
import { getClasses } from '@/features/classes/queries';
import { ClassesClient } from './ClassesClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; classType?: string }>;
}

export default async function ClassesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const searchTerm = params.search || '';
  const statusFilter = params.status || 'Tất cả';
  const classTypeFilter = params.classType || 'Tất cả';

  // Fetch data on the server
  const { data, count } = await getClasses({
    page: currentPage,
    limit: 20,
    search: searchTerm,
    status: statusFilter,
    classType: classTypeFilter,
  });

  const totalPages = Math.ceil(count / 20) || 1;

  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center">Đang tải dữ liệu...</div>}>
      <ClassesClient
        initialClasses={data ?? []}
        totalClasses={count}
        totalPages={totalPages}
        currentPage={currentPage}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        classTypeFilter={classTypeFilter}
      />
    </Suspense>
  );
}
