Một dãy dữ liệu cần được lưu theo vị trí để chương trình xem từng phần tử, tính tổng, tìm giá trị lớn nhất hoặc đếm những phần tử thỏa điều kiện. Mảng một chiều làm rõ quan hệ giữa vị trí và giá trị. Từ một lượt duyệt đơn giản, học sinh học cách giữ kết quả của phần đã xét và cập nhật nó khi gặp dữ liệu mới.

## Tư duy

- Phân biệt chỉ số của phần tử với giá trị được lưu tại vị trí đó.
- Xác định thông tin cần giữ khi duyệt: tổng, số lượng hay giá trị tốt nhất đến thời điểm hiện tại.
- Chọn trạng thái ban đầu từ ý nghĩa bài toán, đặc biệt khi dãy có số âm hoặc có thể rỗng.
- Kiểm tra phạm vi truy cập và giải thích rằng mỗi phần tử được xử lý đúng một lần.

## Nội dung học

- Khai báo mảng, đánh số từ 0, đọc/ghi `a[i]` và giới hạn chỉ số.
- Duyệt toàn dãy bằng vòng lặp, tính tổng và đếm theo điều kiện.
- Tìm giá trị lớn nhất, nhỏ nhất, khởi tạo từ một phần tử hợp lệ.
- Phân biệt độ dài đang dùng với sức chứa của mảng.
- Chi phí một lượt duyệt, kiểu dữ liệu cho tổng và xử lý dãy rỗng.

## Vị trí không phải giá trị

Xét dãy `-4, 7, 0, 7, -2`. Nếu đánh số từ 0, phần tử ở vị trí 1 có giá trị 7; còn giá trị 1 không có trong dãy.

| Chỉ số | 0 | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|---:|
| Giá trị | -4 | 7 | 0 | 7 | -2 |

Mảng có 5 phần tử thì các chỉ số hợp lệ là 0 đến 4. `a[5]` không phải phần tử cuối; đó là vị trí ngoài phạm vi. Một chương trình có thể chưa báo lỗi rõ ngay khi truy cập sai, nên không được dùng việc “chạy thấy bình thường” để kết luận chỉ số hợp lệ.

## Giữ kết quả trong một lượt duyệt

Ta cần tổng, số phần tử dương và giá trị lớn nhất. Đoạn mã đặt trong `main`, dùng `<algorithm>`:

```cpp
int a[] = {-4, 7, 0, 7, -2};
int n = 5;
long long tong = 0;
int so_duong = 0, lon_nhat = a[0];

for (int i = 0; i < n; ++i) {
    tong += a[i];
    if (a[i] > 0) ++so_duong;
    lon_nhat = max(lon_nhat, a[i]);
}
```

Tổng bằng 8, số phần tử dương bằng 2, giá trị lớn nhất bằng 7. Hai số 7 ở hai vị trí khác nhau đều được đếm, vì yêu cầu là đếm phần tử, không phải đếm các giá trị phân biệt.

| Sau khi xét chỉ số | Tổng | Số phần tử dương | Lớn nhất đã gặp |
|---:|---:|---:|---:|
| 0 | -4 | 0 | -4 |
| 1 | 3 | 1 | 7 |
| 2 | 3 | 1 | 7 |
| 3 | 10 | 2 | 7 |
| 4 | 8 | 2 | 7 |

Mỗi biến tóm tắt một thông tin của phần đã duyệt. Khi đọc phần tử tiếp theo, tổng thêm giá trị đó, số lượng tăng nếu điều kiện đúng, giá trị lớn nhất so sánh với dữ liệu mới. Đây là ba cách cập nhật khác nhau dù cùng nằm trong một vòng lặp.

## Tại sao khởi tạo từ `a[0]`?

Nếu đặt `lon_nhat = 0`, một dãy toàn âm như `-8, -3, -5` sẽ giữ kết quả 0, dù số 0 không nằm trong dãy. Khởi tạo bằng phần tử đầu cho ta một giá trị thật, sau đó chỉ thay khi gặp phần tử lớn hơn. Giá trị nhỏ nhất được làm tương tự bằng `min`.

Đoạn mã giả sử `n > 0` khi đọc `a[0]`. Với dãy rỗng, tổng và số lượng có thể bằng 0, nhưng không có giá trị lớn nhất/nhỏ nhất để trả theo cùng định nghĩa. Cần xử lý riêng theo yêu cầu, không tự dùng 0 để thay cho việc không có dữ liệu.

## Tính đúng và chi phí

Trước mỗi lượt, các biến kết quả đúng cho những vị trí đã đi qua. Cập nhật bằng phần tử hiện tại mở rộng kết quả sang thêm đúng một vị trí. Vòng lặp đi từ 0 đến `n - 1`, không bỏ và không lặp lại vị trí, nên cuối cùng các biến đúng cho toàn dãy.

Một lượt duyệt cần `O(n)` thời gian và `O(1)` bộ nhớ phụ ngoài mảng. Lưu dãy cần `O(n)` bộ nhớ. Nếu chỉ cần một thống kê và không dùng lại từng phần tử, đôi khi có thể tính ngay khi nhập, nhưng cần hiểu việc lưu mảng trước khi lựa chọn cách tiết kiệm ấy.

Tổng có thể lớn hơn từng phần tử, vì vậy phải chọn kiểu theo giới hạn tổng. Khi mảng có sức chứa 1000 mà chỉ dùng 5 ô, chỉ duyệt 5 phần tử đã nhập, không đọc các ô còn lại như dữ liệu hợp lệ.

## Luyện tập

- Với dãy ví dụ, tìm giá trị nhỏ nhất và đếm số phần tử bằng 7; kết quả là -4 và 2.
- Tìm vị trí đầu tiên đạt giá trị lớn nhất; phân biệt yêu cầu này với chỉ tìm giá trị.
- Thử dãy toàn âm, một phần tử, nhiều phần tử bằng nhau và dãy không có phần tử thỏa điều kiện đếm.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao dãy 5 phần tử không được truy cập `a[5]` khi đánh số từ 0?
>
> **Trả lời:** Năm vị trí hợp lệ là 0, 1, 2, 3, 4. Chỉ số 5 nằm sau phần tử cuối. Điều kiện duyệt `i < n` giữ chỉ số trong phạm vi; `i <= n` sẽ thực hiện thêm một lần truy cập không hợp lệ.

> **Câu hỏi 2:** Khởi tạo số lớn nhất bằng 0 có đúng với mọi dãy không?
>
> **Trả lời:** Không. Dãy toàn âm có thể cho kết quả 0 không thuộc dữ liệu. Với dãy không rỗng, khởi tạo bằng phần tử đầu rồi cập nhật là cách giữ ý nghĩa “lớn nhất trong các phần tử đã gặp”.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
