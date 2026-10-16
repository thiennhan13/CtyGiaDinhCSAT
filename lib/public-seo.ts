import type { Metadata } from 'next';
import { publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import { publicPosts } from '@/lib/public-posts';

/** The public site's canonical origin; independent of request hosts and private API configuration. */
export const publicSiteOrigin = 'https://portal.csatoj.vn';
export const publicSiteName = 'CSAT Tutor';
export const publicShareImage = '/images/site/csat-share.png';
export const publicLogo = '/icon/csat-logo-compact.svg';
export const publicPrivateRobots = { index: false, follow: false, nocache: true } as const;

export function publicUrl(path = '/') {
  const url = new URL(path, publicSiteOrigin);
  // Next's metadata serializer emits the origin without a trailing slash for the homepage.
  return url.pathname === '/' && !url.search && !url.hash ? publicSiteOrigin : url.href;
}

/** Editorial summaries for search/sharing, separate from the full on-page introductions. */
export const publicCourseDescriptions: Record<PublicCourseCode, string> = {
  A: 'Làm quen C++ qua biến, điều kiện, vòng lặp, mảng, hàm và xâu ký tự. Lớp A giúp học sinh xây nền tảng lập trình và tư duy giải bài, định hướng chuyên Tin.',
  B: 'Vận dụng số học, sắp xếp, tìm kiếm và xử lý xâu vào bài toán thi đấu. Lớp B giúp học sinh nhận ra quy luật, chọn cách giải và kiểm chứng độ phức tạp.',
  C: 'Đào sâu cấu trúc dữ liệu, đệ quy, tham lam và quy hoạch động qua 19 chủ đề. Lớp C phát triển lập luận thuật toán, hướng đến chuyên Tin và HSG cấp Tỉnh.',
  E: 'Lớp E Chủ lực dành cho học sinh đủ năng lực và đạt bài thi riêng, không bắt buộc học xong C. Đào sâu thuật toán và tư duy toán học, tăng cơ hội thi đấu.',
  K: 'Học riêng 1–1 hoặc theo nhóm với lớp K. Cùng CSAT xác định nền tảng, chọn trọng tâm từ chương trình đã duyệt và thống nhất nhịp học phù hợp với nhu cầu.',
};

export const publicPagePaths = [
  '/', '/hoc-lieu-mien-phi', '/thanh-tich', '/gia-su', '/bai-dang',
  ...publicPosts.map(post => `/bai-dang/${post.slug}`),
  '/dang-ky-hoc', '/lo-trinh', '/tu-hoc',
  ...publicCourses.map(course => `/lo-trinh/${course.code.toLowerCase()}`),
];

export function publicPageMetadata({ path, title, description, type = 'website' }: {
  path: string; title: string; description: string; type?: 'website' | 'article';
}): Metadata {
  const url = publicUrl(path);
  const image = { url: publicUrl(publicShareImage), width: 1200, height: 630, alt: 'Logo CSAT Tutor' };
  return {
    title, description, alternates: { canonical: url }, robots: { index: true, follow: true },
    openGraph: { title, description, url, siteName: publicSiteName, locale: 'vi_VN', type, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: image.url, alt: image.alt }] },
  };
}
