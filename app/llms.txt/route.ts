import { publicCourses } from '@/lib/public-courses';
import { publicCourseDescriptions, publicUrl } from '@/lib/public-seo';
import { publicPosts } from '@/lib/public-posts';

export const dynamic = 'force-static';

export function GET() {
  const content = [
    '# CSAT Tutor', '',
    '> CSAT hướng dẫn học C++, lập trình thi đấu và tư duy thuật toán, cùng đội ngũ gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu.', '',
    'Website cung cấp thông tin tuyển sinh và các bài viết công khai. Thông tin tại trang lớp là nguồn hiện hành; việc chọn lớp được trao đổi theo nền tảng của người học. Nội dung dưới đây chỉ dẫn đến thông tin công khai.', '',
    '## Tìm hiểu CSAT', '',
    `- [Giới thiệu](${publicUrl()}): Cách học và các kênh đồng hành tại CSAT.`,
    `- [Lộ trình học tập](${publicUrl('/lo-trinh')}): Chọn điểm bắt đầu, tìm hiểu A/B/C/E/K.`,
    `- [Đội ngũ](${publicUrl('/gia-su')}): Giới thiệu gia sư CSAT.`,
    `- [Đăng ký học](${publicUrl('/dang-ky-hoc')}): Đối tượng, thông tin lớp và đăng ký tư vấn.`,
    `- [Học liệu miễn phí](${publicUrl('/hoc-lieu-mien-phi')}): Trao đổi để tìm tài liệu phù hợp.`,
    `- [Thành tích](${publicUrl('/thanh-tich')}): Các dấu mốc học tập đã công bố.`, '',
    '## Các lớp học', '',
    ...publicCourses.map(course => `- [Lớp ${course.code} — ${course.name}](${publicUrl(`/lo-trinh/${course.code.toLowerCase()}`)}): ${publicCourseDescriptions[course.code]}`), '',
    '## Góc học Tin', '',
    ...publicPosts.map(post => `- [${post.title}](${publicUrl(`/bai-dang/${post.slug}`)}): ${post.excerpt}`), '',
  ].join('\n');
  return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
