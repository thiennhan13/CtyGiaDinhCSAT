import { notFound } from 'next/navigation';
import { z } from 'zod';
import { TutorReviewWorkspace } from '@/components/reviews/TutorReviewWorkspace';

export default async function StudentReviewPage({ params }: {
  params: Promise<{ class_id: string; student_id: string }>;
}) {
  const { class_id, student_id } = await params;
  if (!z.string().uuid().safeParse(class_id).success || !z.string().uuid().safeParse(student_id).success) notFound();
  return <TutorReviewWorkspace key={`${class_id}:${student_id}`} classId={class_id} studentId={student_id} />;
}
