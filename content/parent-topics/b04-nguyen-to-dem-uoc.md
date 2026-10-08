Số nguyên tố và số lượng ước đều liên quan đến việc chia hết. Thay vì thử mọi số đến `n`, ta khai thác việc ước xuất hiện theo cặp: nếu `d` chia hết `n`, thì `n/d` cũng là ước. Nhận xét này đưa phạm vi kiểm tra xuống căn bậc hai và giúp học sinh hiểu tại sao có thể dừng mà không bỏ sót.

## Tư duy

- Bắt đầu từ định nghĩa nguyên tố và ước dương, không chỉ dựa vào danh sách số đã nhớ.
- Ghép một ước nhỏ với một ước lớn để giảm số giá trị phải thử.
- Phân biệt mục đích tìm một ước để kết luận hợp số với mục đích đếm đủ mọi ước.
- Xử lý cặp hai ước bằng nhau ở số chính phương và các giá trị 0, 1.

## Nội dung học

- Nguyên tố là số nguyên lớn hơn 1 có đúng hai ước dương: 1 và chính nó.
- Kiểm tra chia hết bằng `%`, thử ước từ 2 đến căn bậc hai.
- Đếm ước theo cặp `(d, n/d)`, cộng 2 hoặc 1 tùy hai ước khác hay bằng nhau.
- Dùng điều kiện `d <= n/d` để tránh bình phương vượt giới hạn.
- Thời gian `O(√n)`, bộ nhớ phụ `O(1)` và khi số lượng truy vấn cần phương pháp khác.

## Vì sao căn bậc hai là mốc đủ?

Nếu một số `n` là hợp số, nó có thể viết `n = a × b` với cả hai thừa số lớn hơn 1. Hai thừa số không thể cùng lớn hơn `√n`, vì tích khi đó lớn hơn `n`. Do đó ít nhất một ước không tầm thường nằm từ 2 đến `√n`.

Với 36, các cặp ước là:

| Ước nhỏ | Ước đi cùng | Đóng góp số ước |
|---:|---:|---:|
| 1 | 36 | 2 |
| 2 | 18 | 2 |
| 3 | 12 | 2 |
| 4 | 9 | 2 |
| 6 | 6 | 1 |

Tổng là 9 ước. Cặp 6 và 6 chỉ chứa một giá trị, không được cộng 2. Số 5 không chia hết 36 nên không tạo cặp; ta vẫn thử nó nhưng không tăng số lượng.

## Kiểm tra nguyên tố: có thể dừng sớm

Hàm đặt ngoài `main`, không cần thư viện đặc biệt:

```cpp
bool nguyen_to(long long n) {
    if (n < 2) return false;

    for (long long d = 2; d <= n / d; ++d) {
        if (n % d == 0) return false;
    }
    return true;
}
```

Nếu tìm thấy một ước từ 2 đến căn, ta đã đủ chứng cứ rằng `n` có ước ngoài 1 và chính nó, nên trả về sai ngay. Nếu không có, nhận xét về cặp ước chứng minh không còn một ước lớn bị bỏ sót.

Với `n = 2`, vòng lặp không chạy và kết luận nguyên tố đúng. Với 1 hoặc số âm, hàm trả sai từ đầu. Không nên chỉ dùng “không tìm thấy ước trong vòng lặp” cho 1, vì vòng rỗng không làm 1 có đúng hai ước.

## Đếm ước: phải đi đủ các cặp

Hàm sau xét `n ≥ 1`:

```cpp
long long dem_uoc(long long n) {
    long long dem = 0;

    for (long long d = 1; d <= n / d; ++d) {
        if (n % d == 0) {
            dem += (d == n / d ? 1 : 2);
        }
    }
    return dem;
}
```

Mỗi ước nằm trong một cặp có đầu nhỏ không vượt căn. Duyệt đầu nhỏ một lần xét được mọi cặp; kiểm tra bằng nhau giữ một ước duy nhất ở cặp giữa. Với `n = 1`, cặp `(1,1)` cho kết quả 1.

Không dùng hàm này để đếm ước của 0: mọi số nguyên dương đều chia hết 0, nên số ước dương không hữu hạn như mô hình đang xét. Điều kiện `n ≥ 1` là một phần của bài toán, không phải ghi chú có thể bỏ qua.

## Chi phí và lựa chọn phương pháp

Mỗi hàm có tối đa khoảng `√n` lượt thử, thời gian `O(√n)` và bộ nhớ phụ `O(1)`. Hai vòng không lồng nhau trong một lời gọi kiểm tra: không nhân thời gian của kiểm tra nguyên tố với thời gian đếm ước nếu chỉ đang chạy một hàm.

Với `q` truy vấn có giá trị không vượt `N`, cách làm riêng từng số có thể cần `O(q√N)`. Khi nhiều câu hỏi nằm trong một miền nhỏ, sàng ở B05 giúp chuẩn bị thông tin chung. Tính đúng của thử ước không bảo đảm nó đủ nhanh cho mọi kích thước.

Điều kiện `d <= n/d` tương đương `d² <= n` vì `d` dương và phép chia nguyên giữ đúng mốc so sánh. Nó tránh tạo tích lớn; vẫn cần giới hạn thời gian khi `n` rất lớn.

## Luyện tập

- Kiểm tra `1, 2, 29, 49`: chỉ 2 và 29 là nguyên tố.
- Đếm ước của 12 và 16; đáp án 6 và 5. Viết các cặp để thấy khác biệt ở căn nguyên.
- Với một số nhỏ, so sánh đếm theo cặp với duyệt từ 1 đến `n` và giải thích vì sao kết quả trùng nhau.

## Tự kiểm tra

> **Câu hỏi 1:** Không thử các số lớn hơn căn có bỏ sót ước làm số trở thành hợp số không?
>
> **Trả lời:** Không. Một ước lớn đi cùng `n/d`, là một ước nhỏ không vượt căn. Nếu số có thừa số không tầm thường, phải có ít nhất một thừa số ở miền đã thử.

> **Câu hỏi 2:** Vì sao số chính phương cần cộng 1 ở cặp ước giữa?
>
> **Trả lời:** Hai đầu của cặp đều bằng căn nguyên nên là cùng một ước, không phải hai giá trị khác nhau. Ví dụ 36 có cặp `(6,6)` chỉ đóng góp một ước; cộng 2 sẽ đếm số 6 hai lần.

## Nguồn tham khảo thêm

- [VNOI — Kiểm tra số nguyên tố](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/primality_check.md)
- [VNOI — Số các ước và tổng các ước](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/divisors.md)
- [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility)
- [Viblo Algorithm — Số nguyên tố và các vấn đề liên quan](https://viblo.asia/p/so-nguyen-to-va-cac-van-de-lien-quan-ORNZqnx8l0n)
