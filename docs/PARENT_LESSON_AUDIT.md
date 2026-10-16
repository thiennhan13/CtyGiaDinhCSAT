# Đối chiếu nội dung chuyên đề phụ huynh

## Phạm vi và mức kiểm chứng

Đối chiếu local ngày **16/10/2026**: **54 bài / 43 mã**, giữ nguyên chương trình, số bài, thứ tự series và tên lớp lịch sử. Nâng cao hiển thị C; mã C01–D07 vẫn giữ. PDF là nguồn tham khảo, không thay chương trình đã duyệt.

- **K**: kiểm cấu trúc/phạm vi với catalog và khung chuẩn; có Luyện tập, hai câu tự kiểm tra và đáp án; không có bài mồ côi. Không đồng nghĩa đọc phản biện toàn bộ sách hoặc chứng minh mọi code.
- **T**: đối chiếu kỹ thuật có trọng tâm về giả thiết, chỉ số, tràn số, phản ví dụ và nội dung bổ sung. Mỗi hàng ghi rõ phần PDF trực tiếp, liên quan hoặc chưa có nguồn tương ứng.
- Code giữ nguyên trong đợt này. Khung kiểm thử dùng code trích trực tiếp; kết quả biên dịch và kiểm tra độc lập ghi tại [trạng thái dự án](PROJECT_STATUS.md). Khung bọc đoạn rời không biến chúng thành chương trình nộp hoàn chỉnh.
- Mọi bài vẫn giữ nguồn tham khảo sẵn có ở cuối bài; không thêm trích dẫn dài hoặc sao chép lời giải từ PDF.

## Nguồn đối chiếu

1. [Khung chuẩn](../lib/learning-curriculum-20260922.json): mã, phạm vi và mô tả đã duyệt; catalog [AB](../lib/parent-topic-catalog/ab.json), [BC](../lib/parent-topic-catalog/bc.json), [CD](../lib/parent-topic-catalog/cd.json).
2. Roadmap tham khảo local `D:/Cty_gia_đình_CSAT/csat-roadmap/src/roadmap.json`: so 43 mã/tag, không dùng thứ tự đồ thị làm điều kiện lên chặng. [Mapping](../lib/knowledge-map-links.json) giữ nguyên ID.
3. `F:/Căn-bản-lập-trình-thi-đấu.pdf`, 280 trang; số trang dưới đây là số trang trong trình xem PDF. Đã đọc phần liên quan và xem bản render mẫu; không tuyên bố kiểm định toàn bộ sách.
4. CSATOJ: GET đủ 43 URL lúc `2026-10-16T02:48:31Z`, HTTP 200, URL đích không đổi, tag được chọn và tên có đúng mã. Báo cáo nội bộ `scratch/content-roadmap-research/practice-links-report.json`. Chỉ xác minh đích tag, chưa giải/nộp hoặc nghiệm thu chất lượng từng bài OJ.

## Bảng 54 bài

Mỗi hàng đối chiếu đúng mã với khung chuẩn và roadmap. Nút OJ dẫn **bài tập cùng chủ đề**, cả series dùng chung tag; không phải bộ bài riêng cho từng bài đọc. Không còn mapping chưa xác minh trong 43 mã hiện tại; mã lạ không có nút.

