/** Editorial content only. Replace this adapter when the publishing model is approved. */
export type PublicPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  paragraphs: readonly string[];
  link: { href: string; label: string };
};

export const publicPosts: readonly PublicPost[] = [
  {
    slug: 'tu-dong-code-dau-tien', category: 'Lộ trình học tập',
    title: 'Từ dòng code đầu tiên đến một lời giải của riêng mình',
    excerpt: 'Làm quen C++, đọc hiểu đề và từng bước kết nối kiến thức với bài toán. Khám phá điểm bắt đầu cùng CSAT.',
    image: '/images/site/basic-class.webp', imageAlt: 'Học lập trình bên màn hình máy tính',
    paragraphs: [
      'Một chương trình bắt đầu từ những câu lệnh, nhưng một lời giải bắt đầu từ việc hiểu bài toán. Học sinh cần biết đề yêu cầu gì, dữ liệu được tổ chức ra sao và cách kiểm tra kết quả của mình.',
      'Lớp A giúp người mới học làm quen với C++ qua chín chủ đề đã được xây dựng. Lớp B tiếp nối bằng mười lăm chủ đề thi đấu cơ bản, đưa kiến thức nền vào quá trình phân tích và giải bài.',
      'Tại CSAT, chương trình Cơ bản mặc định gồm A+B. Điểm bắt đầu và mục tiêu ôn luyện được trao đổi theo nền tảng hiện tại của người học; lựa chọn trên website là một gợi ý để tìm hiểu, không phải kết quả xếp trình độ.',
    ],
    link: { href: '/lo-trinh', label: 'Khám phá lộ trình học tập' },
  },
  {
    slug: 'luyen-bai-cung-csatoj', category: 'Cách học tại CSAT',
    title: 'Đọc đề, thử ý tưởng, kiểm chứng trên CSATOJ',
    excerpt: 'Viết chương trình là một bước trong quá trình giải bài. Kết quả chấm giúp học sinh xem lại cách làm và tiếp tục luyện tập.',
    image: '/images/site/writing-poster.webp', imageAlt: 'Ghi chép ý tưởng bên màn hình lập trình',
    paragraphs: [
      'Sau khi tìm hiểu lý thuyết, học sinh cần một bài toán để thử điều vừa học. Kho đề thi và bài tập CSATOJ là không gian để đọc yêu cầu, viết lời giải và nộp chương trình cho hệ thống chấm.',
      'Nếu kết quả chưa đúng, việc học tiếp tục bằng cách đối chiếu ví dụ, xem lại ý tưởng và tìm những trường hợp chương trình chưa xử lý được. Gia sư cùng học sinh trao đổi chỗ còn vướng, chữa bài và nhận xét cách làm.',
      'Một buổi học CSAT đi từ link Google Meet, lý thuyết và contest bài tập đến điểm danh, giảng bài, luyện tập trên CSATOJ và chữa bài. Record cùng bài tập về nhà giúp học sinh tiếp tục xem lại sau buổi học.',
    ],
    link: { href: '/#buoi-hoc', label: 'Tìm hiểu một buổi học CSAT' },
  },
  {
    slug: 'gia-su-chuyen-phan', category: 'Đội ngũ CSAT',
    title: 'Gia sư chuyên Phan, cùng bạn học Tin',
    excerpt: 'CSAT được xây dựng bởi các gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu, cùng học sinh tìm hiểu lập trình và thuật toán.',
    image: '/images/site/tutor-dang-quang.webp', imageAlt: 'Poster giới thiệu gia sư Trần Đăng Quang',
    paragraphs: [
      'CSAT được xây dựng bởi các gia sư đến từ những khóa chuyên Tin của Trường THPT Chuyên Phan Bội Châu. Kinh nghiệm học và luyện bài là điểm khởi đầu để đội ngũ cùng học sinh trao đổi cách phân tích, thử ý tưởng và tìm lời giải.',
      'Trong buổi học, gia sư hướng dẫn lý thuyết, cùng học sinh làm bài và lý giải những điểm chưa rõ. Việc chữa bài và nhận xét giúp người học có thêm cơ sở để xem lại cách làm của mình.',
      'Phụ huynh đồng hành qua Portal: theo dõi nhận xét của gia sư, nội dung học, lộ trình và học phí của con. Thông tin được hiển thị theo dữ liệu và nội dung đã công bố trong hệ thống.',
    ],
    link: { href: '/gia-su', label: 'Gặp đội ngũ gia sư CSAT' },
  },
];

export function getPublicPost(slug: string) { return publicPosts.find(post => post.slug === slug); }
