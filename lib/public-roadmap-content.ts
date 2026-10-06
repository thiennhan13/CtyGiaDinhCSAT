import type { PublicCourseCode } from '@/lib/public-courses';

/** Public editorial copy; this does not replace the approved curriculum or define attainment. */
export type PublicRoadmapCode = PublicCourseCode;
export type RoadmapPathway = { label: string; title: string; description: string };
export type PublicRoadmapContent = {
  tagline: string;
  overview: string;
  headline: readonly [string, string];
  introduction: string;
  foundation: string;
  pathway: readonly RoadmapPathway[];
  development?: readonly RoadmapPathway[];
  focusTags: readonly string[];
};

export const publicRoadmapContent: Record<PublicRoadmapCode, PublicRoadmapContent> = {
  A: {
    tagline: 'Từ hiểu bài toán đến diễn đạt bằng C++.',
    overview: 'Lớp A xây dựng nền tảng lập trình qua 9 chủ đề: từ nhập, xuất dữ liệu và điều khiển chương trình đến mảng, hàm và xâu. Mỗi nhóm kiến thức mở thêm một cách biểu diễn bài toán, để việc viết mã gắn với một ý tưởng có thể giải thích và kiểm tra.',
    headline: ['Xây nền tảng lập trình.', 'Hình thành tư duy thuật toán.'],
    introduction: 'Một chương trình bắt đầu từ việc hiểu dữ liệu đã cho và kết quả cần tìm. Lớp A dẫn người học qua những cấu trúc cốt lõi của C++: kiểu dữ liệu, toán tử, rẽ nhánh và vòng lặp; tiếp đó là mảng, hàm và xâu ký tự. Ba chặng kết nối việc đọc đề, tổ chức cách xử lý và kiểm tra chương trình. Đây là điểm khởi đầu cho học sinh muốn tìm hiểu chuyên Tin và lập trình thi đấu, với trọng tâm là hiểu ý nghĩa của từng thao tác trước khi kết hợp chúng thành lời giải.',
    foundation: 'Có thể bắt đầu từ môi trường lập trình và thao tác nhập, xuất dữ liệu. Những nội dung đã học, bài đã thử và mục tiêu của học sinh là cơ sở để trao đổi điểm bắt đầu phù hợp.',
    pathway: [
      { label: 'ĐIỂM BẮT ĐẦU', title: 'Hiểu dữ liệu và yêu cầu', description: 'Xác định đầu vào, đầu ra và cách mô tả một bài toán bằng các bước xử lý cụ thể.' },
      { label: 'QUÁ TRÌNH HỌC', title: 'Từ câu lệnh đến cấu trúc', description: 'Kết nối điều kiện, vòng lặp, mảng, hàm và xâu theo trình tự 3 chặng kiến thức.' },
      { label: 'HƯỚNG VẬN DỤNG', title: 'Viết và kiểm tra lời giải', description: 'Diễn đạt ý tưởng bằng C++, thử các trường hợp và chuẩn bị nền tảng để tìm hiểu lớp B.' },
    ],
    focusTags: ['C++', 'Nhập / xuất', 'Kiểu dữ liệu', 'Rẽ nhánh', 'Vòng lặp', 'Mảng', 'Hàm', 'Xâu ký tự'],
  },
  B: {
    tagline: 'Từ một cách giải đến lựa chọn có cơ sở.',
    overview: 'Lớp B nối nền tảng C++ với những phương pháp giải bài thi đấu: vét cạn, thống kê, số học, tổ chức dữ liệu, sắp xếp và tìm kiếm. Qua 15 chủ đề trong 4 chặng, người học có cơ sở để nhận diện cấu trúc bài toán và so sánh các cách xử lý.',
    headline: ['Nhận diện cấu trúc bài toán.', 'Lựa chọn phương pháp giải.'],
    introduction: 'Khi đã diễn đạt được một ý tưởng bằng C++, câu hỏi tiếp theo là: có thể xử lý bài toán bằng cách nào khác? Lớp B bắt đầu từ vét cạn và thống kê, khai thác tính chất số học, rồi chuyển sang cấu trúc dữ liệu, sắp xếp, chặt nhị phân và xử lý xâu. Mười lăm chủ đề tạo nền tảng để phân biệt một cách giải đúng với một cách giải còn phù hợp khi dữ liệu tăng. Định hướng học gắn với HSG cấp Phường và tuyển sinh chuyên Tin theo phạm vi nêu trong đối tượng của lớp.',
    foundation: 'Cùng nhìn lại điều kiện, vòng lặp, mảng, hàm và xâu qua những bài học sinh đã làm. Việc chọn phần cần củng cố hoặc học tiếp dựa trên nền tảng thực tế, không chỉ dựa vào cấp học.',
    pathway: [
      { label: 'ĐIỂM BẮT ĐẦU', title: 'Kết nối nền tảng C++', description: 'Dùng kiến thức mảng, hàm và xâu để mô tả phương án giải và kiểm tra trên dữ liệu cụ thể.' },
      { label: 'QUÁ TRÌNH HỌC', title: 'Xây bộ công cụ cơ bản', description: 'Đi từ duyệt phương án, số học đến tổ chức dữ liệu, sắp xếp, tìm kiếm và xử lý xâu.' },
      { label: 'HƯỚNG VẬN DỤNG', title: 'So sánh và chọn cách giải', description: 'Liên hệ phương pháp với tính chất bài toán và giới hạn dữ liệu; làm cơ sở để tìm hiểu lớp C.' },
    ],
    focusTags: ['Vét cạn', 'Thống kê', 'Số học', 'Sàng nguyên tố', 'Euclid', 'Modulo', 'Vector / Map', 'Sắp xếp', 'Chặt nhị phân', 'Palindrome'],
  },
  C: {
    tagline: 'Mở rộng phương pháp. Đào sâu lập luận.',
    overview: 'Lớp C bao quát toàn bộ 19 chủ đề C+D, tổ chức thành 6 chặng. Kỹ thuật mảng, cấu trúc dữ liệu và các chiến lược tìm lời giải kết nối với quy hoạch động, đặt trọng tâm vào mô hình bài toán, tính đúng đắn và hiệu quả của thuật toán.',
    headline: ['Phân tích bài toán sâu hơn.', 'Xây lời giải có lập luận.'],
    introduction: 'Một lời giải thuật toán cần trả lời được ba câu hỏi: vì sao đúng, sử dụng dữ liệu như thế nào và tốn bao nhiêu thao tác. Lớp C phát triển cách phân tích đó qua kỹ thuật mảng, cấu trúc dữ liệu, đệ quy, chia để trị, quay lui, tham lam, chặt nhị phân trên đáp án và băm xâu. Quy hoạch động tiếp nối bằng việc xác định trạng thái, liên hệ các bài toán con và truy vết lời giải. Toàn bộ phần C+D gồm 19 chủ đề, hướng đến nền tảng chuyên Tin và HSG cấp Tỉnh theo đối tượng đã công bố.',
    foundation: 'Những bài đã tự phân tích, cài đặt và kiểm tra bằng C++ là cơ sở để trao đổi nền tảng. Đặc biệt cần nhìn lại mảng, xâu, hàm và các phương pháp cơ bản trước khi chọn điểm học tiếp.',
    pathway: [
      { label: 'ĐIỂM BẮT ĐẦU', title: 'Từ nền tảng đến mô hình', description: 'Kết nối kiến thức cơ bản với cách biểu diễn dữ liệu và phân tích giới hạn của bài toán.' },
      { label: 'QUÁ TRÌNH HỌC', title: 'Kỹ thuật → chiến lược → trạng thái', description: 'Sáu chặng đi từ xử lý mảng và cấu trúc dữ liệu đến các chiến lược tìm kiếm, rồi quy hoạch động.' },
      { label: 'HƯỚNG VẬN DỤNG', title: 'Lập luận và tối ưu lời giải', description: 'Đối chiếu cách giải với tính đúng đắn, độ phức tạp và trường hợp biên khi luyện bài chuyên Tin, HSG Tỉnh.' },
    ],
    focusTags: ['Cộng dồn', 'Mảng hiệu', 'Hai con trỏ', 'Cấu trúc dữ liệu', 'Đệ quy', 'Chia để trị', 'Quay lui', 'Tham lam', 'Chặt trên đáp án', 'Hashing', 'Quy hoạch động', 'Knapsack', 'LIS / LCS'],
  },
  E: {
    tagline: 'Đầu vào chọn lọc. Tri thức rộng, tư duy sâu.',
    overview: 'Lớp Chủ lực tiếp nối nền tảng lớp C qua thi tuyển đầu vào riêng. Định hướng học mở rộng chiều sâu kiến thức, bám sát chuyên Tin và tư duy lập trình thi đấu, vượt ra ngoài việc chỉ luyện dạng bài để hướng đến thứ hạng cao trong kỳ thi HSG Tỉnh và tuyển sinh chuyên Tin.',
    headline: ['Đào sâu tri thức chuyên Tin.', 'Phát triển tư duy thi đấu.'],
    introduction: 'Lớp E dành cho học sinh cần kiến thức khó hơn và muốn mở rộng khả năng tiếp cận bài toán. Từ nền tảng lớp C, định hướng Chủ lực kết nối chiều rộng kiến thức với chiều sâu lập luận: nhận diện bản chất vấn đề, liên hệ các phương pháp và xem xét lời giải trong bối cảnh lập trình thi đấu. Mục tiêu gắn với HSG Tỉnh và tuyển sinh chuyên Tin, đồng thời chú trọng sự phát triển tư duy vượt ra ngoài ôn luyện theo dạng. Học sinh tham gia qua thi tuyển đầu vào riêng từ lớp C; nhóm 3–4 học sinh, mỗi buổi 2 giờ, lịch thống nhất theo các thành viên.',
    foundation: 'Học sinh từ lớp C tham gia thi tuyển đầu vào riêng. Quá trình học, những bài đã luyện và mục tiêu chuyên Tin là cơ sở để trao đổi việc tham gia; hoàn thành lớp C không đồng nghĩa tự động được nhận vào lớp E.',
    pathway: [
      { label: 'NỀN TẢNG', title: 'Xuất phát từ lớp C', description: 'Kết nối nền tảng C+D với nhu cầu học kiến thức khó hơn và mục tiêu phát triển tiếp theo.' },
      { label: 'ĐẦU VÀO', title: 'Thi tuyển riêng', description: 'Đăng ký trao đổi cùng đội ngũ để tìm hiểu thi tuyển vào lớp Chủ lực từ lớp C.' },
      { label: 'ĐỊNH HƯỚNG', title: 'Chuyên Tin và tư duy thi đấu', description: 'Đào sâu kiến thức, mở rộng cách phân tích và liên hệ phương pháp; hướng đến HSG Tỉnh và tuyển sinh chuyên Tin.' },
    ],
    development: [
      { label: 'CHIỀU RỘNG TRI THỨC', title: 'Mở rộng tri thức', description: 'Đặt kiến thức đã học vào những yêu cầu khó hơn: phân tích dữ kiện, làm rõ ràng buộc và nhận diện điều cần tìm. Từ đó, xem xét một vấn đề dưới nhiều góc nhìn thay vì chỉ nhận dạng bài quen thuộc.' },
      { label: 'CHIỀU SÂU LẬP LUẬN', title: 'Liên hệ phương pháp', description: 'So sánh những hướng giải có thể sử dụng, giải thích điều kiện áp dụng và lý do lựa chọn. Liên hệ cách biểu diễn dữ liệu với cách xử lý để xây dựng một lập luận nhất quán, có thể kiểm chứng.' },
      { label: 'TÍNH ĐỘC LẬP TƯ DUY', title: 'Phát triển tư duy thi đấu độc lập', description: 'Chủ động hình thành giả thuyết, tìm trường hợp phản biện và kiểm tra lời giải trong giới hạn dữ liệu. Việc đối chiếu ý tưởng, mã và kết quả là cơ sở để điều chỉnh cách tiếp cận khi gặp bài toán mới.' },
    ],
    focusTags: ['Chủ lực', 'Đầu vào từ C', 'Thi tuyển riêng', 'Chuyên Tin', 'HSG Tỉnh', 'Tư duy thi đấu', 'Đào sâu kiến thức'],
  },
  K: {
    tagline: 'Trọng tâm rõ ràng. Nhịp học phù hợp.',
    overview: 'Lớp K tổ chức học 1–1 hoặc theo nhóm đăng ký riêng. Nội dung được chọn từ các khung đã duyệt theo nhu cầu cụ thể: củng cố nền tảng, làm rõ phần kiến thức còn vướng hoặc sắp xếp một hướng học riêng.',
    headline: ['Xác định trọng tâm học tập.', 'Xây hướng học phù hợp.'],
    introduction: 'Nhu cầu học tập có thể bắt đầu từ một chủ đề chưa rõ, một nhóm bài cần phân tích lại hoặc mong muốn bố trí nhịp học riêng. Lớp K dành cho hình thức 1–1 hoặc nhóm đăng ký riêng, với nội dung được trao đổi từ các chương trình đã duyệt. Người học cùng đội ngũ xác định nền tảng, phạm vi kiến thức và mục tiêu trước khi thống nhất thời lượng, lịch học, học phí. Trọng tâm là một hướng học có căn cứ từ nhu cầu thực tế.',
    foundation: 'Chia sẻ nội dung đã học, bài đã làm, phần còn vướng và thời gian có thể luyện tập. Những thông tin này giúp xác định trọng tâm trước khi chọn phạm vi và hình thức học.',
    pathway: [
      { label: 'NHU CẦU', title: 'Xác định điều cần học', description: 'Làm rõ nền tảng hiện tại, phần cần củng cố và mục tiêu muốn hướng tới.' },
      { label: 'PHẠM VI', title: 'Chọn nội dung có căn cứ', description: 'Cùng đội ngũ chọn hoặc phối nội dung từ những khung chương trình đã được duyệt.' },
      { label: 'TỔ CHỨC HỌC', title: 'Thống nhất nhịp học riêng', description: 'Trao đổi hình thức 1–1 hoặc nhóm riêng, lịch, thời lượng và học phí trước khi bắt đầu.' },
    ],
    focusTags: ['Học 1–1', 'Nhóm đăng ký riêng', 'Củng cố nền tảng', 'Chọn trọng tâm', 'Lịch học riêng'],
  },
};

