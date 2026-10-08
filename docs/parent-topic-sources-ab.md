# Nguồn và biên soạn nhóm A01–A09, B01–B08

## Phạm vi bàn giao

Đã biên soạn 17 bài riêng, mỗi mã chuẩn một bài, trong `content/parent-topics/`; A04 được viết lại theo văn phong mới. Metadata gồm `slug`, `topicCode`, `order`, `title`, `excerpt` trong `lib/parent-topic-catalog/ab.json`. Không đổi danh mục 43 chủ đề, không tạo bài hoặc số buổi ngoài khung. Nội dung là giải thích chung cho thư viện private phụ huynh, không chứa hồ sơ học sinh hoặc kết luận năng lực.

Mỗi bài có Tư duy/Nội dung học 3–5 ý, tình huống, ví dụ tự tính, bảng/sơ đồ, mã trọng tâm, lý do đúng, chi phí, biên và luyện tập. Mục **Tự kiểm tra** chứa đúng hai blockquote hỏi/đáp để renderer tạo disclosure. Cuối bài **Nguồn tham khảo thêm** chỉ liệt kê tên và đường dẫn. Không YAML/H1/HTML raw, không nêu phiên bản ngôn ngữ trong bài, không `std::` hoặc ép kiểu dài không cần thiết. Sơ đồ dùng fence `diagram`; đoạn kết quả dùng `text`.

## Tài liệu đã đọc theo nhóm

Các mục “đã đọc” dưới đây đều mở được nội dung liên quan, không tính một snippet tìm kiếm là đã nghiên cứu cả bài. Không coi nguồn chính chủ là miễn kiểm chứng; ví dụ, giả thiết và mã CSAT được tự viết.

