Thống kê và tìm kiếm có thể được tổ chức bằng mảng đếm, tập hợp hoặc bảng khóa–giá trị. Mỗi cách tốt ở một nhóm yêu cầu khác nhau. Nội dung “cây và băm” ở chuyên đề này giúp học sinh hiểu khác biệt về tổ chức và chi phí; trọng tâm thực hành vẫn là `set`, `map` và mảng đếm trong giáo án đã chọn.

## Tư duy

- Xác định bài toán cần tính có mặt, số lần xuất hiện hay thông tin gắn với một khóa.
- Xem miền giá trị lớn hay nhỏ, dữ liệu dày hay thưa để chọn cách lưu.
- Phân biệt lợi ích của thứ tự khóa với nhu cầu truy cập nhanh nhưng không cần thứ tự.
- Đánh giá chi phí xấu nhất, chi phí kỳ vọng và bộ nhớ thay vì gán mọi cấu trúc cùng một độ phức tạp.

## Nội dung học

- Mảng đếm cho khóa nguyên trong một miền nhỏ đã biết.
- `set`: giá trị phân biệt, thêm, xóa, tìm và truy vấn ranh giới.
- `map`: khóa duy nhất gắn với số đếm hoặc một giá trị khác.
- Tổ chức theo thứ tự và tổ chức bằng băm; giới hạn của mỗi mô hình.

## Ba câu hỏi, ba thông tin cần lưu

Với dãy `5, 2, 5, 9, 2, 5`, xét ba câu hỏi: có bao nhiêu giá trị phân biệt, số 5 xuất hiện mấy lần, và giá trị nhỏ nhất không dưới 4 là gì?

| Cấu trúc | Thông tin giữ lại | Trả lời tốt yêu cầu nào? |
|---|---|---|
| Mảng đếm | Số lần ở từng chỉ số | Đếm trong miền nhỏ |
| `set` | 2, 5, 9 | Có mặt, phân biệt, ranh giới theo thứ tự |
| `map` đếm | 2→2, 5→3, 9→1 | Đếm với khóa thưa hoặc không dùng chỉ số trực tiếp |

Cách trực tiếp tìm một giá trị bằng duyệt dãy dùng `O(n)` mỗi lần. Khi có nhiều thao tác, lưu một cấu trúc phù hợp sẽ tránh duyệt lại toàn bộ.

## Mảng đếm: tốc độ đổi bằng miền lưu trữ

Nếu mọi giá trị nằm trong `[0, M]`, tạo `M + 1` ô bằng 0 rồi tăng `dem[x]` mỗi lần gặp `x`. Với ví dụ trên và `M = 9`, ta được `dem[2] = 2`, `dem[5] = 3`, `dem[9] = 1`.

Thời gian khởi tạo và đọc dãy là `O(M + n)`, mỗi truy vấn một giá trị là `O(1)`, bộ nhớ `O(M)`. Nếu chỉ 1000 số xuất hiện nhưng giá trị có thể đến một tỷ, cấp mảng cho toàn miền không phù hợp. Số âm cần cách dịch chỉ số được chứng minh hoặc một cấu trúc khác; không dùng trực tiếp số âm làm chỉ số.

## Tập hợp có thứ tự

`set` chỉ giữ một bản sao của mỗi giá trị. Chèn số 5 lần thứ hai không tăng số phần tử. Đoạn mã dùng `<set>` và `<iostream>`.

```cpp
set<int> s = {5, 2, 5, 9, 2, 5};
cout << s.size() << '\n'; // 3

auto it = s.lower_bound(4);
if (it != s.end()) cout << *it << '\n'; // 5

s.erase(5);
// s còn {2, 9}.
```

`lower_bound` của `set` tìm phần tử đầu tiên không nhỏ hơn ngưỡng, khác với chỉ hỏi một giá trị có tồn tại. Gọi hàm thành viên như trên tận dụng cấu trúc có thứ tự; không lấy iterator chưa kiểm tra rồi đọc phần tử ở `end()`.

