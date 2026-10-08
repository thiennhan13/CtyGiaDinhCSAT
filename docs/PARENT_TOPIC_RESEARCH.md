# Thư viện bài học dành cho phụ huynh

## Quyết định và ranh giới

Thư viện giải thích sâu từng chủ đề của khung chuẩn, phục vụ phụ huynh hiểu nội dung học và trao đổi cùng con. Trang phụ huynh giữ tóm tắt/định hướng ngắn; nút đọc mở bài riêng trong `/parents`. Bài dài có thể chia series, mở từ bài đầu, có mục lục series và điều hướng trước/sau. Code hoặc pseudocode nằm trong khối code; dùng mã trọng tâm, chỉ đưa chương trình đầy đủ khi việc nhập/xuất hoặc tổ chức chương trình cần được giải thích.

Quyền đọc do server kiểm tra qua phiên phụ huynh, học sinh/lớp có liên kết hiệu lực và khung chuẩn đã công bố. Nội dung không đặt trong `public`, không đưa vào danh mục bài đăng công khai. Nguồn Markdown tĩnh là nội dung biên soạn chung, không chứa hồ sơ hoặc nhận xét riêng của học sinh; bản thân việc giữ tệp ngoài `public` không thay kiểm tra quyền của route.

- Giữ 43 chủ đề A01–A09, B01–B15, C01–C12/D01–D07 và danh mục chuẩn hiện hành. C là tên gọi chung của toàn bộ C/D; không chuyển loại lớp hoặc đổi mã.
- Cơ bản sử dụng A+B, giữ lựa chọn A/B/A+B hiện có. Nâng cao dùng toàn bộ phần C/D dưới tên C. PreVOI sử dụng E và lớp chưa có khung sử dụng K là hướng bổ sung sau, chưa tạo giáo án E/K hoặc chuyển dữ liệu trong đợt này.
- Admin chọn/bỏ chủ đề trong khung chuẩn; chưa bổ sung chủ đề ngoài khung. Thư viện diễn giải áp dụng cho phiên bản chuẩn đã công bố; khung cũ/tùy chỉnh giữ fallback hiện hành, không ghép bài mới chỉ vì mã có vẻ giống nhau.
- Chặng hiện tại được suy từ số buổi **của lớp** đã hoàn thành, tính từ đầu lớp và bỏ buổi hủy/chưa diễn ra; không phụ thuộc tháng đang xem. Theo quy ước đã duyệt, một buổi hoàn thành tương ứng một chủ đề; hiển thị cả chặng, không suy ra mức thành thạo của học sinh.
- Series và các bài đọc không tăng topic count, số buổi hay tạo trạng thái năng lực mới. CSATOJ chỉ nối khi có ID/mapping thật; trước đó dùng dạng bài để tham khảo, không dựng đường dẫn hoặc số bài giả.
- Portal dùng typography rõ, neobrutalism gọn và reveal nhẹ; không đưa art quảng cáo hoặc đầu đề/chú thích rỗng vào phần đọc bài.

## Trạng thái biên soạn

Thư viện có **54 bài cho 43 chủ đề** trong `content/parent-topics/`, theo kế hoạch đã duyệt và các chỉnh sửa văn phong của chủ trung tâm. Đây là trạng thái biên soạn local, chưa phát hành production. Quyền, renderer và route được kiểm chứng riêng tại [triển khai](PARENT_TOPICS.md).

Metadata nằm trong `lib/parent-topic-catalog/`; `order` tính trong chuỗi của cùng mã chủ đề. Danh mục có kiểu dữ liệu là nguồn chuẩn cho title/excerpt/slug, không nhân bản bảng danh mục vào tài liệu này.

Markdown bài học không có YAML frontmatter hoặc H1; title lấy từ registry và route render một lần. Bài bắt đầu bằng đoạn dẫn, chia mục bằng H2/H3, dùng bảng và code fence; không có HTML raw. Việc parser tắt HTML raw và xử lý URL an toàn thuộc renderer, không suy ra từ việc các bản mẫu không có HTML.

## Vai trò các nguồn

**VNOI** giúp định hướng cách lập luận: phát biểu bài toán → cách trực tiếp → nhận xét quan trọng → ý tưởng → lý do đúng → cài đặt và giới hạn. Đây là nhận xét rút ra từ các bài đã đọc, không phải tuyên bố về một style guide chính thức. Học sườn và cách dẫn, không sao chép câu chữ, ví dụ hoặc mã.

**USACO Guide** đối chiếu kỹ thuật, điều kiện áp dụng, chi phí và các biến thể. Các mức Bronze/Silver/Gold của nguồn không được chuyển thành trình độ hoặc cam kết thi của học sinh CSAT. Một số bản trích trang trả mã Python dù URL có tùy chọn C++; chỉ ghi nhận ngôn ngữ thực sự đọc được.

