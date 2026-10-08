Một bảng điểm, bàn cờ hoặc ma trận cần hai chỉ số để xác định một ô: hàng và cột. Mảng hai chiều mở rộng việc duyệt dãy sang duyệt bảng, đồng thời giúp học sinh mô tả các đường chéo và phép xoay bằng quan hệ tọa độ. Trọng tâm là biết ô nào đang được xử lý và nó phải chuyển đến đâu.

## Tư duy

- Phân biệt số hàng với số cột, không dựa vào ví dụ bảng vuông để suy cho mọi bảng.
- Chọn thứ tự duyệt và giải thích mỗi ô được xét một lần.
- Mô tả một nhóm ô bằng điều kiện trên chỉ số, như đường chéo chính hay phụ.
- Suy ra tọa độ mới từ vị trí cũ khi xoay, rồi kiểm tra bốn góc và kích thước kết quả.

## Nội dung học

- Khai báo mảng hai chiều, đọc/ghi `a[i][j]`, chỉ số từ 0 và cận hàng/cột.
- Vòng lặp lồng nhau để nhập, xuất, tính tổng cả bảng hoặc từng hàng/cột.
- Đường chéo chính `i == j` và đường chéo phụ `i + j == n - 1` của bảng vuông.
- Xoay bảng 90 độ theo chiều kim đồng hồ bằng mảng kết quả riêng.
- Chi phí theo số ô và tránh ghi đè khi biến đổi dữ liệu.

## Đọc tọa độ trên bảng chữ nhật

Xét bảng 2 hàng, 3 cột:

| Hàng / Cột | 0 | 1 | 2 |
|---|---:|---:|---:|
| 0 | 1 | 2 | 3 |
| 1 | 4 | 5 | 6 |

`a[1][2]` có giá trị 6: hàng 1, cột 2. Chỉ số hàng hợp lệ là 0, 1; chỉ số cột là 0, 1, 2. Dùng cận 3 cho cả hai chiều sẽ cố đọc một hàng không tồn tại.

Trong `main`, tính tổng bằng một lượt qua từng ô:

```cpp
int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
long long tong = 0;

for (int i = 0; i < 2; ++i) {
    for (int j = 0; j < 3; ++j) {
        tong += a[i][j];
    }
}
```

Tổng bằng 21. Vòng ngoài lần lượt chọn từng hàng; vòng trong đi đủ ba cột của hàng ấy. Muốn tính tổng riêng từng hàng, biến tổng hàng phải được đặt lại bằng 0 ở đầu mỗi lượt vòng ngoài, thay vì cộng tiếp kết quả hàng trước.

## Đường chéo cần điều kiện nào?

Với bảng vuông 3 × 3, đường chéo chính gồm `(0,0), (1,1), (2,2)`, cùng có hàng bằng cột. Đường chéo phụ gồm `(0,2), (1,1), (2,0)`, cùng có tổng hai chỉ số bằng 2.

```diagram
Chéo chính             Chéo phụ
X . .                  . . X
. X .                  . X .
. . X                  X . .
```

Ở bảng vuông kích thước `n`, có thể duyệt chéo chính bằng `a[i][i]`, chéo phụ bằng `a[i][n - 1 - i]`. Nếu cộng cả hai đường chéo của bảng lẻ và muốn mỗi ô chỉ tính một lần, ô giữa thuộc cả hai phải được xử lý để không cộng trùng. Nếu đề hỏi hai tổng riêng, ô giữa xuất hiện trong cả hai tổng là đúng.

Khái niệm hai đường chéo theo công thức này đang xét bảng vuông; với bảng chữ nhật phải đọc rõ cách đề định nghĩa nhóm ô, không tự dùng công thức của bảng vuông.

## Xoay 90 độ: tìm vị trí mới

Khi xoay bảng 2 × 3 theo chiều kim đồng hồ, kết quả có 3 hàng, 2 cột:

| Hàng / Cột mới | 0 | 1 |
|---|---:|---:|
| 0 | 4 | 1 |
| 1 | 5 | 2 |
| 2 | 6 | 3 |

Cột cũ trở thành hàng mới. Hàng trên cùng của bảng cũ chuyển thành cột cuối bảng mới. Tổng quát, ô `(i, j)` của bảng `h × c` đến ô `(j, h - 1 - i)` của bảng `c × h`.

Với mảng `a` đã khai báo ở trên, đoạn riêng trong `main`:

```cpp
int b[3][2] = {};
for (int i = 0; i < 2; ++i) {
    for (int j = 0; j < 3; ++j) {
        b[j][2 - 1 - i] = a[i][j];
    }
}
```

Kiểm tra: số 1 ở `(0,0)` đến `(0,1)`; số 6 ở `(1,2)` đến `(2,0)`. Mỗi tọa độ cũ chuyển đến một tọa độ mới khác nhau, nên không mất hoặc nhân đôi ô. Dùng mảng riêng tránh việc ghi vào một ô của `a` trước khi giá trị cũ ở đó được chuyển.

## Chi phí và kiểm tra biên

Duyệt hoặc xoay bảng cần `O(h × c)` thời gian. Tính tổng cần `O(1)` bộ nhớ phụ; xoay bằng mảng riêng cần thêm `O(h × c)`. Duyệt một đường chéo bảng vuông cần `O(n)` lượt, không cần duyệt mọi ô rồi lọc nếu chỉ hỏi đường ấy.

Nên thử bảng 1 × 1, một hàng, một cột và một bảng chữ nhật. Với dữ liệu lớn, chọn kiểu chứa được tổng và kích thước phù hợp bộ nhớ. Khi đề cho bảng rỗng, không được truy cập một ô để khởi tạo kết quả.

## Luyện tập

- Tính tổng từng cột của bảng ví dụ: lần lượt 5, 7, 9.
- Với bảng 3 × 3 chứa các số 1 đến 9 theo hàng, tính hai tổng đường chéo và tổng hợp không đếm ô giữa hai lần.
- Xoay lại bảng kết quả thêm ba lần; kiểm tra sau bốn lần xoay có trở về bảng đầu không.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao bảng 2 × 3 sau xoay 90 độ có kích thước 3 × 2?
>
> **Trả lời:** Các cột cũ trở thành hàng mới và các hàng cũ trở thành cột mới. Công thức `(i,j) → (j,h-1-i)` cho `j` chạy qua `c` hàng mới, còn chỉ số cột mới chạy qua `h` giá trị.

> **Câu hỏi 2:** Cộng hai đường chéo của bảng vuông lẻ có luôn được cộng trực tiếp hai tổng không?
>
> **Trả lời:** Tùy yêu cầu. Nếu tính tổng các ô thuộc ít nhất một đường chéo, ô giữa chỉ được tính một lần nên phải trừ một lần giá trị đó. Nếu hỏi hai tổng riêng, ô giữa thuộc cả hai và không cần bỏ khỏi tổng nào.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
