Khi cộng nhiều số, đọc một dãy hoặc xử lý từng ô của một bảng, chương trình lặp lại những thao tác có cấu trúc giống nhau. Vòng lặp diễn đạt quy luật đó bằng một nhóm câu lệnh và xác định lúc tiếp tục, lúc dừng. Hiểu sự thay đổi sau mỗi lượt giúp học sinh tự kiểm tra chương trình, thay vì chỉ nhớ mẫu viết `for` và `while`.

## Tư duy

- Nhận ra thao tác được lặp và đại lượng thay đổi giữa các lượt.
- Xác định trạng thái ban đầu, điều kiện tiếp tục và bước cập nhật trước khi viết mã.
- Theo dõi biến kết quả để giải thích điều chương trình đã tính sau một số lượt.
- Phân biệt lặp theo số lần với lặp đến khi điều kiện không còn đúng, kể cả trường hợp không có lượt nào.

## Nội dung học

- `for`: khởi tạo, kiểm tra điều kiện, thực hiện thân lặp rồi cập nhật.
- `while`: kiểm tra trước mỗi lượt và thay đổi trạng thái để tiến đến lúc dừng.
- Cộng dồn, đếm, kiểm tra điều kiện và xuất dữ liệu trong thân lặp.
- Vòng lặp lồng nhau, biến riêng cho từng tầng và vị trí câu lệnh ngoài vòng trong.
- Cận đầu/cuối, số lượt, kiểu dữ liệu và lỗi không dừng hoặc thiếu/thừa một lượt.

## Tính tổng từ 1 đến `n`

Với `n = 6`, tổng cần tìm là `1 + 2 + 3 + 4 + 5 + 6 = 21`. Viết sáu phép cộng riêng chỉ giải được dữ liệu cố định. Ta cần mô tả: bắt đầu từ 1, cộng số đang xét rồi chuyển sang số kế tiếp.

Phần mã đặt trong `main`; `n` đã được nhập và `0 ≤ n ≤ 1 000 000`:

```cpp
long long tong = 0;
for (int i = 1; i <= n; ++i) {
    tong += i;
}
```

`i` điều khiển số đang xét, còn `tong` lưu kết quả tích lũy. Hai biến không có cùng vai trò. Dùng `long long` cho tổng vì tổng có thể vượt giới hạn `int` dù `n` vẫn vừa kiểu này.

| Lượt | Số được cộng | Tổng trước lượt | Tổng sau lượt |
|---|---:|---:|---:|
| 1 | 1 | 0 | 1 |
| 2 | 2 | 1 | 3 |
| 3 | 3 | 3 | 6 |
| 4 | 4 | 6 | 10 |
| 5 | 5 | 10 | 15 |
| 6 | 6 | 15 | 21 |

Sau lượt cuối, `i` thành 7 và điều kiện `i <= n` sai, nên không có lần cộng thứ bảy. Nếu `n = 0`, điều kiện đã sai ngay từ đầu và tổng rỗng vẫn bằng 0.

Trước lượt xét `i`, `tong` chứa tổng từ 1 đến `i - 1`. Thêm `i` làm nó chứa tổng từ 1 đến `i`. Quy luật đúng từ trạng thái ban đầu và được giữ sau mỗi lượt, nên lúc kết thúc ta có đúng tổng đến `n`.

