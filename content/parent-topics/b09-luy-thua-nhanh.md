Tính `a` nhân với chính nó một tỷ lần là một vòng lặp dễ viết nhưng khó chạy kịp. Lũy thừa nhanh thay việc làm từng phép nhân bằng việc tận dụng kết quả đã có: biết `a²` thì bình phương nó sẽ được `a⁴`, rồi `a⁸`. Bài học tập trung cách tổ chức các phép nhân, không cần lưu số nguyên có kích thước khổng lồ.

## Tư duy

- Nhìn số mũ như một lượng công việc có thể chia đôi qua mỗi bước.
- Tách phần đã tích lũy và phần còn phải xử lý để mô tả trạng thái vòng lặp.
- Dùng biểu diễn nhị phân của số mũ để xác định những lũy thừa cần chọn.
- Phân biệt tốc độ thuật toán với độ an toàn của phép nhân trong kiểu dữ liệu.

## Nội dung học

- Công thức `a^(2k) = (a^k)²` và `a^(2k + 1) = a * (a^k)²`.
- Thuật toán bình phương và nhân bằng vòng lặp; kiểm tra số mũ lẻ và chia nguyên cho 2.
- Tính lũy thừa modulo; khởi tạo kết quả cho số mũ bằng 0.
- Phân tích `O(log(b + 1))` bước và giới hạn của tích trung gian.

## Chọn các lũy thừa cần thiết

Xét `3^13`. Cách trực tiếp nhân thêm 3 liên tiếp, cần số phép nhân tăng theo 13. Nhưng `13 = 8 + 4 + 1`, nên cũng có thể tính `3^1`, `3^2`, `3^4`, `3^8` bằng ba lần bình phương, rồi chọn các lũy thừa tương ứng 1, 4, 8.

Tổng quát, mỗi số mũ không âm có một biểu diễn nhị phân duy nhất. Chia số mũ cho 2 lấy dư sẽ cho biết bit cuối: dư 1 nghĩa là chọn cơ số hiện tại vào kết quả; thương là phần số mũ còn lại. Sau đó, bình phương cơ số để chuyển sang trọng số tiếp theo.

Với modulo 17, phép tính có thể truy vết như sau:

| Trước lượt | Số mũ còn lại | Cơ số hiện tại | Kết quả đang giữ | Xử lý |
|---|---:|---:|---:|---|
| 1 | 13 | 3 | 1 | Lẻ: kết quả thành 3; bình phương cơ số thành 9 |
| 2 | 6 | 9 | 3 | Chẵn: giữ 3; cơ số thành 13 |
| 3 | 3 | 13 | 3 | Lẻ: kết quả thành 5; cơ số thành 16 |
| 4 | 1 | 16 | 5 | Lẻ: kết quả thành 12; số mũ về 0 |

Kết quả là `3^13 mod 17 = 12`. Trong bảng, mỗi phép nhân đều lấy số dư ngay sau khi tính.

## Cài đặt và điều kiện số học

Đoạn mã dưới dùng `long long`, số mũ `b >= 0` và `1 <= m <= 1 000 000 007`. Sau chuẩn hóa, mỗi thừa số nhỏ hơn `m`; tích của hai thừa số vì thế nằm trong miền biểu diễn của `long long`.

```cpp
long long luy_thua_mod(long long a, long long b, long long m) {
    a %= m;
    if (a < 0) a += m;
    long long ket_qua = 1 % m;

    while (b > 0) {
        if (b % 2 == 1) ket_qua = ket_qua * a % m;
        a = a * a % m;
        b /= 2;
    }
    return ket_qua;
}
```

Nếu modulo lớn hơn giới hạn trên, không được giữ phép nhân này một cách máy móc. Có thể thay mỗi phép nhân bằng hàm nhân modulo an toàn ở bài sau; khi đó chi phí cũng thay đổi.

### Vì sao vòng lặp đúng?

Gọi cơ số và số mũ ban đầu là `A`, `B`. Trước mỗi lượt, tích `ket_qua * a^b` luôn đồng dư với `A^B`. Nếu `b = 2k`, thay `a` bằng `a²`, `b` bằng `k` vẫn giữ tích đó. Nếu `b = 2k + 1`, chuyển một thừa số `a` sang kết quả rồi xử lý `2k` theo cách trên cũng giữ nguyên giá trị. Khi `b = 0`, toàn bộ đáp án đã nằm trong `ket_qua`.

Số mũ giảm một nửa mỗi lượt, nên thuật toán dừng sau `O(log(b + 1))` lượt và dùng `O(1)` bộ nhớ phụ. Với `b = 0`, đáp án là `1 mod m`; vì thế `m = 1` phải trả 0. Trường hợp `0^0` ở đây sử dụng quy ước tích rỗng bằng 1; nếu đề định nghĩa khác thì xử lý theo đề.

## Minh họa và luyện tập

[Video Binary Exponentiation — Errichto Algorithms](https://www.youtube.com/watch?v=L-Wzglnm4dM).

Để đối chiếu ý tưởng khi xem video, hãy nối chuỗi `3 → 9 → 81 → 6561` với các số mũ `1 → 2 → 4 → 8`, rồi đánh dấu 1, 4, 8 trong biểu diễn `13 = 1101₂`. Ba nhánh được chọn chính là ba thừa số xây nên đáp án.

- Tìm chữ số tận cùng của một lũy thừa bằng modulo 10.
- Tính kết quả cho số mũ 0, 1, một số chẵn và một số lẻ; so sánh với nhân trực tiếp trên dữ liệu nhỏ.
- Giải thích vì sao gọi hai lần để tính cùng `a^(b/2)` sẽ làm mất lợi ích tái sử dụng nếu cài bằng đệ quy.

## Tự kiểm tra

> **Câu hỏi 1:** Một lượt xử lý số mũ lẻ giữ tính đúng bằng cách nào?
>
> **Trả lời:** Với `b = 2k + 1`, đưa một thừa số `a` vào kết quả, rồi thay phần còn lại `a^(2k)` bằng `(a²)^k`. Tích cần tính không thay đổi.

> **Câu hỏi 2:** Khi thay phép nhân trực tiếp bằng nhân modulo chia đôi, chi phí còn `O(log b)` không?
>
> **Trả lời:** Không nói như vậy được. Mỗi phép nhân có thể tốn `O(log m)` bước sau chuẩn hóa; tổng chi phí là `O(log(b + 1) * log(m + 1))` theo mô hình phép toán số nguyên cố định.

## Nguồn tham khảo thêm

- [USACO Guide — Modular Arithmetic](https://usaco.guide/gold/modular)
- [CP Algorithms — Binary Exponentiation](https://cp-algorithms.com/algebra/binary-exp.html)
- [Viblo Algorithm — Phép nhân Ấn Độ, bình phương và nhân](https://viblo.asia/p/phep-nhan-an-do-thuat-toan-binh-phuong-va-nhan-gDVK2dmrlLj)
