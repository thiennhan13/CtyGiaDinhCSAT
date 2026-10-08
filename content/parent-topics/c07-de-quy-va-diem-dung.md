Một hàm có thể nhờ chính nó giải một bài toán nhỏ hơn. Cách diễn đạt ấy gọi là đệ quy, nhưng lời giải chỉ hoàn chỉnh khi ta chỉ ra được bài toán nhỏ đi như thế nào và đến đâu thì có thể trả lời ngay. Bài này tập trung vào việc đọc quá trình gọi hàm, thay vì học thuộc một mẫu cú pháp.

## Tư duy

- Xác định điều một lời gọi hàm phải trả về, tách nó khỏi thao tác nhập và xuất.
- Tìm bài toán cùng dạng có kích thước nhỏ hơn để thay cho một phần công việc hiện tại.
- Chọn trường hợp cơ sở có nghĩa, rồi chứng minh mọi nhánh đều đi tới trường hợp đó.
- Phân biệt lúc gọi xuống với lúc nhận kết quả và quay trở lại; theo dõi biến riêng của từng lời gọi.

## Nội dung học

- Trường hợp cơ sở, công thức chuyển và giá trị trả về của hàm đệ quy.
- Ngăn xếp lời gọi: tham số và vị trí tiếp tục được giữ khi hàm chờ kết quả.
- Giai thừa, tổng đầu dãy và thuật toán Euclid như những mô hình thu nhỏ khác nhau.
- Độ sâu đệ quy, chi phí gọi hàm và giới hạn kiểu dữ liệu.

## Bắt đầu từ một tích quen thuộc

Tính `n!` nghĩa là nhân các số từ 1 đến n; quy ước `0! = 1`. Với `n = 4`, vòng lặp tạo lần lượt các tích 1, 2, 6, 24. Ta cũng có thể tách thừa số cuối: muốn biết `4!`, chỉ cần biết `3!` rồi nhân 4. Phần còn lại vẫn là bài toán giai thừa.

| Lời gọi | Công việc chờ | Kết quả sau khi quay lại |
|---|---|---:|
| `factorial(4)` | `4 * factorial(3)` | 24 |
| `factorial(3)` | `3 * factorial(2)` | 6 |
| `factorial(2)` | `2 * factorial(1)` | 2 |
| `factorial(1)` | `1 * factorial(0)` | 1 |
| `factorial(0)` | Trả về ngay | 1 |

Các lời gọi không đồng thời nhân ra đáp án. Hàm ở trên chờ hàm ở dưới, rồi nhận kết quả theo thứ tự ngược lại. Có thể hình dung chuỗi này bằng `4 → 3 → 2 → 1 → 0`, sau đó các kết quả đi lên `1 → 1 → 2 → 6 → 24`.

Có thể xem [Computerphile — What on Earth is Recursion?](https://www.youtube.com/watch?v=Mv9NEXX1VHc) để hình dung thêm các lời gọi đang chờ; quay lại bảng trên để tự lần theo kết quả đi lên.

## Viết rõ hợp đồng của hàm

Hàm dưới đây nhận số nguyên `0 <= n <= 20`, trả về giai thừa của n. Miền giới hạn này bảo đảm kết quả vừa `long long`; `21!` đã vượt miền số nguyên có dấu 64 bit thông dụng.

```cpp
long long factorial(int n) {
    if (n == 0) {
        return 1;
    }

    long long smaller = factorial(n - 1);
    return n * smaller;
}
```

Với `n = 0`, quy ước được trả về đúng. Nếu hàm đã tính đúng `(n - 1)!`, nhân thêm n cho đúng `n!`. Mỗi lời gọi giảm n một đơn vị nên dừng sau hữu hạn bước. Đây là hai phần khác nhau của lập luận: **đáp án đúng** và **quá trình có kết thúc**.

## Không phải lúc nào cũng giảm một đơn vị

Thuật toán Euclid tìm ước chung lớn nhất của hai số không âm bằng việc thay `(a, b)` bằng `(b, a % b)` khi b khác 0. Vì phần dư nhỏ hơn b, đối số thứ hai giảm cho đến 0.

```cpp
long long gcd(long long a, long long b) {
    if (b == 0) {
        return a;
    }

    return gcd(b, a % b);
}
```

Ví dụ `(42, 30) → (30, 12) → (12, 6) → (6, 0)` trả về 6. Miền đầu vào ở đây loại trường hợp hai số cùng bằng 0 nếu đề bài không định nghĩa ước chung lớn nhất cho trường hợp đó.

## Chi phí và những lỗi dễ bỏ sót

Giai thừa dùng `O(n)` thời gian và `O(n)` bộ nhớ ngăn xếp. Phiên bản vòng lặp chỉ cần `O(1)` bộ nhớ phụ. Không nên dùng đệ quy tuyến tính rất sâu khi không biết giới hạn ngăn xếp của môi trường chạy. Euclid giảm nhanh hơn, có số bước `O(log(max(a, b)))` với đầu vào dương.

Một điểm dừng chỉ xuất hiện trong mã chưa đủ: gọi `factorial(n)` từ chính `factorial(n)` sẽ không tiến gần điểm dừng. Đầu vào âm cũng không thuộc hợp đồng đã nêu. Khi lỗi xảy ra, hãy ghi lại **đối số của từng lời gọi**, không chỉ nhìn dòng `return` cuối.

## Luyện tập

- Viết hàm tính tổng từ 1 đến n, sau đó đổi sang vòng lặp và so sánh bộ nhớ phụ.
- Vẽ chuỗi gọi Euclid cho `(56, 35)`; đánh dấu lời gọi trả về ngay.
- Với hàm đệ quy xử lý một đoạn mảng, nêu đại lượng nào giảm ở mỗi bước trước khi cài đặt.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao điểm dừng và quy tắc thu nhỏ đều cần thiết?
>
> **Trả lời:** Điểm dừng cho một đáp án trực tiếp; quy tắc thu nhỏ bảo đảm mọi lời gọi sẽ đi tới điểm đó. Thiếu một trong hai, hàm có thể gọi mãi.

> **Câu hỏi 2:** Giai thừa đệ quy và giai thừa vòng lặp khác nhau chủ yếu ở tài nguyên nào?
>
> **Trả lời:** Cả hai mất O(n) thời gian; đệ quy giữ O(n) lời gọi đang chờ, còn vòng lặp dùng O(1) bộ nhớ phụ.

## Nguồn tham khảo thêm

- [VNOI — Đệ quy và thuật toán quay lui](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md)
- [Computerphile — What on Earth is Recursion?](https://www.youtube.com/watch?v=Mv9NEXX1VHc)
