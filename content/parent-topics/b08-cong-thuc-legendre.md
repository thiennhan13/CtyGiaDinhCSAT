Giai thừa `n!` là tích từ 1 đến `n`, tăng rất nhanh ngay cả khi `n` chưa lớn. Nếu chỉ muốn biết một nguyên tố xuất hiện bao nhiêu lần trong tích đó, ta không cần tính giai thừa. Công thức Legendre đếm các thừa số theo từng lớp bội, từ đó có kết quả chính xác mà không phải lưu một số khổng lồ.

## Tư duy

- Phân biệt giá trị của một tích với số lần một nguyên tố xuất hiện trong tích ấy.
- Đếm phần đóng góp đầu tiên của các bội `p`, rồi các phần bổ sung từ bội `p²`, `p³`.
- Giải thích vì sao một số có thể được đếm nhiều lớp mà không phải lỗi đếm trùng.
- Chọn cách chia liên tiếp để tránh tạo các lũy thừa lớn vượt giới hạn.

## Nội dung học

- Giai thừa, quy ước `0! = 1` và số mũ của nguyên tố trong phân tích một số.
- Công thức `floor(n/p) + floor(n/p²) + …` khi `p` là nguyên tố.
- Lý do mỗi lớp bội thêm một thừa số và điều kiện dừng khi thương bằng 0.
- Cài bằng chia nguyên liên tiếp, kiểu `long long` và giả thiết đầu vào.
- Số chữ số 0 cuối giai thừa trong hệ thập phân và giới hạn khi dùng cơ số hợp số.

## Đếm thừa số 2 trong `10!`

Không cần tính `10!`; hãy xem mỗi số từ 1 đến 10 đóng góp bao nhiêu thừa số 2:

| Số | Phần liên quan đến 2 | Số thừa số 2 |
|---:|---|---:|
| 2 | `2` | 1 |
| 4 | `2²` | 2 |
| 6 | `2 × 3` | 1 |
| 8 | `2³` | 3 |
| 10 | `2 × 5` | 1 |

Các số lẻ không đóng góp 2. Tổng là `1 + 2 + 1 + 3 + 1 = 8`. Đó là số mũ của 2 trong phân tích `10!`, không phải số lượng số chẵn, cũng không phải giá trị của `10!`.

## Đếm theo lớp bội

Có 5 số chia hết cho 2: `2, 4, 6, 8, 10`; mỗi số cho ít nhất một thừa số 2. Trong đó có 2 số chia hết cho 4: `4, 8`; mỗi số cho thêm một thừa số. Có 1 số chia hết cho 8: `8`; nó cho thêm lần thứ ba.

| Lớp | Số phần tử trong 1 đến 10 | Đóng góp thêm |
|---|---:|---:|
| Bội 2 | `floor(10/2) = 5` | 5 thừa số |
| Bội 4 | `floor(10/4) = 2` | 2 thừa số |
| Bội 8 | `floor(10/8) = 1` | 1 thừa số |
| Bội 16 | 0 | Dừng |

Tổng `5 + 2 + 1 = 8` khớp cách đếm từng số. Số 8 xuất hiện ở cả ba lớp là đúng: nó có ba thừa số 2 và mỗi lớp ghi nhận **một lần đóng góp khác nhau**.

Với nguyên tố bất kỳ `p`, số mũ trong `n!` là:

```text
floor(n/p) + floor(n/p²) + floor(n/p³) + ...
```

Một số chứa đúng `e` thừa số `p` được tính trong đúng `e` lớp, từ bội `p` đến bội `p^e`. Do đó tổng các lớp vừa đủ tổng số thừa số, không thiếu và không thừa.

## Cài bằng chia liên tiếp

Hàm đặt ngoài `main`, giả sử `n ≥ 0`, `p` là nguyên tố và cả hai vừa `long long`:

```cpp
long long so_mu_trong_giai_thua(long long n, long long p) {
    long long ket_qua = 0;

    while (n > 0) {
        n /= p;
        ket_qua += n;
    }
    return ket_qua;
}
```