Có thể xem [CS50 Shorts — Loops](https://www.youtube.com/watch?v=WgX8e_O7eG8) để theo dõi điều kiện và bước cập nhật trong một vòng lặp, rồi tự lập lại bảng cho ví dụ tổng ở trên.

## Khi dữ liệu quyết định số lượt

Để cộng chữ số của một số không âm, lấy chữ số cuối bằng `% 10` rồi bỏ nó bằng chia nguyên `/ 10`. `while` diễn đạt việc tiếp tục khi số còn chữ số chưa xử lý.

```cpp
long long x = 4020;
int tong_chu_so = 0;
while (x > 0) {
    tong_chu_so += x % 10;
    x /= 10;
}
```

Đây là phần mã trong `main`. `x` lần lượt là `4020 → 402 → 40 → 4 → 0`; chữ số lấy ra là `0, 2, 0, 4`, tổng bằng 6. Mỗi lượt bỏ một chữ số nên vòng lặp dừng. Nếu quên `x /= 10`, điều kiện không thay đổi và chương trình không tiến đến kết thúc.

Với `x = 0`, không lượt nào chạy và tổng bằng 0, vẫn đúng. Nhưng nếu đổi yêu cầu thành đếm chữ số, phải nhớ số 0 có một chữ số; số lượt của đoạn trên không tự giải được yêu cầu mới đó.

## Từng hàng và từng ô

Một bảng 3 hàng, 4 cột cần 12 lượt xử lý ô. Vòng ngoài chọn hàng; với mỗi hàng, vòng trong bắt đầu lại từ cột đầu. Đoạn mã trong `main` cần `<iostream>`:

```cpp
for (int hang = 1; hang <= 3; ++hang) {
    for (int cot = 1; cot <= 4; ++cot) {
        cout << hang * cot << ' ';
    }
    cout << '\n';
}
```

```text
1 2 3 4
2 4 6 8
3 6 9 12
```

Xuống dòng nằm ngoài vòng cột nhưng trong vòng hàng vì chỉ thực hiện sau khi in đủ một hàng. Đặt nó trong vòng cột sẽ làm mỗi ô xuống một dòng. Vị trí một câu lệnh trong các tầng lặp thể hiện thời điểm công việc đó cần xảy ra.

## Chi phí và kiểm tra

Cộng từ 1 đến `n` có thời gian `O(n)`, bộ nhớ phụ `O(1)`. Xử lý chữ số mất một lượt cho mỗi chữ số. Bảng `h` hàng, `c` cột có `h × c` lượt; không phải cứ lồng hai vòng thì mặc nhiên là `O(n²)`.

Thử `n = 0`, `n = 1` và một số nhỏ tính tay được. Viết `i < n` bỏ số cuối; chọn bước cập nhật không phù hợp có thể bỏ dữ liệu hoặc không dừng. Với các cận rất lớn, cần xét cả việc tăng biến ở lượt cuối và giới hạn thời gian, không chỉ khả năng lưu kết quả.

## Luyện tập

- Tính tổng số chẵn từ 1 đến `n`, so sánh duyệt mọi số với tăng biến mỗi lần 2.
- Đếm chữ số khác 0 của số không âm; thử `0`, `1000`, `4020`.
- In bảng kích thước được nhập; giải thích vị trí xuống dòng và số lượt trước khi chạy.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao vòng `for` tính tổng vẫn đúng khi `n = 0`?
>
> **Trả lời:** Điều kiện `1 <= 0` sai trước lượt đầu nên thân lặp không chạy. Tổng khởi tạo bằng 0 chính là tổng của một dãy rỗng. Đây cũng là lý do cần chọn giá trị ban đầu theo ý nghĩa biến kết quả.

> **Câu hỏi 2:** Hai vòng lồng nhau có luôn cần `O(n²)` thời gian không?
>
> **Trả lời:** Không. Phải đếm cận và công việc của từng vòng. Nếu vòng ngoài có `h` lượt, vòng trong có `c` lượt mỗi lần thì tổng là `h × c`; `O(n²)` chỉ phù hợp khi cả hai cùng có số lượt tỷ lệ với `n` và mỗi lượt xử lý có chi phí hằng số.

## Nguồn tham khảo thêm

- [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/)
- [VNOI — Độ phức tạp tính toán](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/computational-complexity.md)
- [CS50 Shorts — Loops (video)](https://www.youtube.com/watch?v=WgX8e_O7eG8)