export type RoadmapStageContent = { description: string; skills: readonly string[]; bridge: string };

/** Keys are stage IDs in learning-curriculum-20260922.json; order remains in that source. */
export const roadmapStageContent: Record<string, RoadmapStageContent> = {
  'basic-a-1': {
    description: 'Bắt đầu từ dữ liệu đầu vào và kết quả cần tìm, người học dùng kiểu dữ liệu, toán tử, rẽ nhánh và vòng lặp để mô tả cách xử lý. Trọng tâm của chặng là liên hệ từng câu lệnh với một thao tác trong lời giải, rồi kiểm tra quá trình thực hiện trên những trường hợp cụ thể.',
    skills: ['Phân tích đầu vào / đầu ra', 'Diễn đạt điều kiện', 'Kiểm soát vòng lặp'],
    bridge: 'Từ xử lý từng giá trị, chuyển sang tổ chức và xử lý nhiều phần tử bằng mảng.',
  },
  'basic-a-2': {
    description: 'Mảng giúp biểu diễn dữ liệu dưới dạng dãy và bảng. Từ duyệt, đếm, tìm giá trị lớn nhất hoặc nhỏ nhất, nội dung tiến tới đảo, chèn, xóa và các thao tác trên ma trận. Cách chọn chỉ số và phạm vi duyệt là điểm kết nối giữa cấu trúc dữ liệu với ý tưởng xử lý.',
    skills: ['Tổ chức dữ liệu', 'Quản lý chỉ số', 'Mô tả thao tác trên dãy / bảng'],
    bridge: 'Dùng những thao tác đã học làm cơ sở để chia chương trình thành hàm và xử lý xâu.',
  },
  'basic-a-3': {
    description: 'Hàm phân chia một chương trình thành những nhiệm vụ có đầu vào và kết quả rõ ràng; xâu mở rộng việc xử lý từ số sang ký tự và văn bản. Chặng này kết nối cách tổ chức mã với tham trị, tham chiếu, phạm vi biến, nhập xâu và các thao tác cơ bản trên string.',
    skills: ['Phân chia nhiệm vụ', 'Theo dõi dữ liệu qua hàm', 'Xử lý ký tự / văn bản'],
    bridge: 'Nền tảng C++ là điểm nối để tìm hiểu các phương pháp giải bài ở lớp B.',
  },
  'basic-b-1': {
    description: 'Vét cạn đặt câu hỏi cần xét những phương án nào và làm sao không bỏ sót; mảng thống kê tổ chức những lần xuất hiện thành dữ liệu có thể truy cập. Hai hướng tiếp cận giúp làm rõ quan hệ giữa cách duyệt, điều kiện chấp nhận và kết quả cần tính.',
    skills: ['Mô tả không gian phương án', 'Kiểm tra điều kiện', 'Tổ chức dữ liệu đếm'],
    bridge: 'Từ duyệt và đếm, khai thác thêm tính chất số học để xây dựng lời giải.',
  },
  'basic-b-2': {
    description: 'Các chủ đề số chính phương, số nguyên tố, ước, Euclid, phân tích thừa số và Legendre nối tính chất toán học với cách tính bằng chương trình. Modulo, lũy thừa nhanh, đổi hệ cơ số và nhân Ấn Độ tiếp tục mở rộng cách biểu diễn và thực hiện phép tính.',
    skills: ['Khai thác tính chất số', 'Chuyển lập luận thành phép tính', 'So sánh cách tính'],
    bridge: 'Kết hợp công cụ số học với cấu trúc lưu trữ và thứ tự xử lý dữ liệu.',
  },
  'basic-b-3': {
    description: 'Vector, pair, struct và map cung cấp những cách lưu dữ liệu theo nhu cầu truy cập. Sắp xếp cơ bản, sort() và comparator làm rõ vai trò của thứ tự: dữ liệu được tổ chức tốt có thể giúp một phương án giải trở nên đơn giản hơn.',
    skills: ['Lựa chọn cách lưu trữ', 'Tổ chức bản ghi', 'Xác định tiêu chí sắp xếp'],
    bridge: 'Khai thác dữ liệu đã sắp xếp bằng tìm kiếm nhị phân, rồi mở rộng xử lý xâu.',
  },
  'basic-b-4': {
    description: 'Chặt nhị phân trên mảng đã sắp xếp thu hẹp miền tìm kiếm theo từng bước; lower_bound và upper_bound liên hệ thao tác tìm vị trí với thư viện C++. Xử lý xâu tiến tới tách từ, chuẩn hóa và các bài toán đối xứng, giúp vận dụng nền tảng ký tự trong những yêu cầu đa dạng hơn.',
    skills: ['Thu hẹp miền tìm kiếm', 'Kiểm tra biên', 'Phân tích cấu trúc xâu'],
    bridge: 'Làm cơ sở để trao đổi hướng học kỹ thuật mảng, chiến lược giải bài và quy hoạch động ở lớp C.',
  },
  'advanced-1': {
    description: 'Mảng cộng dồn, mảng hiệu, hai con trỏ và cửa sổ trượt khai thác quan hệ giữa những đoạn dữ liệu. Chặng này chuyển trọng tâm từ tính lại từng yêu cầu sang tổ chức phép tính, lưu thông tin cần thiết và cập nhật có kiểm soát.',
    skills: ['Tiền xử lý', 'Khai thác quan hệ giữa các đoạn', 'Theo dõi dữ liệu khi cập nhật'],
    bridge: 'Từ kỹ thuật xử lý dữ liệu, xem xét cấu trúc lưu trữ phù hợp với thao tác cần thực hiện.',
  },
  'advanced-2': {
    description: 'Các cấu trúc tuyến tính, set, map, mảng đếm, queue, deque và stack được nhìn qua nhu cầu lưu, tìm và lấy dữ liệu. Thay vì chọn theo thói quen, chặng này hướng việc lựa chọn cấu trúc về thao tác chủ đạo và thứ tự xử lý của bài toán.',
    skills: ['Chọn cấu trúc dữ liệu', 'Phân tích thao tác truy cập', 'Kiểm soát thứ tự xử lý'],
    bridge: 'Kết hợp tổ chức dữ liệu với đệ quy, chia để trị và quá trình sinh phương án.',
  },
  'advanced-3': {
    description: 'Đệ quy diễn đạt lời giải thông qua những bài toán nhỏ hơn; chia để trị nối việc phân chia với tổng hợp kết quả. Quay lui mở rộng sang sinh phương án và mô hình tìm kiếm, với cắt nhánh để loại những hướng không còn phù hợp.',
    skills: ['Phân rã bài toán', 'Mô tả trạng thái tìm kiếm', 'Kiểm soát không gian phương án'],
    bridge: 'Đối chiếu tìm kiếm phương án với những chiến lược lựa chọn, kiểm tra đáp án và so sánh xâu.',
  },
  'advanced-4': {
    description: 'Tham lam, chặt nhị phân trên đáp án và hashing đưa ra ba cách nhìn khác nhau: lựa chọn theo một tiêu chí, kiểm tra tính khả thi của đáp án và biểu diễn xâu để so sánh. Trọng tâm là điều kiện áp dụng, lý do lời giải đúng và những giới hạn cần kiểm tra.',
    skills: ['Lập luận lựa chọn', 'Xây hàm kiểm tra', 'Đánh giá điều kiện áp dụng'],
    bridge: 'Từ lựa chọn và kiểm tra, chuyển sang mô hình liên hệ các bài toán con bằng quy hoạch động.',
  },
  'advanced-5': {
    description: 'Quy hoạch động bắt đầu từ câu hỏi trạng thái cần lưu những gì và kết quả nào có thể suy ra từ bài toán con. Các mô hình nhập môn, trên lưới, cái túi và chia tập giúp đối chiếu cách xác định trạng thái, điều kiện ban đầu, quan hệ chuyển và thứ tự tính.',
    skills: ['Định nghĩa trạng thái', 'Thiết lập quan hệ chuyển', 'Chọn thứ tự tính'],
    bridge: 'Vận dụng mô hình trạng thái vào dãy, xâu và các bài toán cần mở rộng cách biểu diễn.',
  },
  'advanced-6': {
    description: 'LIS, LCS, Edit Distance và các trạng thái mở rộng tiếp tục phát triển cách mô tả bài toán bằng quy hoạch động. Nội dung kết nối độ dài hoặc giá trị tối ưu với truy vết, đồng thời xem xét trạng thái hai chiều và chia đoạn theo cấu trúc dữ liệu của bài.',
    skills: ['Mô hình hóa dãy / xâu', 'Truy vết lời giải', 'Mở rộng trạng thái'],
    bridge: 'Kết nối các phương pháp C+D để phân tích bài toán chuyên Tin và trao đổi hướng đào sâu tiếp theo.',
  },
};