| Nhóm | Tài liệu thực đã đọc | Phần dùng / giới hạn |
|---|---|---|
| A01 | [USACO Guide — Input & Output](https://usaco.guide/general/input-output) | Đã đọc luồng chuẩn, cin/cout, freopen và đầu ra; không lấy bài minh họa của nguồn làm bài CSAT |
| A01–A04, A08 | [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/) | Đã đọc quy trình biên dịch, biến, kiểu, điều kiện, vòng lặp, hàm; không đưa thư viện CS50 hoặc cú pháp C vào mã minh họa |
| A02, A05–A09, B02 | [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/) | Đã đọc mảng, ký tự/xâu, theo dõi lỗi và kiểu số; giữ giới hạn ASCII rõ khi diễn giải xâu |
| A05–A07, A09, B02 | [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds) | Đã đọc mảng, duyệt, chèn/xóa, xâu và chi phí; bài A dùng mảng trực tiếp để không mở giáo án vector ngoài phạm vi |
| B01 | [USACO Guide — Basic Complete Search](https://usaco.guide/bronze/intro-complete) | Đã đọc cách sinh cặp, tránh tự ghép/đếm trùng và ước lượng công việc |
| A04, B01 | [VNOI — Độ phức tạp tính toán](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/computational-complexity.md) | Đã đọc cận vòng lặp, thao tác lồng nhau và đánh giá giới hạn; không gán một số phép tính thành chuẩn thời gian cho mọi máy |
| B03/B04/B07 | [VNOI — Số các ước và tổng các ước](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/divisors.md) | Đã đọc ghép cặp ở căn, căn nguyên và công thức số ước qua số mũ; không đưa phương pháp bậc ba/Rabin–Miller vào B04 |
| B04/B07 | [VNOI — Kiểm tra số nguyên tố](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/primality_check.md) | Đã đọc thử chia đến căn và phân tích bằng thử chia. Raw URL cache miss; bản GitHub chính chủ đọc được. Không dùng phép thử xác suất trong nhóm bài này |
| B05 | [VNOI — Sàng nguyên tố](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/prime_sieve.md) | Đã đọc Eratosthenes, mốc bình phương, cận căn, chi phí. Raw/wiki không trả nội dung qua công cụ; bản GitHub đọc được. Các cải tiến khác không đưa vào giáo án |
| B06 | [VNOI — Thuật toán Euclid](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/euclid.md) | Đã đọc ƯCLN, bảo toàn tập ước, số 0, chi phí và BCNN chia trước. Không mở rộng sang Diophantus/Euclid mở rộng |
| B04–B07 | [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility) | Đã đọc phân tích, đếm ước, ƯCLN/BCNN, cảnh báo tràn. Nhãn Gold không gán thành trình độ học sinh; phi hàm ngoài phạm vi |
| B08 | [VNOI — Giai thừa modulo p](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/factorial-modulo-prime.md) | Đã đọc mục Legendre và chứng minh từng lớp bội; phần giai thừa modulo chuyên sâu không trở thành nội dung B08 |
| B04/B05/B07 | [Viblo Algorithm — Số nguyên tố và các vấn đề liên quan](https://viblo.asia/p/so-nguyen-to-va-cac-van-de-lien-quan-ORNZqnx8l0n) | Đã đọc thử chia, sàng, phân tích và đếm ước; chỉ lấy ý tưởng sau đối chiếu VNOI/USACO, không sao chép mã |
| B08 | [Viblo Algorithm — Công thức toán học và tính chất số học đặc biệt, phần 1](https://viblo.asia/p/cong-thuc-toan-hoc-va-tinh-chat-so-hoc-dac-biet-phan-1-gAm5y7gkZdb) | Đã đọc mục Legendre, hợp số và số 0 cuối; công thức hợp số và mã của nguồn có sai khác, giữ đối chiếu riêng |
| A03 | [Microsoft Learn — switch statement](https://learn.microsoft.com/en-us/cpp/cpp/switch-statement-cpp?view=msvc-170) | Đã đọc điều kiện chọn, case/default, tiếp tục qua nhánh và break; chỉ đối chiếu ngôn ngữ |
| A08 | [Microsoft Learn — References](https://learn.microsoft.com/en-us/cpp/cpp/references-cpp?view=msvc-170) và [Reference-Type Function Arguments](https://learn.microsoft.com/en-us/cpp/cpp/reference-type-function-arguments?view=msvc-170) | Đã đọc tham chiếu, đối số có thể thay đổi và const; không đưa rvalue/pointer vào bài nhập môn |
| A09 | [Microsoft Learn — basic_string](https://learn.microsoft.com/en-us/cpp/standard-library/basic-string-class?view=msvc-170) | Đã đọc định nghĩa, size, find/npos, substr/count; không tuyên bố đã đọc toàn bộ mọi hàm trong tài liệu |
| B03 | [Microsoft Learn — sqrt, sqrtf, sqrtl](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/sqrt-sqrtf-sqrtl?view=msvc-170) | Đã đọc kiểu đối số/kết quả, header, miền không âm; điều chỉnh ứng viên bằng số nguyên là mã tự viết |

Microsoft Learn chỉ hỗ trợ kiểm tra cú pháp/hợp đồng thư viện. VNOI dẫn cách lập luận, USACO/Viblo đối chiếu thuật toán, CS50 giúp cách giải thích nhập môn. Không dùng phần quản trị web, mật mã, tối ưu compiler hoặc kỹ thuật ngoài khung chỉ vì tìm thấy trong nguồn.

## Video đã xác minh

| Bài | Tên, kênh và ID thật | Bằng chứng / cách dùng |
|---|---|---|
| A04 | [CS50 Shorts — Loops](https://www.youtube.com/watch?v=WgX8e_O7eG8), CS50, `WgX8e_O7eG8` | Trang [CS50 Loops](https://cs50.harvard.edu/x/shorts/loops/) liên kết chính xác ID; đã kiểm tra tên/kênh qua kết quả video. Đặt gần bảng truy vết vòng lặp |
| A08 | [CS50 Shorts — Functions](https://www.youtube.com/watch?v=n1glFqt3g38), CS50, `n1glFqt3g38` | Trang [CS50 Functions](https://cs50.harvard.edu/x/shorts/functions/) liên kết chính xác ID. Dùng quan sát đầu vào/kết quả của hàm, không gọi đó là video dạy tham chiếu C++ |
| B05 | [Sieve of Eratosthenes — Khan Academy](https://www.youtube.com/watch?v=klcIklsWzrY), Khan Academy Labs, `klcIklsWzrY` | Kết quả YouTube được lập chỉ mục xác nhận tên/kênh/ID; mở trang video trực tiếp lỗi fetch. Đặt gợi ý quan sát loại bội; không ghi đã xem toàn video hoặc kiểm định transcript |

Video là liên kết bổ sung có ngôn ngữ nguồn, không thay bảng/sơ đồ tiếng Việt tự biên soạn. Không thêm ID suy đoán. Chưa chọn video Legendre/Euclid mới nếu chưa xác minh đủ mức phù hợp; giữ bảng lớp bội và truy vết để bài đọc tự đủ thông tin.

## Sai khác của nguồn cần tránh

- Bài Viblo nguyên tố có chỗ dùng `N` thay biến `n`, và đoạn phân tích cải tiến ghi `i` sau phạm vi vòng thay vì phần còn lại `n`. Không lấy các đoạn đó làm mã đã chạy.
- Mục hợp số của bài Viblo Legendre nêu lấy nhỏ nhất trong lý thuyết nhưng mã dùng `max`, thiếu xử lý thừa số còn lại và có tên hàm sai. B08 chỉ dùng công thức cho nguyên tố, rồi tự giải thích trường hợp 4 qua số mũ của 2.
- Một số nguồn ghi cận sàng `O(N log N)`; đó có thể là cận rộng hoặc cách đếm khác. B05 dùng Eratosthenes chỉ đánh dấu theo nguyên tố và nêu cận `O(N log log N)` đã đối chiếu VNOI.
- Không sao chép `sqrt(n + 4)` hoặc bình phương ứng viên mà bỏ điều kiện tràn. B03 loại âm/0 trước, sửa căn bằng phép chia và chỉ nhân sau khi đã biết bình phương không vượt `n`.
- Tham chiếu không mặc nhiên chỉ để tiết kiệm: tác động sửa đầu vào cần thể hiện trong nhiệm vụ hàm. Xâu ASCII không tự mở rộng thành xử lý tiếng Việt UTF-8 theo từng ký tự nhìn thấy.

## Kiểm chứng và giới hạn

Ví dụ, bảng và hai câu tự kiểm tra đều được biên soạn độc lập. Kiểm tra local dùng Node 24 cho mô hình tham khảo: so thao tác đảo/chèn/xóa với cách dựng dãy mới, xoay bằng phép đối chiếu tọa độ, vét cạn cặp với tập cặp, tần suất với bộ đếm độc lập, nguyên tố/ước với duyệt thẳng, sàng với thử chia, Euclid với danh sách ước chung, phân tích với tích và công thức số ước, Legendre với đếm thừa số từng số. Kiểm tra căn lớn cần số nguyên chính xác, không dùng Number để xác nhận các số vượt miền nguyên chính xác của JavaScript.

**Kết quả local:** Node.js 24.19.0, 40.088 assertion đạt cho 17 metadata/bài và 31 khối mã. Các nhóm gồm phép tính ví dụ, mảng đảo/chèn/xóa, xoay bảng và quay lại sau bốn lần, cặp/tần suất, nguyên tố/ước/sàng, Euclid, phân tích và Legendre. Kiểm tra căn bằng BigInt với bình phương lớn và hai số sát nó, gồm `3037000499² ± 1` và số nguyên có dấu 64 bit lớn nhất; không dùng Number làm kết quả chuẩn cho các ca này.

Markdown đạt: metadata đủ trường/mã duy nhất, Tư duy/Nội dung học 3–5 ý, đúng hai blockquote hỏi/đáp, có bảng/sơ đồ, code fence cân bằng, không H1/frontmatter, `std::`, ép kiểu dài hoặc nhắc phiên bản trong bài. Số assertion là bằng chứng kiểm tra nội dung cụ thể, không đo chất lượng sư phạm hoặc mức thành thạo của học sinh.

Bộ mô hình JavaScript không thay việc biên dịch mã C++; nhóm tích hợp kiểm tra compiler portable và wrapper theo đúng header/biến đã giải thích riêng. Không đọc hay ghi production, không commit hoặc phát hành trong phạm vi biên soạn này.