| Mã · bài/series | Nội dung đã đủ / sửa trọng tâm | PDF (trang, mức liên quan) | Mức | CSATOJ |
|---|---|---|---|---|
| A01 · 1/1 [Môi trường lập trình và nhập xuất dữ liệu](../content/parent-topics/a01-moi-truong-nhap-xuat.md) | Đủ nhập/chạy/xuất; thêm cách nộp OJ, không in lời nhắc và không coi mẫu là toàn bộ test. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K + T | [tag 54](https://csatoj.vn/problems/?tag=54&point_start=&point_end=) |
| A02 · 1/1 [Kiểu dữ liệu, ép kiểu và toán tử](../content/parent-topics/a02-kieu-du-lieu-toan-tu.md) | Giữ ép kiểu trước phép nhân, chia nguyên và miền trung gian. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 55](https://csatoj.vn/problems/?tag=55&point_start=&point_end=) |
| A03 · 1/1 [Cấu trúc rẽ nhánh: lựa chọn theo điều kiện](../content/parent-topics/a03-cau-truc-re-nhanh.md) | Giữ thứ tự nhánh, điều kiện phủ đủ và ca sát ngưỡng. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 56](https://csatoj.vn/problems/?tag=56&point_start=&point_end=) |
| A04 · 1/1 [Cấu trúc lặp: điều khiển những thao tác lặp lại](../content/parent-topics/a04-cau-truc-lap.md) | Đủ vòng lặp/chi phí; thêm trace n=3 và n=0, vị trí khởi tạo tổng. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K + T | [tag 57](https://csatoj.vn/problems/?tag=57&point_start=&point_end=) |
| A05 · 1/1 [Mảng một chiều: duyệt và thống kê dữ liệu](../content/parent-topics/a05-mang-mot-chieu.md) | Giữ phân biệt giá trị/chỉ số và khởi tạo cực trị. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 58](https://csatoj.vn/problems/?tag=58&point_start=&point_end=) |
| A06 · 1/1 [Đảo, chèn và xóa phần tử trong mảng](../content/parent-topics/a06-dao-chen-xoa-mang.md) | Giữ hướng dịch, độ dài/sức chứa và ca biên. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 59](https://csatoj.vn/problems/?tag=59&point_start=&point_end=) |
| A07 · 1/1 [Mảng hai chiều: hàng, cột, đường chéo và phép xoay](../content/parent-topics/a07-mang-hai-chieu.md) | Giữ tọa độ và bảng chữ nhật; không suy từ riêng ma trận vuông. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 60](https://csatoj.vn/problems/?tag=60&point_start=&point_end=) |
| A08 · 1/1 [Hàm: tham trị, tham chiếu và phạm vi biến](../content/parent-topics/a08-ham-tham-tri-tham-chieu.md) | Giữ tham trị/tham chiếu, phạm vi và tác động nơi gọi. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 61](https://csatoj.vn/problems/?tag=61&point_start=&point_end=) |
| A09 · 1/1 [Xâu ký tự cơ bản: đọc và xử lý văn bản](../content/parent-topics/a09-xau-ky-tu-co-ban.md) | Giữ getline/đọc từ, chỉ số và giả thiết ASCII. | Chưa xác định mục nhập môn tương ứng; giữ giáo án hiện có | K | [tag 62](https://csatoj.vn/problems/?tag=62&point_start=&point_end=) |
| B01 · 1/1 [Vét cạn: duyệt đủ phương án, đếm đúng điều kiện](../content/parent-topics/b01-vet-can-phuong-an.md) | Giữ duyệt chỉ số không trùng và giới hạn số phương án. | 135–136 (liên quan: duyệt cặp rồi tối ưu) | K | [tag 63](https://csatoj.vn/problems/?tag=63&point_start=&point_end=) |
| B02 · 1/1 [Mảng thống kê: đếm theo giá trị](../content/parent-topics/b02-mang-thong-ke.md) | Giữ miền giá trị nhỏ và hòa tần suất. | 205–207 (trực tiếp: tần suất) | K | [tag 95](https://csatoj.vn/problems/?tag=95&point_start=&point_end=) |
| B03 · 1/1 [Số chính phương: tìm căn nguyên và kiểm tra chính xác](../content/parent-topics/b03-so-chinh-phuong.md) | Giữ căn nguyên, số 0 và tránh tràn bình phương. | 189 (liên quan: tìm căn bằng nhị phân) | K | [tag 94](https://csatoj.vn/problems/?tag=94&point_start=&point_end=) |
| B04 · 1/1 [Kiểm tra nguyên tố và đếm ước theo cặp](../content/parent-topics/b04-nguyen-to-dem-uoc.md) | Giữ n<2, ước cặp và tránh đếm đôi số chính phương. | 16–17, 23–24 (nguyên tố, công thức số ước) | K | [tag 64](https://csatoj.vn/problems/?tag=64&point_start=&point_end=) |
| B05 · 1/1 [Sàng Eratosthenes: chuẩn bị bảng số nguyên tố](../content/parent-topics/b05-sang-nguyen-to.md) | Giữ mốc p*p, cận căn và vùng nhớ. | 17–18 (trực tiếp: sàng) | K | [tag 65](https://csatoj.vn/problems/?tag=65&point_start=&point_end=) |
| B06 · 1/1 [Thuật toán Euclid: ước chung và bội chung](../content/parent-topics/b06-euclid-ucln-bcnn.md) | Giữ gcd với 0, chia trước nhân khi tính lcm; vẫn cần cận tích. | 19 (liên quan: Euclid mở rộng) | K | [tag 66](https://csatoj.vn/problems/?tag=66&point_start=&point_end=) |
| B07 · 1/1 [Phân tích thừa số nguyên tố: đọc cấu trúc của một số](../content/parent-topics/b07-phan-tich-thua-so-nguyen-to.md) | Giữ phần nguyên tố còn lại và số mũ. | 23–24 (trực tiếp: phân tích số và số ước) | K | [tag 67](https://csatoj.vn/problems/?tag=67&point_start=&point_end=) |
| B08 · 1/1 [Công thức Legendre: đếm nguyên tố trong giai thừa](../content/parent-topics/b08-cong-thuc-legendre.md) | Giữ chia liên tiếp thay tính p^k/giai thừa; kiểm n<p. | Không có phần Legendre trực tiếp; không dùng mục tổ hợp tr.21 thay thế | K | [tag 68](https://csatoj.vn/problems/?tag=68&point_start=&point_end=) |
| B09 · 1/4 [Modulo: giữ lại thông tin về số dư](../content/parent-topics/b09-modulo.md) | Giữ modulo dương, số âm, m=1, số mũ 0 và kiểm tràn trước lấy dư. | 18–19 (trực tiếp với lũy thừa modulo; không đủ cho cả series) | K + T | [tag 69](https://csatoj.vn/problems/?tag=69&point_start=&point_end=) |
| B09 · 2/4 [Lũy thừa nhanh: bình phương và nhân](../content/parent-topics/b09-luy-thua-nhanh.md) | Giữ modulo dương, số âm, m=1, số mũ 0 và kiểm tràn trước lấy dư. | 18–19 (trực tiếp với lũy thừa modulo; không đủ cho cả series) | K + T | [tag 69](https://csatoj.vn/problems/?tag=69&point_start=&point_end=) |
| B09 · 3/4 [Đổi hệ cơ số: giá trị và cách biểu diễn](../content/parent-topics/b09-doi-he-co-so.md) | Giữ modulo dương, số âm, m=1, số mũ 0 và kiểm tràn trước lấy dư. | Chưa xác định phần đổi hệ cơ số trực tiếp | K + T | [tag 69](https://csatoj.vn/problems/?tag=69&point_start=&point_end=) |
| B09 · 4/4 [Nhân bằng chia đôi và nhân đôi](../content/parent-topics/b09-nhan-chia-doi.md) | Giữ modulo dương, số âm, m=1, số mũ 0 và kiểm tràn trước lấy dư. | 18–19 chỉ nêu lũy thừa modulo; nhân tránh tràn là bổ sung của bài hiện có | K + T | [tag 69](https://csatoj.vn/problems/?tag=69&point_start=&point_end=) |
| B10 · 1/1 [Vector: tổ chức một dãy có thể thay đổi](../content/parent-topics/b10-vector.md) | Giữ size/capacity và chi phí thao tác. | Chưa xác định mục trực tiếp về API vector | K | [tag 70](https://csatoj.vn/problems/?tag=70&point_start=&point_end=) |
| B11 · 1/1 [Pair và struct: giữ thông tin trong cùng bản ghi](../content/parent-topics/b11-pair-struct.md) | Giữ trường dữ liệu và vị trí gốc. | Chưa xác định mục trực tiếp về pair/struct | K | [tag 71](https://csatoj.vn/problems/?tag=71&point_start=&point_end=) |
| B12 · 1/1 [Map: tìm và thống kê theo khóa](../content/parent-topics/b12-map.md) | Giữ find so với operator[] có thể thêm khóa. | 205–207, 217–219 (ứng dụng tần suất; không đồng nhất map với hash map) | K | [tag 72](https://csatoj.vn/problems/?tag=72&point_start=&point_end=) |
| B13 · 1/1 [Sắp xếp và comparator: xây một thứ tự rõ ràng](../content/parent-topics/b13-sap-xep-comparator.md) | Giữ thứ tự yếu nghiêm ngặt; không dùng <= trong comparator. | 222–224 (liên quan: merge sort, không thay điều kiện comparator) | K | [tag 73](https://csatoj.vn/problems/?tag=73&point_start=&point_end=) |
| B14 · 1/1 [Tìm kiếm nhị phân trên dãy đã sắp xếp](../content/parent-topics/b14-tim-kiem-nhi-phan.md) | Giữ dãy có thứ tự; thêm bảng lower/upper và cận n không được đọc. | 188–189, 220–222 (trực tiếp: cận và nhị phân) | K + T | [tag 74](https://csatoj.vn/problems/?tag=74&point_start=&point_end=) |
| B15 · 1/1 [Xử lý xâu: chuẩn hóa và khám phá đối xứng](../content/parent-topics/b15-xu-ly-xau.md) | Giữ phân biệt dãy con/đoạn liên tiếp và tâm chẵn/lẻ. | 143–144 (cửa sổ xâu); tr.99 là dãy con palindrome, không phải đoạn palindrome | K | [tag 75](https://csatoj.vn/problems/?tag=75&point_start=&point_end=) |
| C01 · 1/2 [Mảng cộng dồn một chiều: tính tổng đoạn](../content/parent-topics/c01-cong-don-mot-chieu.md) | Giữ mốc 0, chỉ số 1-based và phép cộng trừ vùng. Thêm bộ số âm, đối chiếu đủ sáu đoạn. | 217–219 (trực tiếp: tổng tiền tố 1D) | K + T | [tag 76](https://csatoj.vn/problems/?tag=76&point_start=&point_end=) |
| C01 · 2/2 [Mảng cộng dồn hai chiều: tính tổng hình chữ nhật](../content/parent-topics/c01-cong-don-hai-chieu.md) | Giữ mốc 0, chỉ số 1-based và phép cộng trừ vùng. | Chưa xác định phần cộng dồn 2D trực tiếp; tr.251+ là segment tree ngoài khung | K + T | [tag 76](https://csatoj.vn/problems/?tag=76&point_start=&point_end=) |
| C02 · 1/1 [Mảng hiệu: ghi thay đổi tại hai ranh giới](../content/parent-topics/c02-mang-hieu.md) | Giữ ô đệm r+1; thêm cập nhật âm, một phần tử và kết thúc tại n. | Chưa xác định mục mảng hiệu trực tiếp | K + T | [tag 77](https://csatoj.vn/problems/?tag=77&point_start=&point_end=) |
| C03 · 1/1 [Hai con trỏ và cửa sổ trượt](../content/parent-topics/c03-hai-con-tro-cua-so.md) | Giữ giả thiết không âm và bất biến cửa sổ; thêm phản ví dụ đếm đoạn có số 0. | 135–153 (trực tiếp: hai con trỏ/cửa sổ; lưu ý số 0 tại tr.150) | K + T | [tag 78](https://csatoj.vn/problems/?tag=78&point_start=&point_end=) |
| C04 · 1/1 [Dữ liệu tuyến tính: vector, pair và unique](../content/parent-topics/c04-vector-pair-unique.md) | Giữ sort trước unique khi cần loại trùng toàn dãy; erase phần đuôi. | 138–139, 215 (liên quan: loại trùng; không thay hợp đồng unique) | K | [tag 79](https://csatoj.vn/problems/?tag=79&point_start=&point_end=) |
| C05 · 1/1 [Set, map và mảng đếm: chọn cách tổ chức khóa](../content/parent-topics/c05-set-map-mang-dem.md) | Giữ chi phí theo miền khóa và thứ tự; không coi mọi truy vấn là O(1). | 205–207, 217–219 (liên quan: thống kê theo khóa) | K | [tag 80](https://csatoj.vn/problems/?tag=80&point_start=&point_end=) |
| C06 · 1/1 [Hàng đợi, ngăn xếp và hàng đợi hai đầu](../content/parent-topics/c06-queue-deque-stack.md) | Giữ FIFO/LIFO, kiểm rỗng và thao tác hai đầu. | Chưa dùng phần đồ thị ngoài khung để bổ sung queue/stack | K | [tag 81](https://csatoj.vn/problems/?tag=81&point_start=&point_end=) |
| C07 · 1/3 [Đệ quy: thu nhỏ bài toán và xác định điểm dừng](../content/parent-topics/c07-de-quy-va-diem-dung.md) | Giữ cơ sở, bài toán nhỏ hơn, trạng thái nhớ và chi phí mỗi tầng. | 87–88 (liên quan: đệ quy Fibonacci) | K | [tag 82](https://csatoj.vn/problems/?tag=82&point_start=&point_end=) |
| C07 · 2/3 [Đệ quy có nhớ: một trạng thái chỉ cần giải một lần](../content/parent-topics/c07-de-quy-co-nho.md) | Giữ cơ sở, bài toán nhỏ hơn, trạng thái nhớ và chi phí mỗi tầng. | 87–88 (trực tiếp: lưu trạng thái Fibonacci) | K | [tag 82](https://csatoj.vn/problems/?tag=82&point_start=&point_end=) |
| C07 · 3/3 [Chia để trị và merge sort: giải từng phần, ghép có quy tắc](../content/parent-topics/c07-chia-de-tri-merge-sort.md) | Giữ cơ sở, bài toán nhỏ hơn, trạng thái nhớ và chi phí mỗi tầng. | 222–224 (trực tiếp: merge sort) | K | [tag 82](https://csatoj.vn/problems/?tag=82&point_start=&point_end=) |
| C08 · 1/1 [Quay lui: sinh xâu, tổ hợp và hoán vị](../content/parent-topics/c08-quay-lui-sinh-cau-hinh.md) | Giữ hoàn tác và không sinh trùng; không sao chép ví dụ tập con sai của PDF. | 65–69 (trực tiếp: hoán vị, tập con) | K | [tag 83](https://csatoj.vn/problems/?tag=83&point_start=&point_end=) |
| C09 · 1/2 [N quân hậu: biểu diễn ràng buộc để cắt nhánh](../content/parent-topics/c09-n-quan-hau.md) | Giữ đánh dấu/hoàn tác và phân biệt heuristic với cắt nhánh đúng. | 59–61 (trực tiếp: N quân hậu) | K | [tag 84](https://csatoj.vn/problems/?tag=84&point_start=&point_end=) |
| C09 · 2/2 [Mã đi tuần: xây đường đi và kiểm soát nhánh tìm kiếm](../content/parent-topics/c09-ma-di-tuan-cat-nhanh.md) | Giữ đánh dấu/hoàn tác và phân biệt heuristic với cắt nhánh đúng. | 69–71 (trực tiếp: mã đi tuần) | K | [tag 84](https://csatoj.vn/problems/?tag=84&point_start=&point_end=) |
| C10 · 1/1 [Tham lam: chọn hoạt động và chứng minh quyết định](../content/parent-topics/c10-tham-lam-chon-hoat-dong.md) | Giữ chứng minh trao đổi; thêm phản ví dụ mục tiêu tổng lợi ích. | 38–42 (trực tiếp: tham lam/chọn hoạt động) | K + T | [tag 85](https://csatoj.vn/problems/?tag=85&point_start=&point_end=) |
| C11 · 1/2 [Chặt nhị phân trên đáp án: từ tối ưu tới khả thi](../content/parent-topics/c11-dap-an-kha-thi.md) | Giữ tính đơn điệu, cận khả thi, check và chống tràn khi cộng/sản xuất. | 193–198 (trực tiếp: tìm đáp án khả thi) | K + T | [tag 86](https://csatoj.vn/problems/?tag=86&point_start=&point_end=) |
| C11 · 2/2 [Hàm check, cận và biên: giữ tìm kiếm đi đúng hướng](../content/parent-topics/c11-ham-check-can-bien.md) | Giữ tính đơn điệu, cận khả thi, check và chống tràn khi cộng/sản xuất. | 193–198 (trực tiếp: tìm đáp án khả thi) | K + T | [tag 86](https://csatoj.vn/problems/?tag=86&point_start=&point_end=) |
| C12 · 1/1 [Hashing xâu: so sánh nhanh và hiểu giới hạn va chạm](../content/parent-topics/c12-hashing-xau.md) | Giữ cùng quy ước hash tiền tố; thêm va chạm aa/af để không suy bằng hash là bằng xâu. | 126–129 (trực tiếp: hash; cần thống nhất chiều lũy thừa) | K + T | [tag 96](https://csatoj.vn/problems/?tag=96&point_start=&point_end=) |
| D01 · 1/1 [Quy hoạch động nhập môn: đặt trạng thái từ câu hỏi cần trả lời](../content/parent-topics/d01-quy-hoach-dong-nhap-mon.md) | Giữ trạng thái/cơ sở, đếm so với tối ưu và Kadane dãy âm. | 87–88, 100–101 (Fibonacci/Kadane; liên quan nhập môn) | K | [tag 87](https://csatoj.vn/problems/?tag=87&point_start=&point_end=) |
| D02 · 1/1 [Quy hoạch động trên lưới: đếm đường và tối ưu tổng](../content/parent-topics/d02-quy-hoach-dong-tren-luoi.md) | Giữ ô cấm, trạng thái không tới được và không cộng với sentinel. | Chưa xác định phần trực tiếp cho đầy đủ ô cấm và trạng thái không tới được | K | [tag 88](https://csatoj.vn/problems/?tag=88&point_start=&point_end=) |
| D03 · 1/2 [Cái túi 0/1: mỗi vật được chọn một lần](../content/parent-topics/d03-cai-tui-01.md) | Giữ hướng duyệt theo mô hình; thêm một vật w=2,v=3,W=4, đáp án 3 so với 6. | 91–92 (trực tiếp: cái túi 0/1) | K + T | [tag 89](https://csatoj.vn/problems/?tag=89&point_start=&point_end=) |
| D03 · 2/2 [Cái túi không giới hạn: chọn lại một loại vật](../content/parent-topics/d03-cai-tui-khong-gioi-han.md) | Giữ hướng duyệt theo mô hình; thêm một vật w=2,v=3,W=4, đáp án 3 so với 6. | 92–94 (liên quan: đổi tiền dùng lại loại) | K + T | [tag 89](https://csatoj.vn/problems/?tag=89&point_start=&point_end=) |
| D04 · 1/1 [Đổi tiền và chia tập: tổng giống nhau, quyết định khác nhau](../content/parent-topics/d04-doi-tien-chia-tap.md) | Giữ tồn tại/đếm/tối ưu; thêm 2 tổ hợp so với 3 chuỗi và mệnh giá trùng. | 92–94, 101–103 (đổi tiền/tổng tập con) | K + T | [tag 90](https://csatoj.vn/problems/?tag=90&point_start=&point_end=) |
| D05 · 1/1 [LIS: dãy con tăng nghiêm ngặt và dấu vết lời giải](../content/parent-topics/d05-lis-va-truy-vet.md) | Giữ tăng nghiêm ngặt và truy vết dãy thật; tails không phải lời giải. | 89–90 (trực tiếp: LIS) | K | [tag 91](https://csatoj.vn/problems/?tag=91&point_start=&point_end=) |
| D06 · 1/2 [LCS và truy vết: giữ thứ tự để tìm dãy ký tự chung](../content/parent-topics/d06-lcs-va-truy-vet.md) | Giữ tiền tố rỗng, thứ tự và truy vết/thao tác có chi phí rõ. | 96–97 (trực tiếp: LCS) | K | [tag 92](https://csatoj.vn/problems/?tag=92&point_start=&point_end=) |
| D06 · 2/2 [Khoảng cách chỉnh sửa: chèn, xóa và thay thế](../content/parent-topics/d06-khoang-cach-chinh-sua.md) | Giữ tiền tố rỗng, thứ tự và truy vết/thao tác có chi phí rõ. | 94–95 (trực tiếp: edit distance) | K | [tag 92](https://csatoj.vn/problems/?tag=92&point_start=&point_end=) |
| D07 · 1/2 [Trạng thái hai chiều: khi một tổng chưa đủ thông tin](../content/parent-topics/d07-trang-thai-hai-chieu.md) | Giữ ý nghĩa chiều và thứ tự xử lý; bổ sung số 0 cho bài chọn đúng k. | 101–103 (liên quan: tập con; thiếu chiều đúng k) | K + T | [tag 93](https://csatoj.vn/problems/?tag=93&point_start=&point_end=) |
| D07 · 2/2 [Quy hoạch động chia đoạn: tối ưu từ thao tác cuối](../content/parent-topics/d07-quy-hoach-dong-chia-doan.md) | Giữ trạng thái hai đầu, tách cuối, thứ tự độ dài và O(n³); không mở rộng thành tối ưu DP ngoài khung. | 97–99 (liên quan: matrix chain; bài hiện có là ghép đoạn) | K + T | [tag 93](https://csatoj.vn/problems/?tag=93&point_start=&point_end=) |

## Điểm cần thận trọng khi dùng PDF

- Tr.38–40: không suy hệ tiền canonical chỉ từ việc đổi mệnh giá lớn thành các mệnh giá nhỏ. Với `{1,3,4}`, tổng 6: tham lam lấy 4+1+1, còn 3+3 ít xu hơn. Giữ chứng minh theo bài toán cụ thể.
- Tr.18–19: nếu mở rộng lũy thừa sang số mũ 0 phải giữ `1 % m`, nhất là m=1; nhân trước lấy modulo vẫn có thể tràn. Bài hiện tại đã có giới hạn và phương án phù hợp.
- Tr.126–127: biểu diễn theo lũy thừa tăng và công thức dịch theo lũy thừa giảm phải được phân biệt. Bài Portal thống nhất nhân cơ số rồi cộng ký tự; không trộn hai quy ước.
- Tr.150: tăng bộ đếm một lần khi tổng cửa sổ bằng K bỏ sót ca có số 0; `[0,0]`, K=0 có ba đoạn không rỗng. Ví dụ mới trong C03 phân biệt mục tiêu đếm với tối đa độ dài.
- Tr.67: ví dụ tập con có phần tử 5 trong khi dãy nêu là `[2,3,6,7]`; không dùng kết quả mẫu đó để kiểm bài.
- Tr.215: cách dùng bảng băm cần bộ nhớ phụ; không gắn mô tả tại chỗ/không bộ nhớ phụ cho cách ấy.

## Đề xuất bổ sung riêng, chưa đưa vào 54 bài

| Đề xuất | Lý do / điều kiện |
|---|---|
| Bộ ca kiểm chứng nhỏ đi cùng từng chủ đề | Mở rộng từ các ca đã bổ sung; gia sư chọn bài OJ cụ thể và kiểm độ khó trước khi coi là bài giao cho lớp. Không suy từ tag rằng mọi bài phù hợp mọi học sinh. |
| Nhánh đếm đoạn bằng prefix sum + tần suất | Hữu ích để nối C01/C03/C05; cần duyệt phạm vi và vị trí trước khi tạo bài riêng. Hiện chỉ dùng phản ví dụ để chỉ rõ giới hạn. |
| Tham lam có trọng số / lịch hoạt động có trọng số | Bài hiện tại chỉ nêu phản ví dụ. Phần thuật toán mới cần duyệt thay vì ngầm thêm vào C10. |
| Đồ thị, segment tree, số học nâng cao trong PDF | Ngoài khung 43 mã; lập giáo án E/K/PreVOI riêng sau khi duyệt, không nối vào C hoặc đổi tên lớp lịch sử. |
| Gắn bài OJ theo mức và mục tiêu | Cần review sư phạm từng đề, giới hạn, lời giải và dữ liệu chấm. Đợt này chỉ xác minh tag, chưa có mapping bài riêng. |

## Bằng chứng QA local

Kiểm chứng ngày 16/10/2026, Node **24.19.0**, Next production build dùng URL/key placeholder và mock RPC loopback; toàn bộ học sinh/lớp/phiên là dữ liệu giả. Không đọc dữ liệu phụ huynh thật, không migration/deploy.

| Phần | Kết quả và bằng chứng |
|---|---|
| Cấu trúc/thân bài | 54 bài/43 mã, series không đổi; mỗi bài một mục Luyện tập, hai câu tự kiểm tra đóng mặc định. Unit tests nhóm bài và bản đồ 9/9 đạt. |
| Code | Biên dịch lại 89/89 khối; chạy lại 78.321 ca độc lập từ code trích trực tiếp. `scratch/parent-topics-compiler/compile-report.json` và `algorithm-report.json`. Không sửa khối C++ trong đợt này. |
| Ví dụ bổ sung | 21 kiểm tra độc lập bằng liệt kê trực tiếp/thư viện chuẩn; `scratch/content-roadmap-research/new-examples-report.json`. Hướng dẫn nộp OJ A01 là nội dung thao tác, không phải ca thuật toán. |
| Liên kết | 43/43 mã/tag trùng roadmap, GET 200, tag đúng được chọn; chưa giải/nộp từng đề OJ. URL chỉ có tag và bộ lọc điểm rỗng, không có ngữ cảnh riêng tư. |
| Quyền | Route thật chặn thiếu/sai/hết/thu hồi phiên, sai học sinh/lớp, nháp, chủ đề bị loại, khung cũ/tùy chỉnh, lớp thu hồi và không có học sinh. Kiểm header private/no-store/noindex; giữ tháng/phân trang khi quay lại. |
| Browser cuối | `PARENT_TOPICS_QA_FILTER='^(?!backend )'`: **22 nhóm/3.791 assertions đạt**, đủ 54 bài; không lỗi JS hoặc request ghi ngoài dự kiến. `scratch/parent-topics-qa/report-targeted.json`. Filter chỉ tách nhóm backend dùng chung, không lọc bớt bài hoặc ca quyền phụ huynh. |
| Layout | Roadmap 320/375/768/1440 px, light/dark; bài dài 320/375/768/1440 px, bảng/code cuộn trong khung. Kiểm bàn phím, reduced motion, no-JS, in hiện đáp án và ẩn nút thao tác. Phóng to bằng CSS zoom 200%, text 200% và viewport tương đương; chưa chứng nhận mọi tổ hợp zoom hệ điều hành/trình duyệt. |
| Duyệt hình | Đã xem ảnh roadmap desktop light/mobile dark, đầu bài desktop, thân bài mobile, khối luyện tập dark và trang đầu PDF in. Ảnh/PDF nằm trong `scratch/parent-topics-qa/`, không thuộc runtime/Git. |
| Repo/build | Guard 587 tệp sạch, typecheck/lint strict/build/diff check đạt. Repo 22/24 trong sandbox; hai ca git init bị sandbox chặn, chạy lại file repository ngoài sandbox đạt 6/6. Không tuyên bố một lượt tổng 24/24. |
| Giới hạn runner tổng | Lượt không filter trước đó: 33 nhóm đạt, 3 timeout ở `backend parent phone login and retired password` tại 375/768/1440; chờ trạng thái gửi chưa xuất hiện. Fixture này chưa mô phỏng CAPTCHA; chưa sửa/xác nhận lại nhóm đăng nhập trong phạm vi này. `scratch/parent-topics-qa/report.json` giữ nguyên bằng chứng lỗi. |
| Không chạy | DB tests (không đổi API/RPC/migration), Supabase staging, phiên phụ huynh thật và kiểm chất lượng toàn bộ bài OJ. Chưa deploy production. |

Demo chạy `PARENT_TOPICS_QA_DEMO=1`, `CSAT_PARENT_QA_PORT=3101` qua runner. Cửa sổ Edge có cookie giả; mở link trong trình duyệt khác vẫn cần phiên, không thêm đường tắt xác thực. Đóng cửa sổ demo sẽ dọn mock/server do runner sở hữu. [Hướng dẫn runner](PARENT_TOPICS.md).

## Duy trì nội dung và mapping

Đợt này thêm 13 đoạn kiểm tra/phản ví dụ, chuẩn hóa tên mục Luyện tập và thuật ngữ trong 21 Markdown; giữ nguyên 89 khối C++. Không ép bài dài về một mẫu tiêu đề. Nội dung tốt được giữ; trình tự tình huống → nhận xét → phương pháp → tính đúng → code → chi phí/giới hạn → luyện tập → tự kiểm tra là nguyên tắc biên tập, không phải bộ tiêu đề bắt buộc.

Khi thêm/sửa mapping, đối chiếu lại roadmap và trang đích trước khi cho helper trả URL. Các bài trong series dùng chung tag; không thêm URL vào Markdown. Rà lại quyền công bố/loại trừ/khung tùy chỉnh bằng runner fixture. Không có API, migration, đồng bộ điểm hoặc suy thành thạo từ CSATOJ.

Lượt phát hành 16/10/2026: toàn bộ runner Edge đạt **36 nhóm / 4.079 assertions**, không browser error/request ghi ngoài mock. Fixture đặt rõ CAPTCHA tắt để không kế thừa cấu hình máy; bộ `run-login-captcha-ui.cjs` kiểm widget giả riêng đạt 30 assertions. Ba timeout đăng nhập ở lượt trước đã được giải quyết trong fixture; không thay cấu hình hay kiểm quyền production.
