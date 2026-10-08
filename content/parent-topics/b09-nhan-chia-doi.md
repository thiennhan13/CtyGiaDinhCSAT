Lấy số dư sau một phép nhân không giúp ích nếu phép nhân đã vượt khả năng biểu diễn của máy. Nhân bằng chia đôi và nhân đôi, còn gọi là phép nhân Ấn Độ, tổ chức tích thành các phép cộng có kiểm soát. Bài này bổ sung mắt xích còn thiếu khi modulo quá lớn để nhân trực tiếp bằng `long long`.

## Tư duy

- Biến một tích thành tổng của một số lượng nhỏ các bội đã biết.
- Dùng tính chẵn lẻ để quyết định giữ lại phần đóng góp nào.
- Tách tính đúng về toán học khỏi tính an toàn của từng phép cộng trên máy.
- Đọc rõ miền giá trị đầu vào trước khi áp dụng một hàm mẫu.

## Nội dung học

- Phân rã `b = 2k` hoặc `b = 2k + 1` trong tích `a * b`.
- Vòng lặp chia đôi thừa số thứ hai và nhân đôi thừa số thứ nhất.
- Phép cộng modulo không tràn với hai số đã chuẩn hóa.
- Liên hệ với lũy thừa nhanh và đánh giá chi phí khi kết hợp hai kỹ thuật.

## Một tích dưới dạng các hàng đóng góp

Tính `13 * 11`. Nếu cộng số 13 liên tiếp 11 lần thì có thể làm đúng, nhưng mỗi lần chỉ giảm số lần cần cộng đi 1. Viết `11 = 8 + 2 + 1` cho phép chọn `13 * 8`, `13 * 2`, `13 * 1`.

| Thừa số còn lại | Bội hiện tại | Chẵn/lẻ | Có cộng vào kết quả? |
|---:|---:|---|---|
| 11 | 13 | Lẻ | Có: kết quả 13 |
| 5 | 26 | Lẻ | Có: kết quả 39 |
| 2 | 52 | Chẵn | Không |
| 1 | 104 | Lẻ | Có: kết quả 143 |

Mỗi lượt làm hai việc: nếu thừa số còn lại lẻ thì lấy một bội hiện tại; sau đó chia thừa số cho 2 và nhân bội lên 2. Khi cần modulo 17, có thể giữ các bội và tổng dưới dạng số dư: các bội lần lượt là 13, 9, 1, 2; đáp án cuối là 7.

## Không chỉ tránh phép nhân

Nếu `m` gần giới hạn của `long long`, biểu thức `(a + a) % m` vẫn có thể tràn. Vì thế phải xây phép cộng an toàn trước. Với `0 <= a, b < m`, nếu `a >= m - b`, đáp án là `a - (m - b)`; ngược lại, `a + b < m`, nên phép cộng an toàn.

Hàm dưới nhận hai thừa số không âm, `1 <= m <= LLONG_MAX`. Các giá trị đều nằm trong miền `long long`; không dùng phiên bản này cho số âm chưa chuẩn hóa.

```cpp
long long cong_mod(long long a, long long b, long long m) {
    if (a >= m - b) return a - (m - b);
    return a + b;
}

long long nhan_mod(long long a, long long b, long long m) {
    a %= m;
    b %= m;
    long long ket_qua = 0;

    while (b > 0) {
        if (b % 2 == 1) ket_qua = cong_mod(ket_qua, a, m);
        a = cong_mod(a, a, m);
        b /= 2;
    }
    return ket_qua;
}
```

Rút gọn `b` theo `m` không làm đổi số dư của tích và có thể giảm số lượt. Mỗi lời gọi `cong_mod` giữ giá trị trong `[0, m - 1]`, nên điều kiện của lượt tiếp theo được bảo toàn.

### Tính đúng và chi phí

Trước mỗi lượt, `ket_qua + a * b` đồng dư với tích ban đầu. Nếu `b` chẵn, thay `a * b` bằng `(2a) * (b/2)` không đổi giá trị. Nếu `b` lẻ, chuyển một `a` sang kết quả rồi xử lý phần chẵn còn lại. Khi `b = 0`, kết quả đang giữ chính là đáp án.

Sau chuẩn hóa, số lượt là `O(log(m + 1))`; bộ nhớ phụ `O(1)`. Với modulo nhỏ và tích chắc chắn không tràn, phép nhân trực tiếp thường đơn giản và nhanh hơn. Kỹ thuật này hữu ích khi yêu cầu độ an toàn của số lớn buộc ta tránh phép nhân trực tiếp.

`m = 1`, thừa số bằng 0 đều cho 0 ngay. Với số âm, trước hết dùng hàm chuẩn hóa ở bài Modulo; không lấy trị tuyệt đối một cách tùy tiện vì trị tuyệt đối của giá trị nhỏ nhất có dấu có thể không biểu diễn được.

## Luyện tập và liên hệ

- Lập bảng chia đôi để tính `18 * 25`, rồi đối chiếu với phép nhân thông thường.
- Tính tích modulo 97 cho các số nhỏ bằng cả hai cách.
- Dùng `nhan_mod` thay hai phép nhân trong lũy thừa nhanh; phân tích vì sao mỗi lượt lũy thừa lúc này đắt hơn.

## Tự kiểm tra

> **Câu hỏi 1:** Tại sao không được dùng `(a + a) % m` khi `m` rất lớn?
>
> **Trả lời:** Hai số dư đều nhỏ hơn `m` nhưng tổng có thể gần `2m`, vượt miền của kiểu số. Cần viết phép cộng tránh tạo tổng đó trước khi rút gọn.

> **Câu hỏi 2:** Điều gì được giữ nguyên khi thừa số thứ hai lẻ?
>
> **Trả lời:** Với `b = 2k + 1`, tổng `ket_qua + a * b` được viết thành `(ket_qua + a) + (2a) * k`. Vì vậy, phần đã cộng và phần còn xử lý vẫn biểu diễn đúng tích ban đầu theo modulo.

## Nguồn tham khảo thêm

- [Viblo Algorithm — Phép nhân Ấn Độ, bình phương và nhân](https://viblo.asia/p/phep-nhan-an-do-thuat-toan-binh-phuong-va-nhan-gDVK2dmrlLj)
- [USACO Guide — Modular Arithmetic](https://usaco.guide/gold/modular)
