# Nguồn và kiểm chứng nhóm B09–B15, C01–C06

## Phạm vi nội dung

Nhóm này có 17 bài cho 13 mã giáo án: B09 bốn bài; C01 hai bài; các mã còn lại một bài. Giữ nguyên canon và thứ tự B09–B15/C01–C06. Ba bài B14/C01 đã có được biên tập theo chuẩn mới; không thay các bảng ví dụ đúng đã được duyệt.

Mọi tình huống, bảng truy vết, lời giải và mã được tự biên soạn. Các nguồn là tài liệu đối chiếu ý tưởng và hợp đồng thao tác, không phải nội dung để sao chép. Sườn lập luận vận dụng từ VNOI là quan sát bài toán, thử cách trực tiếp, xác định nhận xét, xây cách giải rồi chứng minh/đánh giá; đây là nhận xét biên tập từ bài đã đọc, không phải một hướng dẫn văn phong chính thức của VNOI.

## Tài liệu đã mở và đọc

| Nguồn | Liên kết | Phần được đối chiếu |
|---|---|---|
| VNOI | [Sắp xếp](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/sorting-new.md) | Chọn/chèn, cách diễn giải phần dãy đã xử lý; B13 |
| VNOI | [Tìm kiếm nhị phân](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/binary-search.md) | Phạm vi và cách loại nửa dãy; B14 |
| VNOI | [Cộng dồn và mảng hiệu](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/data-structures/prefix-sum-and-difference-array.md) | Tổng tiền tố, vùng giao và dấu thay đổi; C01/C02 |
| VNOI | [Hai con trỏ](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/two-pointers.md) | Hướng dịch, điều kiện đơn điệu, giới hạn số âm; C03 |
| VNOI | [Manacher](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/string/manacher.md) | Định nghĩa palindrome và tâm lẻ/chẵn; B15 chỉ dùng mở rộng tâm, không thêm Manacher vào giáo án |
| USACO Guide | [Modular Arithmetic](https://usaco.guide/gold/modular) | Đồng dư và bình phương/nhân; không bổ sung nghịch đảo modulo vào B09 |
| USACO Guide | [Introduction to Data Structures](https://usaco.guide/bronze/intro-ds) | Dãy động, bản ghi và lựa chọn thao tác; B10/B11 |
| USACO Guide | [Introduction to Sorting](https://usaco.guide/bronze/intro-sorting) | Sắp xếp thư viện và dữ liệu cặp; B11/B13/C04 |
| USACO Guide | [Introduction to Sets & Maps](https://usaco.guide/bronze/intro-sets) | Khóa duy nhất, thứ tự, chi phí băm kỳ vọng và trường hợp xấu; B12/C05 |
| USACO Guide | [More Operations on Sorted Sets](https://usaco.guide/gold/intro-sorted-sets) | Truy vấn ranh giới theo khóa; C05 |
| USACO Guide | [Prefix Sums](https://usaco.guide/silver/prefix-sums) | Tiền xử lý và chi phí truy vấn; C01 |
| USACO Guide | [Two Pointers](https://usaco.guide/silver/two-pointers) | Cặp tổng, cửa sổ và tổng số lần dịch; C03 |
| USACO Guide | [Sliding Window](https://usaco.guide/gold/sliding-window) | Cập nhật thông tin khi thêm/bỏ đầu cửa sổ; C03 không thêm thuật toán deque đơn điệu |
| USACO Guide | [Binary Search](https://usaco.guide/silver/binary-search) | Lỗi cận và điều kiện đơn điệu; B14 chỉ tìm trên dãy |
| Viblo Algorithm | [Phép nhân Ấn Độ, bình phương và nhân](https://viblo.asia/p/phep-nhan-an-do-thuat-toan-binh-phuong-va-nhan-gDVK2dmrlLj) | B09, do tài khoản Viblo Algorithm đăng; viết lại điều kiện số học và code |
| Viblo Algorithm | [STL và các tiện ích cơ bản](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-1-gioi-thieu-cac-thanh-phan-cua-stl-c-va-cac-tien-ich-co-ban-GrLZDr6n5k0) | B11/B13/C04 |
| Viblo Algorithm | [Map và Dictionary](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-3-anh-xa-mapdictionary-aWj53mbPZ6m) | B12/C05 |
| Viblo Algorithm | [Tập hợp và ứng dụng](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-2-tap-hop-set-va-mot-so-ung-dung-bWrZnQynKxw) | C05 |
| Viblo Algorithm | [Mảng tổng tiền tố và mảng hiệu](https://viblo.asia/p/quy-hoach-dong-55-mang-tong-tien-to-va-mang-hieu-phan-1-r1QLx6104Aw) | C01/C02 |
| Viblo Algorithm | [Tìm kiếm nhị phân](https://viblo.asia/p/gioi-thieu-thuat-toan-tim-kiem-nhi-phan-maGK7BjB5j2) | B14 |
| Viblo Algorithm | [Ngăn xếp và hàng đợi](https://viblo.asia/p/ngan-xep-va-hang-doi-stack-queue-yMnKM6MQZ7P) | C06 |
| Học Tile, Viblo | [Vector trong C++](https://viblo.asia/p/su-dung-vector-trong-lap-trinh-c-giai-bai-toan-lap-trinh-muon-thua-Az45bnGQ5xY) | B10 |
| Thủy Nguyễn, Viblo | [Stack và queue](https://viblo.asia/p/stack-va-queue-trong-cau-truc-du-lieu-RQqKLv8Nl7z) | LIFO/FIFO và khái niệm đối xứng; B15/C06, không lấy các khẳng định AWS làm giáo án |
| CP Algorithms | [Binary Exponentiation](https://cp-algorithms.com/algebra/binary-exp.html) | Kiểm tra phân rã số mũ và bất biến; B09 |
| cppreference | [vector](https://en.cppreference.com/w/cpp/container/vector.html), [map](https://en.cppreference.com/w/cpp/container/map.html), [unique](https://en.cppreference.com/w/cpp/algorithm/unique.html), [deque](https://en.cppreference.com/w/cpp/container/deque.html), [set lower_bound](https://en.cppreference.com/w/cpp/container/set/lower_bound.html), [string](https://en.cppreference.com/w/cpp/string/basic_string.html) | Đối chiếu hợp đồng thao tác, cấp phát, chi phí và giới hạn iterator; nguồn tham chiếu bổ sung |

Nguồn [Hệ cơ số — Viblo Algorithm](https://viblo.asia/p/he-co-so-he-dem-m68Z0e72lkG) đọc được các đoạn chi tiết do kết quả web trả về (chia lặp, trọng số, biểu diễn nhị phân/hexa). Mở trực tiếp toàn trang bị lỗi cache; không ghi là đã đọc toàn bộ trang. Bài B09 dùng số nguyên 2–16 với kiểm tra tràn tự viết; chưa dùng ví dụ số thực hoặc đoạn mã dịch bit trong nguồn. Không có nguồn “chờ đọc” được trình bày như nguồn đã đọc.

## Kiểm tra nguồn và lựa chọn độc lập

- B09: bản Viblo có công thức lũy thừa ghi nhầm vế trái và đoạn Python kiểm tra `b % 1`; không dùng các đoạn ấy. Giới hạn trực tiếp `m <= 1 000 000 007` được nêu rõ; số mũ 0 khởi tạo `1 % m`, xử lý đúng `m = 1`.
- Khi dùng nhân chia đôi, phép cộng cũng phải tránh tràn. Hàm cộng sử dụng so sánh `a >= m - b`, không tạo `a + b` trong nhánh có thể vượt giới hạn. Chuẩn hóa số âm dùng phần dư trước rồi chỉ cộng `m` khi âm, không cộng hai lần một cách máy móc.
- C02: cấp phát `n + 2`, luôn có ô `r + 1`; phân biệt mảng hiệu của dữ liệu với mảng mức tăng khởi tạo 0. Không sao chép đoạn cấp phát thiếu ô đệm từ nguồn.
- C03: cửa sổ biến đổi tổng yêu cầu dữ liệu không âm; phản ví dụ tự viết `4, -3` với ngưỡng 2 chứng minh vì sao số âm phá điều kiện. Tìm cặp trên dãy sắp vẫn dùng được số âm.
- B15: chuẩn hóa chỉ đổi chữ ASCII, không quảng cáo là chuẩn hóa Unicode. Đếm palindrome theo vị trí, không nhầm với số xâu phân biệt.
- C04/C05: `unique` không đổi size, `map` không phải bảng băm và `operator[]` có thể thêm khóa. Các bài giữ rõ khác biệt này thay vì suy chi phí hoặc tính năng từ tên container.

## Video đã xác minh liên kết

| Bài | Video | Căn cứ xác minh |
|---|---|---|
| B09 lũy thừa | [Binary Exponentiation — Errichto Algorithms](https://www.youtube.com/watch?v=L-Wzglnm4dM) | Kết quả YouTube trả đúng tên, tài khoản và mô tả thuật toán; không tuyên bố đã xem toàn video |
| C01 một chiều | [Introduction to Prefix Sums](https://www.youtube.com/watch?v=f0bfiuDjq9A) | Publisher USACO Guide gắn đúng ID trong [mã nguồn bài](https://raw.githubusercontent.com/cpinitiative/usaco-guide/master/content/3_Silver/Prefix_Sums.mdx); không tuyên bố đã xem toàn video |
| C03 | [Two Pointers](https://www.youtube.com/watch?v=zmadiUuUeAA) | Publisher USACO Guide gắn đúng ID trong [mã nguồn bài](https://raw.githubusercontent.com/cpinitiative/usaco-guide/master/content/3_Silver/Two_Pointers.mdx); không tuyên bố đã xem toàn video |
| C01 hai chiều/C02 | [Prefix sums, difference arrays — peltorator](https://www.youtube.com/watch?v=5iW84xlL0j0) | Đi từ [blog chính tác giả](https://codeforces.com/blog/entry/88474) đến YouTube, trả đúng tên video; tác giả ghi tiếng Nga, phụ đề Anh. Không tuyên bố đã xem toàn video |

Video là phần đọc thêm tự chọn, không thay bảng và giải thích trong bài; không nhúng player ngoài hoặc tải media về repo. Các liên kết không được tạo bằng cách đoán ID.

## Bằng chứng kiểm tra local

Bộ ví dụ và thuật toán được kiểm tra độc lập bằng Node.js 24.19.0 trong `scratch/parent-topics-bc-check.cjs` (ngoài Git): **6309 assertion đạt**. Bao gồm chuẩn hóa số âm; cộng/nhân modulo sát giới hạn số nguyên có dấu; lũy thừa với số mũ 0/modulo 1; vòng đổi cơ số; tìm kiếm nhị phân; đếm palindrome; cộng dồn 1D/2D; mảng hiệu và cửa sổ so với vét cạn. Kiểm tra đủ 17 bài, 13 mã, mỗi mục Tư duy/Nội dung học có 3–5 ý và mỗi bài có đúng 2 câu tự kiểm tra. Đây là kiểm tra logic bằng cài đặt độc lập, không thay biên dịch đoạn C++ thật. Kiểm chứng compiler portable trích từ Markdown do agent điều phối thực hiện được tổng hợp riêng tại [chuyên đề phụ huynh](PARENT_TOPICS.md); không suy kết quả compiler từ kiểm tra Node.
