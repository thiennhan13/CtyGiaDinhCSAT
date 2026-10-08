Ước chung lớn nhất giúp tìm độ dài chia đều hai đoạn mà không dư; bội chung nhỏ nhất giúp tìm thời điểm hai chu kỳ gặp lại nhau. Thuật toán Euclid tính ước chung bằng cách liên tục thay một cặp số bằng cặp nhỏ hơn nhưng giữ nguyên tập ước chung. Bài học làm rõ điều được bảo toàn, thay vì chỉ ghi nhớ một vòng lấy dư.

## Tư duy

- Chuyển yêu cầu “chia đều” hoặc “gặp lại” thành quan hệ ước chung hoặc bội chung.
- Giải thích vì sao phép lấy dư giữ nguyên mọi ước chung của cặp số.
- Theo dõi cặp số sau mỗi bước và chỉ ra đại lượng giảm để thuật toán dừng.
- Tính bội chung bằng ước chung, nhưng xét phép nhân trung gian và trường hợp có số 0.

## Nội dung học

- Định nghĩa ƯCLN và BCNN với số nguyên dương; quy ước dùng trong chương trình với số 0.
- Công thức `gcd(a,b) = gcd(b,a%b)` khi `b > 0`.
- Cài Euclid bằng vòng lặp, lưu phần dư trước khi đổi cặp.
- Công thức BCNN: chia cho ƯCLN trước rồi nhân để giảm nguy cơ tràn.
- Rút gọn phân số, hai chu kỳ và chi phí số lần lấy dư.

## Chia hai đoạn thành những phần bằng nhau

Hai đoạn dài 84 và 30 cần chia thành các phần dài nguyên, bằng nhau, không dư, sao cho mỗi phần dài nhất. Độ dài đó là ƯCLN của 84 và 30. Thay vì thử mọi độ dài, ta thực hiện:

| Cặp hiện tại | Phép chia | Cặp tiếp theo |
|---|---|---|
| `(84,30)` | `84 = 2 × 30 + 24` | `(30,24)` |
| `(30,24)` | `30 = 1 × 24 + 6` | `(24,6)` |
| `(24,6)` | `24 = 4 × 6 + 0` | `(6,0)` |

Khi số thứ hai bằng 0, kết quả là số còn lại: 6. Mỗi đoạn được chia thành phần dài 6; 84 tạo 14 phần, 30 tạo 5 phần.

## Điều gì được giữ nguyên khi lấy dư?

Viết `a = q × b + r`. Nếu `d` chia hết cả `a` và `b`, nó cũng chia hết `r = a - q × b`. Ngược lại, nếu `d` chia hết `b` và `r`, nó cũng chia hết `a = q × b + r`. Vì vậy hai cặp `(a,b)` và `(b,r)` có cùng tập ước chung và cùng ước chung lớn nhất.

```diagram
(84,30) → (30,24) → (24,6) → (6,0)
   cùng ƯCLN     cùng ƯCLN     cùng ƯCLN
```

Khi `b > 0`, phần dư thỏa `0 ≤ r < b`. Số đứng thứ hai giảm nghiêm ngặt sau mỗi bước, nên không thể giảm mãi mà không đến 0. Đây là lý do dừng, khác với lý do giữ đúng kết quả.

## Cài đặt vòng lặp

Hàm sau đặt ngoài `main`, giả sử `a`, `b` không âm và vừa `long long`:

```cpp
long long ucln(long long a, long long b) {
    while (b != 0) {
        long long du = a % b;
        a = b;
        b = du;
    }
    return a;
}
```

Phải tính `du` trước khi gán `a = b`; nếu thay `a` rồi mới lấy dư từ biến này, dữ liệu cũ đã mất. Với đầu vào `(0,7)`, một bước chuyển thành `(7,0)` cho kết quả 7. Hàm quy ước `(0,0)` trả 0 để thuận tiện xử lý, dù không có ước chung dương lớn nhất theo định nghĩa thông thường.

Nếu đề cho số âm, cần xác định việc dùng độ lớn của chúng và giới hạn đổi dấu trước khi mở rộng hàm. Ví dụ giá trị âm nhỏ nhất của một kiểu có thể không có đối số dương biểu diễn được trong cùng kiểu; không tự gọi phép đổi dấu như một xử lý luôn an toàn.

## Từ ƯCLN đến BCNN

Với hai số dương, `BCNN(a,b) = a / ƯCLN(a,b) × b`. 84 và 30 có ƯCLN 6 nên BCNN là `84 / 6 × 30 = 420`. Nếu hai sự kiện lặp lại sau 84 và 30 đơn vị thời gian, cùng bắt đầu ở thời điểm 0, lần gặp lại dương đầu tiên là 420.

Hàm đặt ngoài `main`, dùng hàm `ucln` đã định nghĩa; kết quả phải vừa `long long`:

```cpp
long long bcnn(long long a, long long b) {
    if (a == 0 || b == 0) return 0;
    long long g = ucln(a, b);
    return (a / g) * b;
}
```

Chia trước làm giảm tích trung gian, nhưng vẫn không bảo đảm an toàn nếu BCNN thật vượt giới hạn kiểu số. Với số 0, chương trình quy ước BCNN bằng 0 và xử lý trước khi chia, tránh phép chia `0/0` ở cặp `(0,0)`.

## Chi phí và ứng dụng

Euclid có số lần lấy dư `O(log min(a,b))` khi hai số dương; cặp có số 0 xử lý trong thời gian hằng số. Bộ nhớ phụ của vòng lặp là `O(1)`. Thuật toán có thể bỏ qua nhiều lần trừ bằng một phép lấy dư nên hiệu quả hơn trừ từng lần khi hai số lệch nhau lớn.

Rút gọn `84/30` bằng chia cả tử/mẫu cho 6 cho `14/5`. Với chu kỳ, giả thiết cùng bắt đầu rất quan trọng: nếu thời điểm bắt đầu khác nhau, BCNN của hai chu kỳ không tự giải toàn bộ bài toán gặp nhau.

## Luyện tập

- Tìm ƯCLN và BCNN của 18, 24; kết quả 6 và 72.
- Rút gọn phân số 45/60, được 3/4.
- Lập bảng Euclid cho hai số bằng nhau, hai số nguyên tố cùng nhau và một số bằng 0.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao đổi `(a,b)` thành `(b,a%b)` không làm thay đổi ƯCLN?
>
> **Trả lời:** Với `a = qb + r`, mọi ước chung của `a,b` cũng chia `r`, và mọi ước chung của `b,r` cũng chia `a`. Hai tập ước chung bằng nhau nên phần tử lớn nhất của chúng giữ nguyên.

> **Câu hỏi 2:** Chia trước trong công thức BCNN đã loại hết nguy cơ tràn số chưa?
>
> **Trả lời:** Chưa. Nó tránh tích trung gian `a*b` lớn hơn mức cần thiết, nhưng BCNN cuối cùng vẫn có thể vượt kiểu số. Cần giới hạn đầu vào hoặc kiểm tra khả năng biểu diễn kết quả, đồng thời xử lý số 0 trước phép chia.

## Nguồn tham khảo thêm

- [VNOI — Thuật toán Euclid](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/euclid.md)
- [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility)
