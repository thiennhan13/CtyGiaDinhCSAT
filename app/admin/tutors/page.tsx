import { Suspense } from 'react';
import { getTutors } from '@/features/tutors/queries';
import { TutorsClient } from './TutorsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function TutorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));

  // Fetch data on the server
  const { data, count } = await getTutors({
    page: currentPage,
    limit: 20,
  });

  const totalPages = Math.ceil(count / 20) || 1;

  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center">Đang tải dữ liệu...</div>}>
      <TutorsClient
        initialTutors={data ?? []}
        totalTutors={count}
        totalPages={totalPages}
        currentPage={currentPage}
      />
    </Suspense>
  );
}
