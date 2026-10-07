/** Public enrollment content. Source: approved curriculum and course posters. */
export type PublicCourseCode = 'A' | 'B' | 'C' | 'E' | 'K';
/** Overview hashtags approved on 07/10; E/K removed by the owner's next revision. */
export const publicCourseHashtags: Partial<Record<PublicCourseCode, readonly [string, string, string]>> = {
  A: ['#NhậpMônC++', '#Lớp5Đến7', '#NềnTảngChuyênTin'],
  B: ['#ThiĐấuCơBản', '#SốHọcVàTìmKiếm', '#HSGCấpPhường'],
  C: ['#ThuậtToánNângCao', '#HSGCấpTỉnh', '#ChuyênTin'],
};
/** Overview illustrations derived from A/B/C/E.jpg and Custom.jpg (K). Posters remain separate. */
export const publicCourseIllustrations: Record<PublicCourseCode, { image: string; width: number; height: number }> = {
  A: { image: 'roadmap-a', width: 1600, height: 900 },
  B: { image: 'roadmap-b', width: 1600, height: 900 },
  C: { image: 'roadmap-c', width: 1600, height: 900 },
  E: { image: 'roadmap-e-v3', width: 3200, height: 2400 },
  K: { image: 'roadmap-k', width: 1600, height: 900 },
};
export type PublicCourse = {
  code: PublicCourseCode;
  name: string;
  label: string;
  audience: string;
  duration: string;
  size: string;
  scope: string;
  price: string;
  image: string;
  tags: string[];
  steps: { title: string; description: string }[];
};