Gọi với `(10,2)` trả 8; `(10,5)` trả 2. Sau mỗi phép chia, `n` lần lượt là phần nguyên của số ban đầu chia cho `p, p², p³, …`. Chia nguyên liên tiếp với số không âm cho đúng các thương này.

Ta không cần biến lưu `p^k` rồi nhân tiếp với `p`. Cách chia tránh tình huống lũy thừa vượt giới hạn trước khi chương trình kịp kiểm tra nó đã lớn hơn số đầu vào. Với nguyên tố `p ≥ 2`, số mũ không vượt `n` ban đầu, nên tổng nằm trong giới hạn kiểu chứa `n`.

## Ứng dụng: những số 0 ở cuối

Một số 0 cuối trong hệ thập phân đến từ một thừa số 10, tức một cặp 2 và 5. Trong giai thừa có ít nhất đủ thừa số 2 để ghép với mọi thừa số 5, nên số lượng 0 cuối bằng số mũ của 5.

Với `25!`, số 5 xuất hiện `floor(25/5) + floor(25/25) = 5 + 1 = 6` lần. Số 25 đóng góp hai thừa số 5, vì thế chỉ đếm các bội 5 sẽ thiếu một lần. Không cần tính giá trị `25!` để tìm sáu số 0 cuối.

Nếu hỏi số mũ của 4 trong giai thừa, không thay `p = 4` vào công thức nguyên tố. Phải tính số mũ của 2 rồi chia nguyên cho 2, vì mỗi thừa số 4 cần hai thừa số 2. Với hợp số nhiều nguyên tố, từng thành phần đặt một giới hạn riêng.

## Chi phí và điều kiện

Mỗi lượt chia cho ít nhất 2 làm số đang xét nhỏ đi, có `O(log_p n)` lượt khi `n` dương và bộ nhớ phụ `O(1)`. `n = 0` không chạy lượt nào, trả 0, phù hợp vì `0! = 1` không chứa thừa số nguyên tố.

Hàm không tự kiểm tra `p` có nguyên tố hay không; đó là điều kiện của lời gọi. `p = 1` khiến số không giảm và không dừng; `p = 0` làm phép chia không hợp lệ. Cơ số hợp số có thể cho một kết quả số nhưng không mang ý nghĩa số mũ mà bài đang định nghĩa.

## Luyện tập

- Đếm số mũ của 3 trong `10!`: `3 + 1 = 4`.
- Tìm số 0 cuối của `100!`: `20 + 4 = 24`.
- Với `8!`, số mũ của 2 là 7; suy ra số mũ lớn nhất của 4 chia hết `8!` là 3, rồi đối chiếu việc thay thẳng 4 vào công thức để thấy sai khác.

## Tự kiểm tra

> **Câu hỏi 1:** Đếm số 8 trong cả lớp bội 2, 4, 8 có phải đếm trùng không?
>
> **Trả lời:** Không. Mỗi lớp ghi thêm một thừa số 2 khác nhau của `8 = 2³`. Tổng cần đếm số thừa số trong tích, không phải số phần tử được chia hết cho 2; số có số mũ `e` phải đóng góp đúng `e` lần.

> **Câu hỏi 2:** Có dùng trực tiếp công thức Legendre với `p = 4` để tìm số mũ của 4 không?
>
> **Trả lời:** Không. Công thức đang đếm thừa số nguyên tố. Với 4, phải tính số mũ của 2 rồi chia nguyên cho 2. Ví dụ `8!` có bảy thừa số 2 nên chứa được ba thừa số 4, còn tổng `floor(8/4) + floor(8/16)` chỉ là 2.

## Nguồn tham khảo thêm

- [VNOI — Giai thừa modulo p, công thức Legendre](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/factorial-modulo-prime.md)
- [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility)
- [Viblo Algorithm — Công thức toán học và tính chất số học đặc biệt, phần 1](https://viblo.asia/p/cong-thuc-toan-hoc-va-tinh-chat-so-hoc-dac-biet-phan-1-gAm5y7gkZdb)
