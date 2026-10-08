Khi một đáp án có hàng trăm chữ số nhưng đề bài chỉ hỏi số dư, việc lưu toàn bộ đáp án là không cần thiết. Modulo giúp giữ lại thông tin mà bài toán thực sự sử dụng. Điều cần hiểu là phép biến đổi nào bảo toàn số dư, và phép biến đổi nào không được phép làm tùy tiện.

## Tư duy

- Phân biệt giá trị đầy đủ của một số với lớp số dư của nó theo một số chia đã chọn.
- Thay dữ liệu lớn bằng đại diện nhỏ khi các phép tính tiếp theo vẫn bảo toàn thông tin cần tìm.
- Xem xét tính đúng của một phép rút gọn trước khi đưa dấu `%` vào chương trình.
- Kiểm tra số âm, số chia bằng 1 và khả năng tràn của kết quả trung gian.

## Nội dung học

- Phép chia có dư `a = q * m + r`, với `m > 0` và số dư chuẩn `0 <= r < m`.
- Tính chất của phép cộng, trừ và nhân khi lấy modulo cùng một `m`.
- Chuẩn hóa kết quả `%` của số âm trong C++.
- Biểu diễn chu kỳ và cập nhật tổng lớn thông qua số dư.

## Từ chuyển động vòng tròn đến số dư

Một bảng có 7 vị trí, đánh số từ 0 đến 6. Từ vị trí 5, đi tiếp 10 bước theo chiều tăng số thì đến đâu? Đi từng bước cho kết quả đúng, nhưng khi số bước rất lớn, cách này làm nhiều công việc không cần thiết.

Mỗi 7 bước đưa ta về vị trí cũ. Vì vậy, 10 bước và 3 bước tạo cùng một chuyển động trên bảng. Vị trí cuối là `(5 + 3) % 7 = 1`.

| Số bước | Số vòng đủ 7 bước | Phần còn lại | Vị trí cuối |
|---:|---:|---:|---:|
| 3 | 0 | 3 | 1 |
| 10 | 1 | 3 | 1 |
| 17 | 2 | 3 | 1 |

Các số chênh nhau một bội của 7 có cùng số dư khi chia cho 7. Ký hiệu `a ≡ b (mod m)` đọc là “a đồng dư với b theo modulo m”; điều này có nghĩa `a - b` chia hết cho `m`.

## Vì sao có thể rút gọn trước khi tính?

Viết `a = q * m + r` và `b = k * m + s`. Tổng `a + b` bằng `(q + k) * m + (r + s)`. Phần là bội của `m` không ảnh hưởng đến số dư, nên ta chỉ cần xử lý `r + s`. Với phép nhân, khai triển cũng cho một phần là bội của `m` và phần còn lại `r * s`.

Do đó, có thể rút gọn từng bước khi cộng hoặc nhân. Chẳng hạn, cần số dư của `28 + 19 + 36` khi chia cho 9: ba số có số dư 1, 1, 0; kết quả là 2. Không cần giữ tổng 83 nếu bài toán chỉ hỏi số dư.

Điều này **không cho phép chia hai số dư như chia số nguyên**. Ví dụ, `8 / 2 = 4`, nhưng sau khi lấy modulo 5, `3 / 2` bằng 1 trong phép chia nguyên. Phép chia trong số học modulo cần điều kiện và công cụ riêng, ngoài phạm vi bài này.

## Chuẩn hóa số âm và cộng an toàn

C++ cho `-10 % 7 = -3`, trong khi số dư chuẩn của -10 theo modulo 7 là 4. Hai giá trị chênh nhau 7; cộng thêm `m` khi phần dư âm sẽ đưa nó về khoảng yêu cầu.

```cpp
// Điều kiện: m > 0.
long long chuan_hoa(long long a, long long m) {
    long long r = a % m;
    if (r < 0) r += m;
    return r;
}

// Điều kiện: 0 <= a, b < m.
long long cong_mod(long long a, long long b, long long m) {
    if (a >= m - b) return a - (m - b);
    return a + b;
}
```

Trong nhánh đầu, `a + b` ít nhất bằng `m`, nên đáp án là `a + b - m`; ta viết lại thành `a - (m - b)` để tránh thực hiện tổng có thể quá lớn. Ở nhánh sau, tổng nhỏ hơn `m`, nên phép cộng nằm trong miền biểu diễn của `long long` nếu `m` thuộc miền đó.

Với `m = 1`, mọi kết quả chuẩn hóa và phép cộng trên đều bằng 0. `m = 0` không hợp lệ: không được thực hiện `% 0`. Lấy modulo sau phép nhân cũng không sửa được một phép nhân đã tràn; vấn đề ấy được xử lý ở bài nhân bằng chia đôi và nhân đôi.

## Chi phí và luyện tập

Chuẩn hóa hoặc cộng hai số dư dùng số phép toán cố định, tức `O(1)` thời gian và bộ nhớ phụ. Xử lý tổng của `n` số bằng cách cập nhật số dư sau mỗi số có thời gian `O(n)` và bộ nhớ phụ `O(1)`.

- Tìm vị trí sau khi đi lùi 10 bước từ vị trí 2 trên vòng 7 ô.
- Tính số dư của tổng nhiều số; so sánh với phép tính trực tiếp trên dữ liệu nhỏ.
- Đếm các số thuộc cùng nhóm số dư và giải thích vì sao nhóm đó liên quan đến chu kỳ.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao rút gọn từng số hạng không làm thay đổi số dư của tổng?
>
> **Trả lời:** Mỗi số hạng chỉ bị bỏ đi một bội của số chia. Tổng các phần bị bỏ vẫn là một bội của số chia, nên số dư của tổng được giữ nguyên.

> **Câu hỏi 2:** Có thể dùng `(a * b) % m` với mọi giá trị `long long` không?
>
> **Trả lời:** Không. Phép nhân diễn ra trước `%` và có thể tràn. Cần chứng minh tích nằm trong miền biểu diễn hoặc dùng phép nhân modulo an toàn.

## Nguồn tham khảo thêm

- [USACO Guide — Modular Arithmetic](https://usaco.guide/gold/modular)
- [Viblo Algorithm — Phép nhân Ấn Độ, bình phương và nhân](https://viblo.asia/p/phep-nhan-an-do-thuat-toan-binh-phuong-va-nhan-gDVK2dmrlLj)