export const publicCourses: PublicCourse[] = [
  {
    code: 'A', name: 'Nhập môn lập trình', label: 'Làm quen C++',
    audience: 'Học sinh lớp 5, 6, 7 muốn làm quen với lập trình, định hướng chuyên Tin / lập trình thi đấu.',
    duration: '90 phút / buổi', size: '5–8 học sinh', scope: '9 chủ đề · 3 chặng', price: '99.000đ', image: 'course-a',
    tags: ['C++ · I/O', 'Kiểu dữ liệu', 'Rẽ nhánh', 'Vòng lặp', 'Mảng 1 chiều', 'Mảng 2 chiều', 'Hàm', 'Xâu ký tự'],
    steps: [
      { title: 'Biến ý tưởng thành câu lệnh', description: 'Đọc dữ liệu, viết điều kiện và tổ chức các thao tác lặp.' },
      { title: 'Tổ chức dữ liệu để xử lý', description: 'Duyệt, đếm và biến đổi dữ liệu trong dãy, bảng.' },
      { title: 'Ghép thành chương trình', description: 'Chia việc bằng hàm, xử lý xâu và thử lại kết quả.' },
    ],
  },
  {
    code: 'B', name: 'Lập trình thi đấu cơ bản', label: 'Tìm quy luật · Chọn cách giải',
    audience: 'Học sinh lớp 7, 8, 9 có định hướng thi HSG cấp Phường, hoặc chuyên Tin các tỉnh không quá cạnh tranh.',
    duration: '90 phút / buổi', size: '5–8 học sinh', scope: '15 chủ đề · 4 chặng', price: '99.000đ', image: 'course-b',
    tags: ['Vét cạn', 'Mảng thống kê', 'Số nguyên tố · Sàng', 'Euclid · ƯCLN', 'Legendre', 'Modulo · Lũy thừa nhanh', 'Vector · Pair · Struct', 'Map', 'Sort · Comparator', 'Chặt nhị phân', 'Palindrome'],
    steps: [
      { title: 'Tìm lời giải từ các phương án', description: 'Vét cạn và thống kê giúp nhìn rõ điều kiện của bài toán.' },
      { title: 'Khai thác quy luật của dữ liệu', description: 'Vận dụng số học, cấu trúc dữ liệu và sắp xếp.' },
      { title: 'Mở rộng công cụ giải bài', description: 'Tìm kiếm nhị phân, xử lý xâu; thử và so sánh lời giải.' },
    ],
  },
  {
    code: 'C', name: 'Lập trình thi đấu nâng cao', label: 'Phân tích · Kết hợp kỹ thuật',
    audience: 'Học sinh lớp 7, 8, 9 có định hướng thi HSG cấp Tỉnh, chuyên Tin các tỉnh mạnh, cạnh tranh.',
    duration: '90 phút / buổi', size: '5–8 học sinh', scope: '19 chủ đề · 6 chặng', price: '109.000đ', image: 'course-c',
    tags: ['Cộng dồn · Mảng hiệu', 'Hai con trỏ', 'Cửa sổ trượt', 'Set · Map', 'Queue · Deque · Stack', 'Đệ quy · Merge sort', 'Quay lui · Cắt nhánh', 'Tham lam', 'Chặt trên đáp án', 'Hashing', 'Quy hoạch động', 'Knapsack', 'LIS · LCS'],
    steps: [
      { title: 'Phân tích dữ liệu và giới hạn', description: 'Chọn kỹ thuật mảng và cấu trúc dữ liệu phù hợp.' },
      { title: 'Xây dựng và kết hợp cách giải', description: 'Phân rã, sinh phương án, tham lam và tìm kiếm đáp án.' },
      { title: 'Lý giải tính đúng và hiệu quả', description: 'Xây trạng thái quy hoạch động, xem độ phức tạp lời giải.' },
    ],
  },
  {
    code: 'E', name: 'Chủ lực', label: 'Thi tuyển riêng từ lớp C',
    audience: 'Học sinh được chọn lọc từ lớp C, có định hướng chuyên Tin và quyết tâm theo đuổi lập trình thi đấu ở mức chuyên sâu.',
    duration: '120 phút / buổi', size: '3–4 học sinh', scope: 'Đầu vào từ lớp C · Lịch theo thành viên', price: '', image: 'course-ek',
    tags: ['Chọn lọc từ C', 'Thi tuyển riêng', 'Chuyên Tin', 'Thuật toán', 'Tư duy toán học', 'Contest'],
    steps: [
      { title: 'Nhìn lại nền tảng lớp C', description: 'Chia sẻ quá trình luyện bài và phần muốn học sâu hơn.' },
      { title: 'Tham gia thi tuyển riêng', description: 'Trao đổi cùng đội ngũ về mục tiêu và thi tuyển đầu vào.' },
      { title: 'Học cùng nhóm Chủ lực', description: 'Thống nhất nội dung học, lịch và học phí cùng CSAT.' },
    ],
  },
  {
    code: 'K', name: 'Kèm riêng', label: '1–1 hoặc nhóm đăng ký riêng',
    audience: 'Học viên đăng ký học 1–1 hoặc theo nhóm đăng ký riêng.',
    duration: 'Thời lượng theo nhu cầu', size: '1–1 / nhóm riêng', scope: 'Nội dung và lịch theo yêu cầu học viên', price: '', image: 'course-ek',
    tags: ['1–1', 'Nhóm riêng', 'Nội dung tùy chọn', 'Chương trình đã duyệt', 'Lịch theo nhu cầu'],
    steps: [
      { title: 'Xác định điều cần học', description: 'Chọn phần cần củng cố hoặc dạng bài đang vướng.' },
      { title: 'Cùng chọn nội dung', description: 'Thống nhất phạm vi từ các chương trình đã được duyệt.' },
      { title: 'Sắp xếp nhịp học riêng', description: 'Trao đổi lịch, thời lượng và học phí trước khi bắt đầu.' },
    ],
  },
];

export function publicCourseCode(value: unknown): PublicCourseCode | undefined {
  return typeof value === 'string' && publicCourses.some(course => course.code === value) ? value as PublicCourseCode : undefined;
}

export function enrollmentHref(code?: PublicCourseCode) {
  return `/dang-ky-hoc${code ? `?course=${code}#thong-tin` : ''}`;
}
