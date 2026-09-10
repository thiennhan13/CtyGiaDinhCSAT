import { notFound } from 'next/navigation';
import { z } from 'zod';
import { monthSchema } from '@/lib/learning';
import { TutorReviewWorkspace } from '@/components/reviews/TutorReviewWorkspace';

export default async function StudentReviewPage({ params, searchParams }: {
  searchParams: Promise<{ month?: string }>;
  params: Promise<{ class_id: string; student_id: string }>;
}) {
  const { class_id, student_id } = await params;
  if (!z.string().uuid().safeParse(class_id).success || !z.string().uuid().safeParse(student_id).success) notFound();
  const query = await searchParams;
  const month = monthSchema.safeParse(query.month);
  return <TutorReviewWorkspace initialMonth={month.success ? month.data : undefined} key={`${class_id}:${student_id}`} classId={class_id} studentId={student_id} />;
}
