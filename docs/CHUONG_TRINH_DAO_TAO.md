# Chương trình đào tạo CSAT

Bản tiếp nhận: 22/09/2026. Nguồn: `Danh sách kiến thức (1).xlsx` do trung tâm cung cấp. Danh mục máy đọc: `lib/learning-curriculum-20260922.json`.

## Phạm vi đã xác nhận

- Cơ bản gồm tầng A (9 chủ đề) và B (15 chủ đề). Mỗi lớp chọn A, B hoặc A+B; mặc định A+B. Chọn B không có nghĩa học sinh đã thành thạo A.
- Nâng cao là một khung thống nhất gồm đủ 12 chủ đề C và 7 chủ đề D; không có hai lựa chọn C/D và không thay đổi loại lớp Nâng cao.
- Khung mới không ấn định số buổi. Tên và diễn giải các chặng bên dưới tổ chức lại danh mục đã được duyệt, không bổ sung kiến thức hay cam kết đầu ra.
- Admin và gia sư đang phụ trách lớp có thể bỏ/khôi phục chặng hoặc chủ đề, giữ nguyên mã, thứ tự và nội dung chuẩn. Bản nháp chỉ hiển thị sau khi công bố.
- Trọng tâm, nhận xét và minh chứng phản ánh ghi nhận thực tế; danh mục kiến thức, điểm danh, cột Check, phân công soạn bài và chỉ tiêu bài không phải tiến độ hay năng lực học sinh.
- HSGQG chờ giáo án riêng được duyệt. Luyện thi tùy chỉnh không đồng nghĩa HSGQG.

## Định hướng phát triển trên cổng phụ huynh

Theo yêu cầu trung tâm ngày 22/09/2026:

| Chương trình | Định hướng hiện tại | Hướng phát triển |
|---|---|---|
| Cơ bản (A, B hoặc A+B) | HSG Tỉnh lớp 9 | Chuyên Tin; phối hợp nền tảng theo mục tiêu trường chuyên và bài làm thực tế |
| Nâng cao (C+D) | HSG Tỉnh cấp THPT | HSG Quốc gia; cần bổ sung chương trình riêng và duyệt trước khi công bố |

Phần này giải thích giá trị và hướng ứng dụng của khung kiến thức, không xác nhận học sinh đã đủ năng lực dự thi hoặc cam kết kết quả. Nội dung thực học vẫn theo lựa chọn của từng lớp. Khung C+D không được giới thiệu như toàn bộ giáo án HSGQG; lớp luyện thi tùy chỉnh không tự gắn nhãn HSGQG.

## Phân bố và nội dung

### CSAT · Cơ bản · A + B

#### Diễn đạt bài toán bằng chương trình

Làm quen với cách nhập, xử lý và xuất dữ liệu; diễn đạt các điều kiện và thao tác lặp bằng chương trình.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| A01 | Nhập môn: Môi trường và I/O | cin/cout, freopen |
| A02 | Nhập môn: Kiểu dữ liệu, ép kiểu và toán tử | Không ghi thêm trong nguồn |
| A03 | Nhập môn: Cấu trúc rẽ nhánh | if/else, switch |
| A04 | Nhập môn: Cấu trúc lặp | for, while, lồng nhau |

#### Biểu diễn và xử lý dữ liệu bằng mảng

Tổ chức dữ liệu thành dãy và bảng; luyện duyệt, thống kê và biến đổi dữ liệu.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| A05 | Nhập môn: Mảng 1 chiều - Cơ bản | duyệt, max/min, đếm |
| A06 | Nhập môn: Mảng 1 chiều - Thao tác | đảo, chèn, xoá |
| A07 | Nhập môn: Mảng 2 chiều | ma trận, duyệt đường chéo, xoay |

#### Tổ chức chương trình và xử lý văn bản

Chia chương trình thành hàm và làm quen với biểu diễn, xử lý xâu ký tự.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| A08 | Nhập môn: Hàm | tham trị, tham chiếu, phạm vi biến |
| A09 | Nhập môn: Xâu ký tự cơ bản | ASCII, getline, hàm thư viện string, xử lý xâu đơn giản |

#### Duyệt phương án và thống kê

Tìm lời giải bằng cách xét các phương án và tổ chức dữ liệu đếm.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| B01 | Cơ bản: Vét cạn | duyệt tổ hợp, đếm có điều kiện |
| B02 | Mảng thống kê | Không ghi thêm trong nguồn |

#### Khai thác tính chất số học

Vận dụng tính chất của số, ước và số nguyên tố để xây dựng cách giải.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| B03 | Cơ bản: Số chính phương | Không ghi thêm trong nguồn |
| B04 | Số học: Kiểm tra số nguyên tố và đếm ước | O(√n) |
| B05 | Số học: Sàng nguyên tố Eratosthenes | Không ghi thêm trong nguồn |
| B06 | Số học: Thuật toán Euclid | ƯCLN, BCNN |
| B07 | Số học: Phân tích thừa số nguyên tố | Không ghi thêm trong nguồn |
| B08 | Số học: Công thức Legendre | Bậc của số nguyên tố trong N! |
| B09 | Số học: Modulo, luỹ thừa nhanh, đổi hệ cơ số, Nhân ấn độ | Không ghi thêm trong nguồn |

