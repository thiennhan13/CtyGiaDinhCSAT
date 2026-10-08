# Nguồn biên soạn C07–C12 và D01–D07

Phạm vi: 20 bài cho 13 mã chuẩn, giữ tên chương trình công khai C và mã D nội bộ. Chuỗi nhiều bài không làm tăng số chủ đề hoặc số buổi. Metadata nằm trong `lib/parent-topic-catalog/cd.json`; nội dung tự biên soạn ở `content/parent-topics`. Không lấy nguyên văn, ví dụ hoặc mã nguồn từ tài liệu để chép vào bài.

## Tài liệu đã mở đọc và đối chiếu

| Nguồn | URL đã đọc | Bài dùng để đối chiếu |
|---|---|---|
| VNOI — Đệ quy và quay lui | https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md ; bản raw https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/backtracking.md | C07 đệ quy, C08 sinh cấu hình, C09 xếp hậu; mã đi tuần dùng nguyên tắc quay lui tự xây, không coi nguồn này là hướng dẫn riêng cho mã |
| VNOI — Sắp xếp | https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/sorting-new.md | C07 merge sort |
| VNOI — Tham lam | https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/greedy-new.md | C10 chọn hoạt động, C11 chia dãy |
| VNOI — QHĐ cơ bản 1 | https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md | D01, D03 0/1, D04, D05, D07 số lượng và tổng |
| VNOI — QHĐ cơ bản 2 | https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-2.md | D03 không giới hạn, D06; tư duy bài toán con trong D07 |
| USACO Guide — Complete Search | https://usaco.guide/bronze/intro-complete | C08/C09, giới hạn đầu ra và tìm kiếm đầy đủ |
| USACO Guide — Greedy | https://usaco.guide/bronze/intro-greedy | C10 |
| USACO Guide — Binary Search | https://usaco.guide/silver/binary-search | C11 hai bài |
| USACO Guide — Hashing | https://usaco.guide/gold/hashing | C12, hash đoạn và giới hạn va chạm |
| USACO Guide — String Matching | https://usaco.guide/problems/cses-1753-string-matching/solution | C12, ứng dụng lọc so sánh |
| USACO Guide — Introduction to DP | https://usaco.guide/gold/intro-dp | C07 có nhớ, D01/D02 và tư duy phụ thuộc |
| USACO Guide — Knapsack | https://usaco.guide/gold/knapsack | D03/D04/D07 hai chiều |
| USACO Guide — LIS | https://usaco.guide/gold/lis | D05, strict LIS và tails |
| USACO Guide — Range DP | https://usaco.guide/gold/dp-ranges | D07 chia đoạn |
| Viblo — Top-down và Bottom-up | https://viblo.asia/p/quy-hoach-dong-76-top-down-va-bottom-up-gwd43g0j4X9 | C07 có nhớ, D03, cách đặt trạng thái |
| Viblo — Tham lam | https://viblo.asia/p/tham-lam-greedy-method-6J3ZgaeP5mB | C10, tự kiểm chứng quy tắc |
| Viblo — QHĐ, một thuật toán thần thánh | https://viblo.asia/p/quy-hoach-dong-mot-thuat-toan-than-thanh-E375zy01lGW | D04/D06, đa dạng cách dẫn nhập |
| Viblo — Nhập môn QHĐ cơ bản | https://viblo.asia/p/nhap-mon-quy-hoach-dong-co-ban-XRJ8RlY9VGq | D05, trạng thái LIS kết thúc ở i |
| Viblo — Các khuôn mẫu QHĐ | https://viblo.asia/p/lam-chu-quy-hoach-dong-cac-khuon-mau-thuong-gap-phan-1-13VM905GVY7 | D03 không giới hạn và D06 khoảng cách chỉnh sửa |

USACO Guide là tài liệu do cộng đồng CP Initiative xây dựng, không gọi là giáo trình chính thức của ban tổ chức USACO. Các nguồn có độ sâu vượt phạm vi bài không được dùng để tự thêm đồ thị, cây hoặc kỹ thuật tối ưu mới vào chương trình.

Một số trang raw QHĐ được công cụ trả về nội dung ngắn hơn bản GitHub; đã dùng bản GitHub đầy đủ để đọc. URL USACO `gold/string-hashing` không đọc được và không dùng; URL đúng đã đọc là `gold/hashing`. VNOI binary-search không mở được ở lần tra cứu này; chỉ giữ làm liên kết đọc thêm cho C11, không ghi là nguồn đã đọc trong lượt này. Không dùng bài Viblo về hashing mật mã để giảng hash đa thức.