**Viblo** bổ sung cách giải thích tiếng Việt và ứng dụng theo từng thuật toán. Ghi đúng tác giả hoặc tài khoản hiển thị; không xem mọi bài là giáo án thống nhất hoặc đã được xác minh. **CS50** hỗ trợ cách giải thích nhập môn; bài CSAT dùng C++, không đưa thư viện riêng/cú pháp C của khóa vào mã C++.

## Ma trận tài liệu đã đọc

“Đã đọc phần liên quan” nghĩa là đã mở được nội dung và đọc các mục dùng cho phạm vi nêu trong bảng, không chỉ dựa vào snippet tìm kiếm; không có nghĩa đã đọc toàn bộ sách hoặc kiểm thử toàn bộ code của nguồn.

| Nguồn | Tài liệu | Phạm vi dùng | Trạng thái |
|---|---|---|---|
| VNOI | [Độ phức tạp tính toán](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/computational-complexity.md) | A04, B/C: đếm thao tác, cận vòng lặp, đánh giá chi phí | Đã đọc phần liên quan |
| VNOI | [Sắp xếp](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/sorting-new.md) | B13, C07: ý tưởng sắp xếp, merge sort, điều kiện của phương pháp | Đã đọc phần liên quan |
| VNOI | [Tìm kiếm nhị phân](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/binary-search.md) | B14, C11: phạm vi tìm kiếm, hàm kiểm tra và đáp án | Đã đọc phần liên quan; tự tính lại ví dụ |
| VNOI | [Hai con trỏ](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/two-pointers.md) | C03: lý do dịch con trỏ và điều kiện giữ cửa sổ | Đã đọc phần liên quan |
| VNOI | [Quay lui](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/backtracking.md) | C08, C09: lựa chọn, điểm dừng, khôi phục trạng thái | Đã đọc phần liên quan |
| VNOI | [Tham lam](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/greedy-new.md) | C10: phản ví dụ, chọn hoạt động, chứng minh lựa chọn | Đã đọc phần liên quan |
| VNOI | [Mảng cộng dồn và mảng hiệu](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/data-structures/prefix-sum-and-difference-array.md) | C01, C02: định nghĩa tổng/vùng, phép lấy đoạn và cập nhật | Đã đọc phần liên quan |
| VNOI | [Giai thừa modulo số nguyên tố](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/factorial-modulo-prime.md) | B08: phần giải thích số mũ nguyên tố bằng công thức Legendre | Đã đọc phần Legendre; không mở rộng toàn bài vào B08 |
| VNOI | [Quy hoạch động cơ bản](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md) | D01–D05: ý nghĩa trạng thái, cơ sở, lưới, LIS, cái túi | Đã đọc phần liên quan |
| USACO Guide | [Cấu trúc dữ liệu nhập môn](https://usaco.guide/bronze/intro-ds) | A/B: mảng, vector, pair, string và chi phí thao tác | Đã đọc phần liên quan |
| USACO Guide | [Duyệt đầy đủ](https://usaco.guide/bronze/intro-complete) | B01: duyệt phương án, tránh đếm trùng, xem giới hạn | Đã đọc phần liên quan |
| USACO Guide | [Prefix Sums](https://usaco.guide/silver/prefix-sums) | C01: tiền xử lý, tổng đoạn và chi phí nhiều truy vấn | Đã đọc phần liên quan |
| USACO Guide | [Binary Search](https://usaco.guide/silver/binary-search) | B14, C11: cận, đơn điệu và lỗi biên | Đã đọc phần liên quan |
| USACO Guide | [Two Pointers](https://usaco.guide/silver/two-pointers) | C03: hai đầu, cửa sổ và điều kiện dịch chuyển | Đã đọc phần liên quan |
| USACO Guide | [Introduction to DP](https://usaco.guide/gold/intro-dp) | C07, D01: bài toán con lặp, lưu kết quả, hướng tính | Đã đọc phần liên quan |
| USACO Guide | [Knapsack DP](https://usaco.guide/gold/knapsack) | D03, D04: sức chứa, tối ưu, đếm và biến thể | Đã đọc phần liên quan |
| USACO Guide | [Hashing](https://usaco.guide/gold/hashing) | C12: hash tiền tố, lấy hash đoạn, va chạm | Đã đọc phần String Hashing; không đưa XOR/Zobrist vào khung |
| Viblo Algorithm | [Mảng tổng tiền tố và mảng hiệu](https://viblo.asia/p/quy-hoach-dong-55-mang-tong-tien-to-va-mang-hieu-phan-1-r1QLx6104Aw) | C01, C02: 1D/2D, quan hệ hai kỹ thuật | Đã đọc toàn văn; có lỗi code/chỉ số cần đối chiếu |
| Viblo Algorithm | [Giới thiệu tìm kiếm nhị phân](https://viblo.asia/p/gioi-thieu-thuat-toan-tim-kiem-nhi-phan-maGK7BjB5j2) | B14: dẫn từ dữ liệu có thứ tự đến chia đôi | Đã đọc toàn văn; kiểm tra lại số bước và nhánh không tìm thấy |
| Viblo Algorithm; cuối bài ghi Vũ Quế Lâm | [Tất cả những gì bạn cần là quy hoạch động](https://viblo.asia/p/tat-ca-nhung-gi-ban-can-la-quy-hoach-dong-jvElaqVDlkw) | D01: cơ sở, bảng phương án và công thức truy hồi | Đã đọc toàn văn; không dùng nhận định phủ định vét cạn quá rộng |
| Viblo Algorithm | [Bài toán cái túi và ứng dụng](https://viblo.asia/p/bai-toan-cai-tui-va-nhung-ung-dung-xung-quanh-no-maGK7Nke5j2) | D03, D04: phân biệt 0/1, không giới hạn và các dạng đếm | Đã đọc toàn văn; công thức/mã không hoàn toàn nhất quán |
| Trần Trung Phong, Viblo | [Thuật toán tham lam](https://viblo.asia/p/thuat-toan-tham-lam-greedy-algorithm-XQZGxozlvwA) | C10: khái niệm lựa chọn cục bộ | Đã đọc toàn văn; không dùng ví dụ cái túi nguyên theo tỉ lệ như lời giải đúng |
| Viblo Algorithm | [So khớp chuỗi Rolling Hash](https://viblo.asia/p/giai-thuat-so-khop-chuoi-rolling-hash-Ljy5V3kMKra) | C12: đa thức, tiền tố và hash đoạn | Đã đọc toàn văn; đối chiếu bảng ký tự và khẳng định va chạm |
| Harvard CS50 | [Lecture 1](https://cs50.harvard.edu/x/notes/1/) | A02–A04: biến, điều kiện, vòng lặp, theo dõi giá trị | Đã đọc phần liên quan |
| Harvard CS50 | [Lecture 2](https://cs50.harvard.edu/x/notes/2/) | A05/A09: mảng, chuỗi và quan sát lỗi | Đã đọc phần liên quan |
| Harvard CS50 | [Lecture 3](https://cs50.harvard.edu/x/notes/3/) | B13/B14, C07: tìm kiếm, sắp xếp và đệ quy | Đã đọc phần liên quan |

Ma trận có hơn 15 tài liệu thực; các nguồn đối chiếu bổ sung cho toàn thư viện ghi theo phạm vi tại [A01–B08](parent-topic-sources-ab.md), [B09–C06](parent-topic-sources-bc.md) và [C07–D07](parent-topic-sources-cd.md). Phân biệt nguồn mở/đọc được, nguồn chỉ xác minh liên kết và video chưa xem toàn bộ. Số lượng nguồn không thay kiểm chứng công thức, code hoặc chất lượng sư phạm.

## Các điểm đối chiếu cần giữ khi nhân rộng

- Bài VNOI binary search có ví dụ dữ liệu/chỉ số không nhất quán; giữ phương pháp lập luận nhưng tự tạo dãy có thứ tự và tự tính từng bước.
- Bài Viblo prefix/difference có đoạn cấp phát `diff(n)` rồi ghi từ vị trí 1 cho dữ liệu 1-indexed; cần kiểm tra ô cuối. Một đoạn truy vấn 1D khai báo `q` nhưng không đọc `q`. Không sao chép mã nguồn như một bản đã chạy.
- Công thức 0/1 của bài Viblo cái túi dùng hàng `i` trong nhánh lấy và điều kiện trọng lượng nhỏ hơn nghiêm ngặt; bản 0/1 đúng dùng hàng `i - 1` và cho phép trọng lượng bằng sức chứa. Phân biệt công thức với đoạn mã trong chính bài nguồn.
- Quy tắc giá trị/trọng lượng không bảo đảm tối ưu cho cái túi nguyên. Khi dạy C10 phải có điều kiện, phản ví dụ và lập luận đúng; không chuyển kết quả của cái túi phân số sang 0/1 hoặc không giới hạn.
- Hash bằng nhau không chứng minh chuỗi bằng nhau. Xác suất va chạm cần giả thiết về cách chọn base và số phép so sánh; không tuyên bố một bộ hằng cố định bảo đảm đúng cho mọi dữ liệu.
- Ngay cả nhãn bài đếm trong danh sách tham khảo có thể không nhất quán. Luôn đọc phát biểu thật để phân biệt có xét thứ tự với không xét thứ tự; không dùng nhãn danh sách làm định nghĩa bài toán.

## Khung biên tập

Mỗi bài mở bằng một tình huống và lý do cần phương pháp. **Tư duy** và **Nội dung học** có 3–5 ý riêng: phần đầu nói hoạt động suy luận, phần sau nói khái niệm/kỹ thuật được học. Sau đó là ví dụ tự viết, cách suy ra thuật toán, mã trọng tâm, giải thích vì sao đúng, chi phí và điều kiện biên. Kết bằng dạng bài thực hành, hai câu tự kiểm tra có đáp án mở khi bấm và **Nguồn tham khảo thêm** chỉ ghi tên/link.

Giải nghĩa ký hiệu trước khi dùng, kết nối câu với đoạn trước và chọn chủ ngữ rõ. Không lặp một khuôn “rèn tư duy/phát triển kỹ năng” mà không chỉ ra hành động. Không viết như thể học sinh đã giải được bài hoặc chắc chắn đạt kết quả thi. Dùng bảng/sơ đồ khi chúng giúp nhìn thấy quá trình, không trang trí mọi ý thành thẻ.

Code phải nhất quán với giả thiết, quy ước chỉ số, kiểu số và ví dụ; ngầm hiểu namespace std, không in khai báo hoặc tiền tố, viết đơn giản và không ghi phiên bản C++ trong bài đọc. Phần mã trọng tâm nêu header/biến cần có; không giả vờ là chương trình chạy độc lập khi chưa có `main` và nhập/xuất. Mã nguồn bên ngoài chỉ để đối chiếu, không chép cả lời giải/bài viết. Minh họa dùng bảng, sơ đồ hoặc truy vết có nội dung; fence `diagram` được gắn nhãn Sơ đồ thay vì Mã giả.

## Cấu trúc chuỗi đã duyệt

| Chủ đề | Số bài | Nội dung từng bài |
|---|---:|---|
| B09 | 4 | Modulo và phép tính → lũy thừa nhanh → đổi hệ cơ số → nhân bằng chia đôi/nhân đôi |
| C01 | 2 | Cộng dồn 1D → cộng dồn 2D |
| C07 | 3 | Đệ quy và điểm dừng → ghi nhớ kết quả → chia để trị/merge sort |
| C09 | 2 | N quân hậu và cắt nhánh → mã đi tuần, khôi phục trạng thái và cắt nhánh |
| C11 | 2 | Kiểm tra khả thi và đơn điệu → xây check, chọn cận và ứng dụng |
| D03 | 2 | Cái túi 0/1 → không giới hạn |
| D06 | 2 | LCS và truy vết → Edit Distance |
| D07 | 2 | Thiết kế trạng thái 2D → chia đoạn, điểm tách và thứ tự tính |
| Các mã còn lại | 1 mỗi mã | Giữ một bài cho một chủ đề; xem lại khi bản thảo quá dài hoặc có mô hình độc lập |

Tổng **54 bài cho 43 chủ đề**, đã biên soạn theo cấu trúc trên. Chia chuỗi phục vụ đọc chuyên sâu, không tự bổ sung chủ đề hoặc gán số buổi mới.

## Kiểm chứng nội dung và phần còn lại

Ví dụ được tự tính và đối chiếu bằng một cách độc lập: tổng trực tiếp cho cộng dồn 1D/2D, duyệt tuyến tính cho tìm kiếm nhị phân, liệt kê tập con cho cái túi 0/1 và liệt kê số lượng cho cái túi không giới hạn. Kiểm tra cả cận rỗng/đơn, vật vừa đủ/quá nặng, khả năng lấy lặp và dữ liệu âm của cộng dồn; những mô hình mới bổ sung có đối chiếu riêng trong từng nhóm nguồn.

Kiểm chứng số học/thuật toán độc lập bằng **Node.js 24** theo các nhóm nguồn: so tổng trực tiếp, tìm tuyến tính, liệt kê tập con hoặc số lượng; xử lý dãy rỗng/đơn, số âm của cộng dồn, phần tử trùng, sức chứa 0, vật quá nặng/vừa đủ và sự khác biệt lấy một lần/lấy lặp. Cấu trúc Markdown và mã/liên kết chuỗi được kiểm tra cho toàn thư viện. Kết quả chạy C++ và browser ghi ở [triển khai](PARENT_TOPICS.md); không dùng số assertion làm thước đo năng lực học sinh.

Compiler portable từ [Zig chính thức](https://ziglang.org/download/) nằm ngoài Git trong scratch, có kiểm tra checksum; không là dependency runtime hoặc CI. Khung kiểm chứng thêm header/`main` và dữ liệu đầu vào đúng ngữ cảnh cho các đoạn mã trọng tâm, không coi mọi fence là chương trình đầy đủ. Browser kiểm chứng riêng bảng, code, mục lục, dark/mobile/keyboard/no-JS/in và quyền đọc private. Không dùng dữ liệu phụ huynh thật cho QA.
