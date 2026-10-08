Khi dữ liệu gồm các giá trị nguyên trong một miền nhỏ, ta có thể dùng chính giá trị làm chỉ số của một bảng đếm. Mảng thống kê lưu số lần xuất hiện của từng giá trị, giúp trả lời nhanh câu hỏi “có bao nhiêu số bằng x?” hoặc tìm giá trị xuất hiện nhiều nhất. Cách tổ chức này dựa vào miền giá trị, khác với mảng lưu dãy theo thứ tự nhập.

## Tư duy

- Tách vị trí phần tử trong dãy khỏi giá trị dùng để tra bảng thống kê.
- Nhận ra khi thứ tự ban đầu không cần thiết cho yêu cầu đếm.
- Kiểm tra miền giá trị trước khi dùng nó như một chỉ số.
- Giữ quy luật: sau khi xét một phần dãy, mỗi ô đếm phản ánh đúng số lần gặp giá trị tương ứng.

## Nội dung học

- Khởi tạo bảng đếm bằng 0 và tăng `dem[x]` khi gặp giá trị `x`.
- Đếm tần suất, số giá trị có xuất hiện và số giá trị xuất hiện đúng một lần.
- Tìm giá trị có tần suất cao nhất và quy tắc xử lý khi bằng nhau.
- Ánh xạ miền âm nhỏ bằng độ lệch nếu cần; không truy cập chỉ số âm.
- Chi phí theo độ dài dãy và kích thước miền, giới hạn bộ nhớ khi giá trị lớn.

## Đổi góc nhìn từ vị trí sang giá trị

Cho dãy `2, 0, 2, 5, 0, 2`, mọi giá trị thuộc 0 đến 6. Mảng dãy giữ sáu vị trí; mảng đếm cần bảy ô, mỗi ô ứng với một **giá trị** có thể xuất hiện.

| Giá trị | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Số lần xuất hiện | 2 | 0 | 3 | 0 | 0 | 1 | 0 |

`dem[2] = 3` nghĩa là số 2 xuất hiện ba lần, không phải phần tử ở vị trí 2 có giá trị 3. Đây là khác biệt quan trọng giữa hai mảng cùng sử dụng cú pháp dấu ngoặc vuông.

## Xây bảng bằng một lượt duyệt

Phần mã trong `main`, với bảng có đủ chỗ cho miền 0 đến 6:

```cpp
int a[] = {2, 0, 2, 5, 0, 2};
int dem[7] = {};

for (int i = 0; i < 6; ++i) {
    ++dem[a[i]];
}
```

Khởi tạo `{}` đặt các ô về 0. Mỗi lần gặp một phần tử, chỉ ô ứng với giá trị ấy tăng 1. Tổng các ô đếm cuối cùng bằng 6, chính là số phần tử đã xử lý; đây là một cách kiểm tra đơn giản nhưng không thay việc kiểm tra từng tần suất.

```diagram
Gặp 2 → tăng ô dem[2]
Gặp 0 → tăng ô dem[0]
Gặp 2 → ô dem[2] tăng thêm, không tạo ô mới
```

Trước mỗi lượt, bảng đúng cho các phần tử đã đi qua. Tăng đúng ô của phần tử mới mở rộng bảng sang thêm một phần tử. Không ô nào khác cần thay đổi, vì lần gặp mới không làm tăng số lượng của giá trị khác.

## Tìm tần suất lớn nhất và xử lý bằng nhau

Sau thống kê, duyệt các giá trị từ 0 đến 6. Đoạn sau trong `main` dùng bảng `dem` vừa xây:

```cpp
int nhieu_nhat = 0;
for (int x = 1; x <= 6; ++x) {
    if (dem[x] > dem[nhieu_nhat]) {
        nhieu_nhat = x;
    }
}
```

Kết quả là giá trị 2, có tần suất 3. Vì duyệt tăng dần và chỉ thay khi **lớn hơn**, nếu nhiều giá trị có cùng tần suất lớn nhất, đoạn mã giữ giá trị nhỏ nhất. Dùng `>=` sẽ thay bằng giá trị đến sau, tức giá trị lớn hơn trong thứ tự duyệt này.

Nếu dãy rỗng, tất cả ô bằng 0; giá trị 0 mà đoạn mã giữ không thể được gọi là “giá trị xuất hiện nhiều nhất trong dữ liệu”. Cần kiểm tra có dữ liệu hoặc tần suất lớn nhất dương trước khi kết luận.

## Điều kiện áp dụng và chi phí

Với `n` phần tử và miền gồm `M + 1` giá trị từ 0 đến `M`, khởi tạo/duyệt bảng cần `O(M)`, đọc dữ liệu cần `O(n)`; tổng thời gian `O(n + M)`, bộ nhớ `O(M)`. Sau chuẩn bị, hỏi tần suất một giá trị trong miền chỉ mất `O(1)`.

Nếu giá trị nằm từ -10 đến 10, có thể dùng ô `x + 10`, đủ 21 ô; khi xuất kết quả phải chuyển lại `chi_so - 10`. Nếu giá trị đến một tỷ nhưng chỉ có vài phần tử, cấp phát một ô cho mọi giá trị là không hợp lý. Khi ấy cần cách lưu khác được học trong các chủ đề cấu trúc dữ liệu; không tăng mảng vô hạn để giữ cùng mẫu.

Mọi phần tử phải nằm trong miền đã cấp phát. Bảng đếm cũng cần kiểu đủ rộng nếu số phần tử rất lớn. Chạy nhiều bộ dữ liệu phải đặt lại bảng, nếu không kết quả của bộ trước sẽ bị cộng sang bộ sau.

## Luyện tập

- Với dãy ví dụ, đếm số giá trị có xuất hiện và số giá trị xuất hiện đúng một lần: 3 và 1.
- Thống kê điểm nguyên 0–10 bằng bảng 11 ô, rồi hỏi tần suất của một điểm.
- Tạo dữ liệu hai giá trị có cùng tần suất cao nhất và giải thích quy tắc chọn theo dấu `>` hoặc `>=`.

## Tự kiểm tra

> **Câu hỏi 1:** Dãy có 6 phần tử thì bảng đếm có bắt buộc chỉ cần 6 ô không?
>
> **Trả lời:** Không. Số ô phụ thuộc miền giá trị dùng làm chỉ số. Với giá trị 0 đến 6 cần 7 ô, dù dãy chỉ có 6 phần tử. Độ dài dãy và kích thước miền là hai đại lượng khác nhau.

> **Câu hỏi 2:** Vì sao không dùng trực tiếp giá trị đến một tỷ làm chỉ số khi chỉ có ít phần tử?
>
> **Trả lời:** Bảng trực tiếp cần chỗ cho toàn miền và mất công khởi tạo/duyệt miền đó. Chi phí `O(M)` có thể quá lớn so với lượng dữ liệu thật; cần cấu trúc lưu các giá trị xuất hiện thay vì cấp một ô cho mọi giá trị khả dĩ.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