export type RoadmapLessonContent = { purpose: string; approach: string; skill: string };

/** Descriptions explain the approved topic scope; they are not promises of assessed mastery. */
export const roadmapLessonContent: Record<string, RoadmapLessonContent> = {
  A01: {
    purpose: 'Thiết lập điểm khởi đầu để một chương trình nhận dữ liệu và trả về kết quả.',
    approach: 'Làm quen môi trường lập trình; sử dụng cin/cout và freopen để kết nối yêu cầu nhập, xuất với cách chạy chương trình.',
    skill: 'Đọc định dạng dữ liệu, cài đặt thao tác nhập / xuất và đối chiếu kết quả.',
  },
  A02: {
    purpose: 'Biểu diễn giá trị và phép tính bằng kiểu dữ liệu phù hợp.',
    approach: 'Liên hệ kiểu dữ liệu, ép kiểu và toán tử với những biểu thức xuất hiện trong bài toán; theo dõi giá trị trước và sau phép tính.',
    skill: 'Chọn kiểu dữ liệu và diễn đạt biểu thức có ý nghĩa rõ ràng.',
  },
  A03: {
    purpose: 'Mô tả cách xử lý khác nhau khi dữ liệu thỏa những điều kiện khác nhau.',
    approach: 'Dùng if/else và switch để chuyển một yêu cầu có nhiều trường hợp thành cấu trúc rẽ nhánh; xem xét các nhánh và trường hợp biên.',
    skill: 'Phân chia trường hợp và kiểm tra tính đầy đủ của điều kiện.',
  },
  A04: {
    purpose: 'Diễn đạt những thao tác lặp lại mà không phải viết lại từng câu lệnh.',
    approach: 'Tìm hiểu for, while và vòng lặp lồng nhau qua trạng thái ban đầu, điều kiện tiếp tục và cách cập nhật.',
    skill: 'Theo dõi tiến trình lặp, xác định điểm dừng và số lần thực hiện.',
  },
  A05: {
    purpose: 'Lưu nhiều giá trị thành một dãy và xử lý chúng theo cùng một quy tắc.',
    approach: 'Duyệt mảng một chiều để tìm max/min và đếm phần tử theo điều kiện; liên hệ chỉ số với vị trí trong dãy.',
    skill: 'Quản lý chỉ số, phạm vi duyệt và giá trị tích lũy.',
  },
  A06: {
    purpose: 'Mô tả những thay đổi về vị trí và số lượng phần tử trong dãy.',
    approach: 'Phân tích thao tác đảo, chèn và xóa theo thứ tự dịch chuyển dữ liệu; kiểm tra dãy trước và sau mỗi thao tác.',
    skill: 'Kiểm soát thứ tự cập nhật và tránh bỏ sót hoặc ghi đè phần tử.',
  },
  A07: {
    purpose: 'Mở rộng từ dữ liệu dạng dãy sang dữ liệu dạng bảng.',
    approach: 'Biểu diễn ma trận bằng mảng hai chiều; phân tích cách duyệt đường chéo và xoay qua quan hệ giữa hàng, cột và vị trí.',
    skill: 'Mô hình hóa vị trí bằng hai chỉ số và chuyển đổi tọa độ trong bảng.',
  },
  A08: {
    purpose: 'Chia một chương trình thành những nhiệm vụ có thể mô tả riêng.',
    approach: 'Tìm hiểu hàm cùng tham trị, tham chiếu và phạm vi biến; theo dõi dữ liệu khi truyền vào, xử lý và trả kết quả.',
    skill: 'Phân chia nhiệm vụ và làm rõ vai trò của tham số, biến và kết quả.',
  },
  A09: {
    purpose: 'Biểu diễn và xử lý dữ liệu gồm ký tự hoặc văn bản.',
    approach: 'Kết nối bảng mã ASCII, getline và hàm thư viện string với các thao tác xử lý xâu đơn giản.',
    skill: 'Phân biệt ký tự với xâu và kiểm soát cách nhập, duyệt, xử lý văn bản.',
  },
  B01: {
    purpose: 'Tìm lời giải bằng cách xét đầy đủ những phương án thuộc phạm vi bài toán.',
    approach: 'Duyệt tổ hợp và đếm theo điều kiện; xác định phương án được tạo như thế nào, khi nào được chấp nhận và có bị xét trùng hay không.',
    skill: 'Mô tả không gian phương án, kiểm tra điều kiện và đánh giá lượng công việc.',
  },
  B02: {
    purpose: 'Biến những lần xuất hiện của dữ liệu thành thông tin thống kê.',
    approach: 'Tổ chức mảng đếm theo giá trị hoặc đặc trưng cần theo dõi; dùng dữ liệu thống kê để xử lý yêu cầu của bài toán.',
    skill: 'Chọn đại lượng cần đếm và liên hệ dữ liệu gốc với biểu diễn thống kê.',
  },
  B03: {
    purpose: 'Khai thác tính chất số chính phương khi xử lý yêu cầu số học.',
    approach: 'Liên hệ một số với bình phương của số nguyên; diễn đạt điều kiện nhận biết và kiểm tra bằng chương trình.',
    skill: 'Chuyển một tính chất toán học thành điều kiện tính toán.',
  },
  B04: {
    purpose: 'Nhận biết số nguyên tố và tổ chức việc xét các ước của một số.',
    approach: 'Khai thác quan hệ giữa các cặp ước để kiểm tra số nguyên tố và đếm ước với phạm vi duyệt O(√n).',
    skill: 'Dùng tính chất của ước để giảm phạm vi duyệt và kiểm tra trường hợp đặc biệt.',
  },
  B05: {
    purpose: 'Tổ chức việc tìm số nguyên tố cho nhiều giá trị trong cùng một phạm vi.',
    approach: 'Tìm hiểu sàng Eratosthenes qua quá trình đánh dấu bội số; đối chiếu với việc kiểm tra từng số riêng lẻ.',
    skill: 'Nhìn nhận tiền xử lý như cách chuẩn bị thông tin dùng lại.',
  },
  B06: {
    purpose: 'Tính ước chung lớn nhất và liên hệ với bội chung nhỏ nhất.',
    approach: 'Theo dõi phép chia lấy dư trong thuật toán Euclid và vận dụng quan hệ giữa ƯCLN, BCNN.',
    skill: 'Khai thác tính chất bất biến khi thu nhỏ một bài toán số học.',
  },
  B07: {
    purpose: 'Biểu diễn một số qua những thừa số nguyên tố cấu thành nó.',
    approach: 'Phân tích số thành các thừa số và số mũ; dùng biểu diễn này để làm rõ cấu trúc nhân của giá trị ban đầu.',
    skill: 'Tổ chức thông tin thừa số và liên hệ biểu diễn với tính chất của số.',
  },
  B08: {
    purpose: 'Xác định bậc của một số nguyên tố trong N! mà không tính trực tiếp giai thừa.',
    approach: 'Vận dụng công thức Legendre bằng cách đếm đóng góp của các bội của số nguyên tố và những lũy thừa của nó.',
    skill: 'Thay phép tính trên giá trị lớn bằng cách đếm những thành phần tạo nên giá trị.',
  },
  B09: {
    purpose: 'Mở rộng cách thực hiện và biểu diễn phép tính số học.',
    approach: 'Kết nối modulo, lũy thừa nhanh, đổi hệ cơ số và nhân Ấn Độ với cách phân rã phép tính thành những bước nhỏ hơn.',
    skill: 'Theo dõi giá trị trung gian, cấu trúc phép tính và cách biểu diễn số.',
  },
  B10: {
    purpose: 'Làm quen một cấu trúc lưu trữ dãy dữ liệu trong thư viện C++.',
    approach: 'Tìm hiểu thao tác cơ bản với vector và liên hệ chúng với cách duyệt, truy cập dữ liệu đã học ở mảng.',
    skill: 'Chọn cách lưu trữ dãy theo nhu cầu của chương trình.',
  },
  B11: {
    purpose: 'Gom những giá trị liên quan thành một đơn vị dữ liệu.',
    approach: 'Dùng pair và struct để biểu diễn các thuộc tính của một đối tượng; xác định ý nghĩa của từng thành phần.',
    skill: 'Mô hình hóa dữ liệu có nhiều thuộc tính và giữ quan hệ giữa chúng.',
  },
  B12: {
    purpose: 'Lưu và truy cập thông tin theo khóa.',
    approach: 'Tìm hiểu map cơ bản qua quan hệ khóa–giá trị và những thao tác phục vụ yêu cầu tra cứu hoặc thống kê.',
    skill: 'Chọn khóa có ý nghĩa và tổ chức dữ liệu theo nhu cầu truy cập.',
  },
  B13: {
    purpose: 'Tổ chức thứ tự dữ liệu để hỗ trợ các bước xử lý tiếp theo.',
    approach: 'Đối chiếu thuật toán sắp xếp cơ bản với sort(); dùng comparator để mô tả tiêu chí sắp xếp phù hợp.',
    skill: 'Xác định thứ tự, diễn đạt tiêu chí so sánh và khai thác dữ liệu đã sắp xếp.',
  },
  B14: {
    purpose: 'Tìm vị trí trên mảng đã sắp xếp bằng cách thu hẹp miền tìm kiếm.',
    approach: 'Phân tích chặt nhị phân trên mảng và cách sử dụng lower_bound, upper_bound; kiểm tra quan hệ giữa giá trị tìm và các biên.',
    skill: 'Duy trì miền tìm kiếm và phân biệt những yêu cầu tìm vị trí khác nhau.',
  },
  B15: {
    purpose: 'Vận dụng biểu diễn xâu để xử lý cấu trúc của văn bản và tính đối xứng.',
    approach: 'Tách từ, chuẩn hóa xâu; kiểm tra, tìm và đếm palindrome theo các yêu cầu của bài toán.',
    skill: 'Phân tích đặc trưng của xâu và kiểm soát chỉ số khi so sánh ký tự.',
  },
  C01: {
    purpose: 'Chuẩn bị thông tin để tính tổng trên đoạn hoặc vùng dữ liệu.',
    approach: 'Xây mảng cộng dồn một chiều và hai chiều; liên hệ tổng cần tìm với những giá trị đã tính trước.',
    skill: 'Thiết kế tiền xử lý và suy ra kết quả từ quan hệ giữa các đoạn / vùng.',
  },
  C02: {
    purpose: 'Biểu diễn thay đổi trên đoạn thông qua thông tin chênh lệch.',
    approach: 'Tìm hiểu mảng hiệu và quan hệ với phép cộng dồn; theo dõi cách cập nhật được ghi nhận rồi khôi phục thành dữ liệu.',
    skill: 'Tách thao tác cập nhật khỏi quá trình tổng hợp kết quả.',
  },
  C03: {
    purpose: 'Khai thác quan hệ giữa các vị trí hoặc đoạn liên tiếp trong dãy.',
    approach: 'Dùng hai con trỏ và cửa sổ trượt; xác định khi nào dịch chuyển biên và thông tin nào cần giữ khi phạm vi thay đổi.',
    skill: 'Duy trì điều kiện của đoạn đang xét và tránh xử lý lại dữ liệu không cần thiết.',
  },
  C04: {
    purpose: 'Tổ chức và xử lý dữ liệu tuyến tính theo thao tác cần thực hiện.',
    approach: 'Kết nối vector, pair và unique với biểu diễn dãy, nhóm thuộc tính và xử lý phần tử trùng theo yêu cầu.',
    skill: 'Liên hệ cách lưu trữ với thứ tự dữ liệu và thao tác xử lý.',
  },
  C05: {
    purpose: 'Lựa chọn cách lưu, tìm và thống kê dữ liệu theo đặc trưng của bài toán.',
    approach: 'Đối chiếu set, map và mảng đếm về vai trò lưu trữ, truy cập; phân biệt yêu cầu của từng cấu trúc trong lời giải.',
    skill: 'Chọn cấu trúc theo thao tác chủ đạo và phạm vi dữ liệu.',
  },
  C06: {
    purpose: 'Biểu diễn những quy tắc khác nhau về thứ tự đưa vào và lấy dữ liệu.',
    approach: 'Tìm hiểu queue, deque và stack; theo dõi thứ tự xử lý để liên hệ cấu trúc với mô hình của bài toán.',
    skill: 'Mô hình hóa luồng xử lý và lựa chọn thứ tự truy cập phù hợp.',
  },
  C07: {
    purpose: 'Giải bài toán thông qua những bài toán nhỏ hơn và cách tổng hợp kết quả.',
    approach: 'Phân tích đệ quy, đệ quy có nhớ và merge sort; làm rõ điều kiện dừng, lời gọi con và bước kết hợp.',
    skill: 'Phân rã vấn đề, mô tả quan hệ giữa các bài toán con và theo dõi lời gọi.',
  },
  C08: {
    purpose: 'Sinh các phương án theo một quá trình xây dựng có thứ tự.',
    approach: 'Vận dụng quay lui để sinh dãy nhị phân, hoán vị và xâu; theo dõi lựa chọn, trạng thái và thao tác khôi phục.',
    skill: 'Mô tả không gian phương án và kiểm soát trạng thái khi tìm kiếm.',
  },
  C09: {
    purpose: 'Xây mô hình tìm kiếm cho những bài toán có ràng buộc giữa các lựa chọn.',
    approach: 'Phân tích N quân hậu, mã đi tuần và cắt nhánh; xác định điều kiện hợp lệ và những hướng có thể loại bỏ.',
    skill: 'Mô hình hóa ràng buộc và lập luận về việc cắt bớt nhánh tìm kiếm.',
  },
  C10: {
    purpose: 'Xem xét khi nào một chuỗi lựa chọn theo tiêu chí có thể tạo lời giải phù hợp.',
    approach: 'Đối chiếu chọn hoạt động, đổi tiền và xếp lịch để phân tích tiêu chí tham lam; kiểm tra điều kiện áp dụng bằng lập luận và phản ví dụ.',
    skill: 'Phân biệt lựa chọn trực giác với lựa chọn có cơ sở đúng đắn.',
  },
  C11: {
    purpose: 'Chuyển việc tìm đáp án thành quá trình kiểm tra các giá trị ứng viên.',
    approach: 'Xây hàm check và phân tích tính đơn điệu trước khi chặt nhị phân trên đáp án; theo dõi miền đáp án sau từng lần kiểm tra.',
    skill: 'Mô hình hóa tính khả thi và kết nối phép kiểm tra với việc thu hẹp miền tìm.',
  },
  C12: {
    purpose: 'Tìm hiểu cách biểu diễn xâu bằng giá trị băm để hỗ trợ so sánh.',
    approach: 'Liên hệ dữ liệu xâu với biểu diễn hashing; xem xét cách so sánh và giới hạn của việc dùng giá trị băm.',
    skill: 'Đánh giá cách biểu diễn dữ liệu và lưu ý khả năng va chạm băm.',
  },
  D01: {
    purpose: 'Làm quen việc giải bài toán bằng kết quả của những bài toán con.',
    approach: 'Phân tích leo bậc thang, tam giác số và Kadane qua trạng thái, điều kiện ban đầu, quan hệ chuyển và thứ tự tính.',
    skill: 'Định nghĩa trạng thái và giải thích vì sao thông tin được lưu là đủ.',
  },
  D02: {
    purpose: 'Biểu diễn quá trình tính toán theo vị trí trong một bảng hoặc lưới.',
    approach: 'Xây trạng thái cho đường đi lớn nhất và đếm cách đi; liên hệ một ô với những vị trí có thể dẫn đến nó.',
    skill: 'Mô hình hóa quan hệ phụ thuộc và chọn thứ tự duyệt trạng thái.',
  },
  D03: {
    purpose: 'Mô tả lựa chọn dưới một giới hạn bằng trạng thái quy hoạch động.',
    approach: 'Đối chiếu Knapsack 0/1 với trường hợp không giới hạn số lượng; phân tích vai trò của giới hạn và thứ tự cập nhật.',
    skill: 'Phân biệt mô hình chọn một lần với chọn nhiều lần và kiểm soát chuyển trạng thái.',
  },
  D04: {
    purpose: 'Tổ chức các lựa chọn thành mô hình tính toán trên tổng hoặc phần được phân chia.',
    approach: 'Phân tích bài toán đổi tiền, chia kẹo; làm rõ ý nghĩa trạng thái, lựa chọn bổ sung và kết quả cần tính.',
    skill: 'Liên hệ điều kiện phân chia với trạng thái và tránh đếm sai phương án.',
  },
  D05: {
    purpose: 'Mô hình hóa quan hệ giữa các phần tử khi tìm dãy con tăng dài nhất.',
    approach: 'Phân tích LIS qua trạng thái thể hiện dãy con và cách truy vết để đi từ giá trị tối ưu tới một lời giải cụ thể.',
    skill: 'Liên hệ giá trị tối ưu với cấu trúc lời giải và thông tin cần truy vết.',
  },
  D06: {
    purpose: 'Biểu diễn quan hệ giữa hai xâu bằng những bài toán con.',
    approach: 'Đối chiếu LCS và Edit Distance để xác định trạng thái theo vị trí, điều kiện ký tự và quan hệ chuyển.',
    skill: 'Mô hình hóa hai chiều và phân biệt mục tiêu chung dài nhất với chi phí biến đổi.',
  },
  D07: {
    purpose: 'Mở rộng cách mô tả trạng thái khi một chiều thông tin chưa đủ.',
    approach: 'Phân tích trạng thái hai chiều và chia đoạn; xác định các chiều cần lưu, quan hệ phụ thuộc và cách tổng hợp kết quả.',
    skill: 'Lựa chọn thông tin trạng thái và kiểm soát chi phí khi mở rộng mô hình.',
  },
};