Về tính đúng, một giá trị đã có sẽ không được thêm bản sao mới; một giá trị chưa có sẽ được thêm đúng một lần. Sau khi chèn toàn dãy, tập chứa chính xác các giá trị phân biệt. Tuy nhiên, nó đã bỏ số lần xuất hiện: không thể hỏi từ `set` rằng 5 có mặt ba lần.

## Giữ số lượng bằng khóa–giá trị

Đoạn mã dùng `<map>` và `<vector>`; `a` là dãy đầu vào.

```cpp
map<int, int> dem;
for (int x : a) dem[x]++;

auto it = dem.find(5);
int so_lan = it == dem.end() ? 0 : it->second;
```

Mỗi khóa gắn với số lần đã đọc nên không mất thông tin trùng. Muốn bỏ **một lần xuất hiện**, giảm số đếm; chỉ xóa khóa khi số đếm về 0. `erase(5)` xóa cả mục mang khóa 5, không phải tự giảm số đếm một đơn vị.

## Cây có thứ tự và bảng băm

`set`, `map` cung cấp thứ tự và thao tác theo khóa với `O(log(k + 1))` phép so sánh, trong đó `k` là số khóa. Có thể hình dung việc tìm đi qua các nhánh của một cấu trúc cân bằng, thay vì quét lần lượt mọi mục. Không cần tự cài cây trong phạm vi bài này.

Bảng băm dùng hàm băm để phân khóa vào các nhóm lưu trữ; các khóa khác nhau vẫn có thể vào cùng nhóm, gọi là va chạm. Các container không có thứ tự thường có thao tác kỳ vọng nhanh khi phân bố tốt, nhưng không bảo đảm thứ tự tăng và không bảo đảm mọi thao tác luôn `O(1)` trong trường hợp xấu nhất. Đây là băm để tổ chức container, không phải phép băm xâu của C12.

Lựa chọn cần bám yêu cầu: mảng đếm khi miền nhỏ, `set` khi cần tập phân biệt có thứ tự, `map` khi cần giá trị theo khóa. Không chọn bảng băm chỉ vì nghe độ phức tạp trung bình thấp hơn.

## Luyện tập

- Đếm giá trị phân biệt và số lần xuất hiện bằng hai cách; so sánh bộ nhớ cho miền nhỏ và miền lớn.
- Tìm giá trị nhỏ nhất không dưới ngưỡng, kể cả khi không có kết quả.
- Duy trì số lượng sau chuỗi thêm/bớt và xóa khóa đúng khi số đếm về 0.

## Tự kiểm tra

> **Câu hỏi 1:** `set` có thể thay `map` đếm nếu đề cần số lần xuất hiện không?
>
> **Trả lời:** Không. `set` chỉ giữ có mặt hay không và bỏ các bản sao. `map` đếm giữ số lần ở giá trị gắn với mỗi khóa.

> **Câu hỏi 2:** Vì sao độ phức tạp kỳ vọng của bảng băm không phải bảo đảm cho trường hợp xấu nhất?
>
> **Trả lời:** Nhiều khóa có thể bị phân vào cùng nhóm, làm tìm kiếm trong nhóm tốn nhiều bước. Đánh giá kỳ vọng dựa vào giả thiết phân bố; nó không loại trừ trường hợp va chạm bất lợi.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Sets & Maps](https://usaco.guide/bronze/intro-sets)
- [USACO Guide — More Operations on Sorted Sets](https://usaco.guide/gold/intro-sorted-sets)
- [Viblo Algorithm — Tập hợp và ứng dụng](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-2-tap-hop-set-va-mot-so-ung-dung-bWrZnQynKxw)
- [Viblo Algorithm — Map và Dictionary](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-3-anh-xa-mapdictionary-aWj53mbPZ6m)
