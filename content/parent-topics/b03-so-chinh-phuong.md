Một số chính phương là bình phương của một số nguyên. Nhận ra tính chất này giúp thay việc thử mọi cách biểu diễn bằng việc tìm một ứng viên căn bậc hai rồi kiểm tra lại chính xác. Bài học kết nối khái niệm toán học với phép tính trên máy: kết quả căn bậc hai dạng số thực là gợi ý, còn kết luận về số nguyên cần được xác minh.

## Tư duy

- Chuyển định nghĩa “là bình phương” thành điều kiện có một số nguyên `k` sao cho `k × k = n`.
- Phân biệt kiểm tra một số với liệt kê nhiều số chính phương trong một khoảng.
- Dùng căn bậc hai để thu hẹp ứng viên, không bỏ bước kiểm tra bằng phép tính nguyên.
- Kiểm tra số âm, 0, số sát một bình phương và giới hạn phép nhân.

## Nội dung học

- Định nghĩa số chính phương, căn nguyên không âm và các ví dụ nhỏ.
- `sqrtl` trong `<cmath>`, chuyển kết quả về số nguyên và điều chỉnh ứng viên khi có sai số.
- So sánh `k²` với `n`, dùng phép chia để tránh nhân vượt giới hạn khi điều chỉnh.
- Liệt kê các bình phương bằng cách duyệt giá trị căn, thay vì kiểm tra từng số trong miền.
- Chi phí kiểm tra/liệt kê và sự khác biệt giữa điều kiện cần với điều kiện đủ.

## Từ định nghĩa đến phép kiểm tra

Các số `0, 1, 4, 9, 16, 25` lần lượt là bình phương của `0, 1, 2, 3, 4, 5`. Số 24 và 26 nằm ngay cạnh 25 nhưng không có căn nguyên. Trong bài này, 0 được xem là số chính phương vì `0² = 0`.

| Số cần xét | Căn nguyên gần nhất phía dưới | Bình phương | Kết luận |
|---:|---:|---:|---|
| 24 | 4 | 16 | Không |
| 25 | 5 | 25 | Có |
| 26 | 5 | 25 | Không |
| 0 | 0 | 0 | Có |

Với `n ≥ 0`, lấy một ứng viên gần căn bậc hai. Sau khi điều chỉnh để có `k² ≤ n < (k+1)²`, chỉ còn kiểm tra `k² == n`. Không cần thử mọi số nguyên từ 0 đến `n`.

## Mã kiểm tra và bước điều chỉnh

Hàm đặt ngoài `main`, dùng `<cmath>`. Đầu vào là một số `long long`; số âm được loại trước khi tính căn:

```cpp
bool chinh_phuong(long long n) {
    if (n < 0) return false;
    if (n == 0) return true;

    long long k = sqrtl(n);
    while (k + 1 <= n / (k + 1)) ++k;
    while (k > 0 && k > n / k) --k;

    return k * k == n;
}
```

`sqrtl` cho giá trị số thực; chuyển sang `long long` lấy phần nguyên. Hai vòng điều chỉnh không đoán sai số luôn theo một hướng: nếu ứng viên thấp, tăng lên; nếu cao, giảm xuống. Sau đó `k` là phần nguyên của căn thật.

Điều kiện `(k + 1) <= n / (k + 1)` tương đương `(k + 1)² <= n` với số dương, nhưng không cần tính bình phương có thể vượt kiểu số. Điều kiện giảm cũng dùng phép chia, và kiểm tra `k > 0` trước để không chia cho 0. Sau điều chỉnh, `k² ≤ n`, nên phép nhân cuối nằm trong giới hạn `long long` không âm đang xét.

Ví dụ với số lớn gần giới hạn kiểu số, một ứng viên hơi cao có thể tạo bình phương vượt giới hạn. Vì vậy không nên dùng ngay `k * k` trong mọi bước sửa căn, dù chỉ định kiểm tra rồi giảm ứng viên.

## Vì sao chỉ một ứng viên đủ?

Các bình phương của số nguyên không âm tăng dần: nếu tăng căn từ `k` lên `k + 1`, bình phương tăng thêm `2k + 1`. Khi đã biết `k² ≤ n < (k+1)²`, không căn nguyên nào khác có thể cho bình phương bằng `n`: căn nhỏ hơn cho giá trị nhỏ hơn `k²`, căn lớn hơn cho giá trị ít nhất `(k+1)²`.

Một số có chữ số cuối 2, 3, 7 hoặc 8 không thể là chính phương. Nhưng có chữ số cuối 0, 1, 4, 5, 6 hoặc 9 chỉ là điều kiện cần, không đủ. Số 15 kết thúc bằng 5 nhưng không là bình phương. Các nhận xét giúp loại nhanh không thay được kiểm tra chính xác.

## Liệt kê bằng cách duyệt căn

Muốn liệt kê chính phương không vượt 40, duyệt căn `0, 1, 2, 3, 4, 5, 6` và bình phương chúng, được `0, 1, 4, 9, 16, 25, 36`. Mỗi căn tạo một giá trị khác nhau nên không trùng. Duyệt từng số từ 0 đến 40 rồi gọi hàm kiểm tra làm thêm những việc không cần thiết.

Số bình phương không vượt `N` là `floor(sqrt(N)) + 1` khi tính cả 0. Nếu yêu cầu số chính phương dương, bỏ 0. Đọc cách đề định nghĩa miền trước khi áp công thức đếm.

## Chi phí và kiểm tra biên

Hàm dùng bộ nhớ phụ `O(1)`. Với số máy có kích thước cố định, phép căn thư viện có chi phí nhỏ; phần điều chỉnh có số lượt bằng độ lệch nguyên của ứng viên. Trên các môi trường thường dùng, độ lệch rất nhỏ, nhưng lập luận đúng không phụ thuộc việc đoán rằng ứng viên luôn chính xác. Liệt kê đến `N` cần `O(√N)` số căn và lượng xuất tương ứng.

Thử số âm, 0, 1, 2, một bình phương và hai số sát nó. Với dữ liệu lớn, kiểm tra bằng phép toán nguyên độc lập, không chỉ so sánh hai cách cùng dùng số thực. Bài không yêu cầu lấy căn của số âm.

## Luyện tập

- Kiểm tra `48, 49, 50` và giải thích vì sao chỉ 49 thỏa.
- Đếm số chính phương dương từ 1 đến 100; đáp án là 10.
- Liệt kê chính phương từ 10 đến 40, kết quả `16, 25, 36`; chọn cận căn thay vì duyệt mọi số.

## Tự kiểm tra

> **Câu hỏi 1:** Số kết thúc bằng 5 có chắc là chính phương không?
>
> **Trả lời:** Không. Chữ số cuối phù hợp chỉ là điều kiện cần. Số 15 kết thúc bằng 5 nhưng không có căn nguyên; vẫn phải kiểm tra tồn tại `k` với `k² = n`.

> **Câu hỏi 2:** Vì sao các vòng sửa căn dùng phép chia thay vì luôn tính bình phương?
>
> **Trả lời:** Một ứng viên hơi cao có thể khiến bình phương vượt giới hạn kiểu số, nhất là gần số nguyên lớn nhất. Với số dương, so sánh `k <= n/k` kiểm tra cùng quan hệ mà không tạo tích lớn. Sau khi đã giữ `k² <= n`, phép nhân cuối mới an toàn.

## Nguồn tham khảo thêm

- [VNOI — Số các ước và tổng các ước](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/divisors.md)
- [Microsoft Learn — sqrt, sqrtf, sqrtl](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/sqrt-sqrtf-sqrtl?view=msvc-170)
