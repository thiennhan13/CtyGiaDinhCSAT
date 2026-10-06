import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { EnrollmentExperience } from '@/components/marketing/EnrollmentExperience';
import { publicCourseCode } from '@/lib/public-courses';

export const metadata: Metadata = {
  title: 'Đăng ký học C++ và thuật toán — CSAT',
  description: 'Chọn lớp A, B, C, E hoặc K, xem đối tượng, nội dung và học phí; trao đổi cùng gia sư CSAT để tìm hướng học phù hợp.',
  alternates: { canonical: 'https://portal.csatoj.vn/dang-ky-hoc' },
};

export default async function EnrollmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  return <PublicShell><EnrollmentExperience selectedCourse={publicCourseCode(search.course)} /></PublicShell>;
}