Đã đọc thêm [Viblo — Rabin–Karp](https://viblo.asia/p/rabinkarp-algorithm-bWrZnppY5xw), nhưng không đưa vào danh sách nguồn của bài C12: bài có phát biểu mã băm duy nhất cần điều kiện và đoạn Ruby có tên biến/điều kiện vòng lặp không nhất quán. C12 dùng USACO và kiểm chứng độc lập, giữ rõ giới hạn va chạm. Bài Viblo về khuôn mẫu QHĐ có một đoạn dẫn tối ưu bộ nhớ nói phụ thuộc chỉ hàng trước trong khi mô hình không giới hạn còn phụ thuộc cùng hàng; nội dung CSAT đã viết rõ hai loại phụ thuộc, không mang theo sự khái quát đó.

## Video đã xác minh liên kết

| Video | Cách xác minh | Vị trí bổ sung |
|---|---|---|
| [Computerphile — What on Earth is Recursion?](https://www.youtube.com/watch?v=Mv9NEXX1VHc) | Kết quả YouTube có đúng tên, kênh Computerphile và mô tả đệ quy; không tuyên bố đã xem toàn bộ video | C07 điểm dừng, cạnh bảng lời gọi |
| [Errichto — Fibonacci, iteration vs recursion](https://www.youtube.com/watch?v=YBSt1jYwVfU) | Theo liên kết chính trên USACO intro-dp, mở được trang cùng tiêu đề | C07 có nhớ và D01 |
| [Errichto — Coin change, double counting](https://www.youtube.com/watch?v=1mtvm2ubHCY) | Kết quả YouTube đúng tên/kênh, mô tả ba bài coin change; USACO knapsack cũng giới thiệu video này | D04 cạnh phần đếm tổ hợp |
| [Abdul Bari — 0/1 Knapsack Problem, Program](https://www.youtube.com/watch?v=zRza99HPvkQ) | Kết quả YouTube đúng tên, kênh Abdul Bari, mô tả chương trình 0/1 | D03 0/1 cạnh bảng phương án |

Video là liên kết bổ sung, không nhúng trình phát hoặc tải media. Minh họa tại chỗ vẫn có đủ bảng, ví dụ và code; học sinh không phải xem video để hiểu bài. Không gắn video không giới hạn hoặc mã đi tuần khi chưa xác minh được video chuyên đề phù hợp.

## Kiểm chứng và những điểm không được suy diễn

- Xếp hậu dùng mỗi hàng một quân; cận thô O(n·n!), không coi số nghiệm n! hay khẳng định O(n²).
- Mã đi tuần phân biệt heuristic thứ tự thử với cắt nhánh chắc chắn; không hứa giải mọi bàn cờ trong thời gian nhanh.
- Chia dãy dùng phần tử không âm; hàm sản xuất dùng thời gian máy dương, miền số đủ cho cận trên.
- Hash cùng mã không chứng minh cùng xâu; không khẳng định xác suất va chạm cố định 1/M.
- LIS tăng nghiêm ngặt dùng `<` và `lower_bound`; tails không phải đáp án truy vết.
- LCS cho phép bỏ kí tự giữa; Edit Distance nêu rõ ba thao tác chi phí 1.
- DP chia đoạn nêu giới hạn n/trọng lượng, cận tổng chi phí và kiểu số trước dùng INF.
- D03 bảo toàn hướng giảm/tăng theo mô hình, đã bỏ phiên bản ngôn ngữ và tiền tố namespace gây nhiễu trong code.

Kiểm tra độc lập bằng Node.js 24 đạt 621 assertion số học và đối chiếu vét cạn: gcd/Fibonacci, số nghiệm xếp hậu, 0/1 và không giới hạn, chọn đúng số phần tử, LIS nghiêm ngặt, LCS, khoảng cách chỉnh sửa, DP chia đoạn, khả thi chia dãy và hash đoạn. 150 bộ nhỏ dùng seed cố định đối chiếu mô hình 0/1, chọn đúng số phần tử, LIS và chia đoạn với vét cạn. Biên dịch C++ thật được phối hợp ở bước QA chung bằng compiler portable; không coi kiểm chứng Node là bằng chứng đã chạy các đoạn C++.