#### Tổ chức dữ liệu và sắp xếp

Lựa chọn cách lưu trữ và sắp xếp để thuận tiện truy cập, xử lý dữ liệu.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| B10 | CTDL: Vector cơ bản | Không ghi thêm trong nguồn |
| B11 | CTDL: Pair, Struct cơ bản | Không ghi thêm trong nguồn |
| B12 | CTDL: Map cơ bản | Không ghi thêm trong nguồn |
| B13 | Sắp xếp: Thuật toán cơ bản & hàm sort() | + comparator |

#### Tìm kiếm và xử lý xâu

Làm quen tìm kiếm trên dữ liệu đã sắp xếp và các bài toán xử lý xâu.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| B14 | Chặt nhị phân: Vòng 1 | trên mảng đã sắp, lower/upper_bound |
| B15 | Xử lý xâu : Nâng cao | tách từ và chuẩn hoá, Palindrome và đối xứng (kiểm tra, tìm, đếm) |

### CSAT · Nâng cao

#### Tiền xử lý và kỹ thuật trên mảng

Tổ chức phép tính trên dãy và bảng; khai thác quan hệ giữa các đoạn dữ liệu.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| C01 | Kỹ thuật mảng: Mảng cộng dồn | 1D & 2D |
| C02 | Kỹ thuật mảng: Mảng hiệu | Difference array |
| C03 | Kỹ thuật mảng: Hai con trỏ, cửa sổ trượt | Không ghi thêm trong nguồn |

#### Lựa chọn cấu trúc dữ liệu

Tìm hiểu các cấu trúc dữ liệu phục vụ lưu trữ, truy cập và xử lý theo thứ tự phù hợp.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| C04 | Cấu trúc dữ liệu: Tuyến tính | vector, pair, unique |
| C05 | Cấu trúc dữ liệu: Cây & Băm | set, map, mảng đếm |
| C06 | Cấu trúc dữ liệu: Hàng đợi & Ngăn xếp | queue, deque, stack |

#### Đệ quy, chia để trị và quay lui

Phân rã bài toán, sinh phương án và kiểm soát không gian tìm kiếm.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| C07 | Đệ quy & Chia để trị | đệ quy có nhớ, merge sort |
| C08 | Quay lui: Sinh tổ hợp | nhị phân, hoán vị, xâu |
| C09 | Quay lui: Mô hình | N quân hậu, mã đi tuần, cắt nhánh |

#### Tham lam, tìm kiếm trên đáp án và băm

Tiếp cận bài toán bằng lựa chọn tham lam, kiểm tra đáp án và biểu diễn xâu bằng băm.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| C10 | Tham lam | chọn hoạt động, đổi tiền, xếp lịch |
| C11 | Chặt nhị phân: Vòng 2 | chặt trên đáp án, hàm check |
| C12 | Xử lý xâu: Thuật toán Hashing | Không ghi thêm trong nguồn |

#### Xây dựng trạng thái quy hoạch động

Mô tả trạng thái và liên hệ giữa các bài toán con qua các mô hình quy hoạch động.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| D01 | QHĐ: Nhập môn | leo bậc thang, tam giác số, Kadane |
| D02 | QHĐ: Trên lưới | đường đi lớn nhất, đếm cách đi |
| D03 | QHĐ: Cái túi | Knapsack 0/1, không giới hạn số lượng |
| D04 | QHĐ: Chia tập | đổi tiền, chia kẹo |

#### Quy hoạch động trên dãy, xâu và mở rộng

Tiếp tục vận dụng quy hoạch động trên dãy, xâu và các trạng thái mở rộng.

| Mã | Chủ đề nguồn | Nội dung chi tiết nguồn |
|---|---|---|
| D05 | QHĐ: LIS | dãy con tăng dài nhất, truy vết |
| D06 | QHĐ: LCS & Xâu | xâu con chung dài nhất, Edit Distance |
| D07 | QHĐ: Mở rộng | trạng thái 2 chiều, chia đoạn |

## Sử dụng và bảo toàn lịch sử

Khung 30/35 buổi và các phiên bản cũ được lưu để đọc lịch sử, không còn là khung mặc định. Không sửa migration hay giáo án cũ. Migration mới đổi tham chiếu của mọi lớp Cơ bản/Nâng cao (kể cả ngừng hoạt động), giữ nội dung riêng, lưu bản trước chuyển đổi và không công bố bản nháp. Chặng đang tập trung cần được xác nhận lại do cấu trúc mới khác cấu trúc cũ. Nhận xét, buổi học, điểm danh, thanh toán và kỳ đã chốt không bị sửa.

Phụ huynh đọc thông tin học sinh, nhận xét tháng đã công bố, lộ trình, buổi học, kết quả OJ khi có kết nối, gia sư và học phí. Số bài giải và thứ hạng hiện để trống; không dùng số liệu minh họa như dữ liệu thật.
