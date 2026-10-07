import type { PublicCourseCode } from './public-courses';

/** Learning aims derived from the approved curriculum; no assessed mastery or automatic progression. */
export const publicCourseOutcomes: Record<PublicCourseCode, {
  thinking: string; problems: string; methods: string;
  next: string; href: string; linkLabel: string;
}> = {
  A: {
    thinking: 'Phân tích đầu vào, đầu ra; chia yêu cầu thành những bước xử lý và theo dõi sự thay đổi của dữ liệu trong chương trình.',
    problems: 'Tập viết và kiểm tra lời giải cho các bài điều kiện, lặp, duyệt và biến đổi dãy, thao tác trên bảng và xử lý xâu đơn giản.',
    methods: 'Hiểu vai trò của kiểu dữ liệu, toán tử, rẽ nhánh, vòng lặp, mảng, hàm và string; kết hợp các cấu trúc C++ để cài đặt một ý tưởng rõ ràng.',
    next: 'Nền tảng C++ là điểm nối sang lớp B: từ viết được chương trình đến nhận diện phương pháp giải bài lập trình thi đấu.',
    href: '/lo-trinh/b', linkLabel: 'Tìm hiểu lớp B',
  },
  B: {
    thinking: 'Nhận diện tính chất của bài toán, so sánh các phương án và cân nhắc giới hạn dữ liệu trước khi chọn cách giải.',
    problems: 'Luyện các dạng duyệt và đếm phương án, thống kê tần suất, số học, tổ chức dữ liệu, sắp xếp, tìm kiếm và nhận biết xâu đối xứng.',
    methods: 'Vận dụng vét cạn, mảng đếm, kiểm tra và sàng nguyên tố, Euclid, Legendre, modulo, lũy thừa nhanh, các cấu trúc dữ liệu cơ bản và chặt nhị phân theo điều kiện của bài.',
    next: 'Tạo bộ công cụ để luyện bài HSG cấp Phường, tuyển sinh chuyên Tin theo định hướng lớp; tiếp nối ở C bằng phân tích sâu hơn và kết hợp kỹ thuật.',
    href: '/lo-trinh/c', linkLabel: 'Tìm hiểu lớp C',
  },
  C: {
    thinking: 'Mô hình hóa bài toán, lý giải tính đúng đắn và độ phức tạp; kết nối nhiều kỹ thuật, kiểm tra trường hợp biên và truy vết lời giải.',
    problems: 'Luyện bài xử lý dãy và xâu, tìm kiếm phương án, tối ưu lựa chọn và các dạng quy hoạch động như knapsack, dãy con, xâu con và khoảng cách chỉnh sửa.',
    methods: 'Phân tích và vận dụng cộng dồn, mảng hiệu, hai con trỏ, cửa sổ trượt, cấu trúc dữ liệu, đệ quy, chia để trị, quay lui, tham lam, chặt trên đáp án, hashing và quy hoạch động trong phạm vi 19 chủ đề.',
    next: 'Củng cố nền tảng chuyên Tin và HSG cấp Tỉnh. Học sinh có thể trao đổi hướng học sâu ở lớp E và tìm hiểu thi tuyển riêng từ C.',
    href: '/lo-trinh/e', linkLabel: 'Tìm hiểu lớp E và thi tuyển',
  },
  E: {
    thinking: 'Đào sâu cấu trúc bài toán, liên hệ thuật toán với tư duy toán học; xây dựng lập luận và tìm hướng xử lý độc lập trong bối cảnh thi đấu.',
    problems: 'Phân tích đề thi thật và đề luyện thi được tuyển chọn, đối chiếu lời giải sau contest để nhận ra điểm mạnh và phần cần tiếp tục rèn luyện.',
    methods: 'Phát triển chiều sâu, khả năng kết hợp và kiểm chứng các phương pháp từ nền tảng lớp C theo nội dung được thống nhất cùng đội ngũ.',
    next: 'Hướng đến học tập chuyên Tin và thứ hạng cao trong lập trình thi đấu, cùng một tập thể chung định hướng; chọn mục tiêu và hướng đào sâu tiếp theo qua quá trình học, luyện đề và cọ xát.',
    href: '/dang-ky-hoc?course=E#thong-tin', linkLabel: 'Trao đổi định hướng lớp E',
  },
  K: {
    thinking: 'Làm rõ phần kiến thức đang vướng, giải thích cách tiếp cận và xây thói quen kiểm tra lời giải theo trọng tâm học đã thống nhất.',
    problems: 'Luyện nhóm dạng bài phù hợp nhu cầu cá nhân hoặc nhóm riêng, từ củng cố nền tảng đến phân tích sâu một phần nội dung.',
    methods: 'Hiểu và vận dụng các thuật toán thuộc phạm vi đã chọn từ chương trình được duyệt; mức độ đi sâu gắn với nền tảng và mục tiêu của người học.',
    next: 'Từ kết quả luyện tập, cùng gia sư xác định phần cần củng cố hoặc học tiếp; kết nối với lộ trình A, B, C hoặc một trọng tâm riêng phù hợp.',
    href: '/lo-trinh', linkLabel: 'Đối chiếu các hướng học',
  },
};
