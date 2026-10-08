Khi cần kiểm tra nhiều số trong cùng một miền, thử ước riêng từng số sẽ lặp lại rất nhiều công việc. Sàng Eratosthenes nhìn theo chiều ngược lại: từ một số nguyên tố đã biết, loại các bội chắc chắn là hợp số. Một lần chuẩn bị tạo được bảng trả lời cho tất cả các giá trị trong miền.

## Tư duy

- So sánh việc trả lời từng câu hỏi riêng với chuẩn bị một bảng dùng chung.
- Khai thác quan hệ giữa số nguyên tố và các bội để loại nhiều giá trị trong một bước duyệt.
- Giải thích vì sao một số chưa bị loại khi đến lượt xét là nguyên tố.
- Nhận ra công việc đã làm ở các lượt trước để bắt đầu đánh dấu từ bình phương.

## Nội dung học

- Bảng đúng/sai theo giá trị số, loại 0 và 1 ngay từ đầu.
- Duyệt số còn được giữ và đánh dấu các bội của nó.
- Bắt đầu từ `p²`, chỉ cần số nguyên tố `p` không vượt căn của giới hạn.
- Trả lời kiểm tra nguyên tố trong miền bằng một lần tra bảng.
- Chi phí `O(N log log N)` thời gian, `O(N)` bộ nhớ và giới hạn áp dụng.

## Loại hợp số trên miền nhỏ

Muốn tìm nguyên tố đến 20, ban đầu giữ các số từ 2 đến 20. Xét 2, loại các bội từ 4; xét 3, loại các bội từ 9. Số 4 đã bị loại nên không dùng nó để sàng. Vì căn của 20 nhỏ hơn 5, công việc đánh dấu đã đủ.

| Số đang xét | Bội được đánh dấu từ bình phương đến 20 |
|---:|---|
| 2 | 4, 6, 8, 10, 12, 14, 16, 18, 20 |
| 3 | 9, 12, 15, 18 |
| 4 | Đã bị loại, bỏ qua |

Các số còn lại là `2, 3, 5, 7, 11, 13, 17, 19`. Một số như 12 có thể bị đánh dấu nhiều lần; đánh dấu lại thành sai không làm sai kết quả, nhưng vẫn được tính trong công việc của thuật toán.

Có thể xem [Khan Academy — Sieve of Eratosthenes](https://www.youtube.com/watch?v=klcIklsWzrY) để quan sát cách loại các bội trên bảng số, rồi đối chiếu từng bước với bảng tự tính ở trên.

## Vì sao bắt đầu từ `p²`?

Các bội `2p, 3p, …, (p - 1)p` đều có thừa số nhỏ hơn `p`, nên đã bị loại khi xử lý một ước nguyên tố nhỏ hơn. Chỉ từ `p²` mới có thể xuất hiện các bội chưa được xử lý theo cách đó. Ví dụ khi xét 5, các số 10, 15, 20 đã bị loại bởi 2 hoặc 3; bắt đầu 25 tránh làm lại phần ấy.

Chỉ cần sàng đến căn của `N`: mọi hợp số không vượt `N` có ít nhất một ước nguyên tố không vượt căn của chính nó, do đó cũng không vượt căn của `N`. Những số nguyên tố lớn hơn mốc này vẫn được giữ trong bảng, không cần tự đi loại bội vì bình phương của chúng đã vượt miền.

## Cài đặt bảng sàng

Đoạn trong `main` dùng `<vector>`, với `N` không âm và đủ nhỏ để cấp phát bảng:

```cpp
int N = 20;
vector<bool> la_nguyen_to(N + 1, true);
la_nguyen_to[0] = false;
if (N >= 1) la_nguyen_to[1] = false;

for (long long p = 2; p * p <= N; ++p) {
    if (la_nguyen_to[p]) {
        for (long long x = p * p; x <= N; x += p) {
            la_nguyen_to[x] = false;
        }
    }
}
```

Bảng cần `N + 1` ô để có chỉ số từ 0 đến `N`. Dùng `long long` cho các phép nhân và tăng bội trong đoạn mã; `N` là `int` và không âm, nên tích tại cận của vòng ngoài nằm trong giới hạn kiểu rộng hơn.

Sau sàng, `la_nguyen_to[17]` đúng và `la_nguyen_to[18]` sai. Chỉ được tra những số trong 0 đến `N`; bảng không có thông tin cho số ngoài miền. Cấp phát hoặc xây lại với một giới hạn khác phải làm rõ dữ liệu nào đang được bảng đại diện.

## Giải thích tính đúng

Không số nguyên tố nào bị loại vì các giá trị đánh dấu đều là tích của `p` với một số ít nhất bằng `p`, nên có ước không tầm thường. Ngược lại, mỗi hợp số có một ước nguyên tố nhỏ; khi xét ước đó, hợp số được đánh dấu, hoặc đã bị loại ở lượt trước. Do đó sau khi hoàn thành, những số lớn hơn 1 còn giữ lại chính là nguyên tố.

## Chi phí và lựa chọn khi có nhiều câu hỏi

Sàng Eratosthenes có thời gian `O(N log log N)` và bộ nhớ `O(N)`. Một lần tra nguyên tố sau chuẩn bị có thời gian `O(1)`; với `q` câu hỏi trong miền, tổng gồm chi phí sàng và `O(q)` tra cứu. Không gọi toàn bộ quá trình là hằng số chỉ vì từng lần hỏi nhanh.

Với một số rất lớn và chỉ một câu hỏi, dựng bảng đến chính số đó có thể quá tốn bộ nhớ; thử ước hoặc phương pháp khác phù hợp hơn. Sàng cần biết trước một giới hạn miền hợp lý. Không dùng sàng phân đoạn hay sàng tuyến tính chỉ để thay tên phương pháp trong bài cơ bản này.

Các ca nhỏ `N = 0`, 1, 2 giúp kiểm tra việc loại 0/1 và cận vòng. Bảng có thể rỗng danh sách nguyên tố nhưng vẫn phải truy cập đúng các ô đã cấp phát.

## Luyện tập

- Đếm nguyên tố không vượt 20 và 30; đáp án lần lượt 8 và 10.
- Dựng một bảng đến 100 rồi trả lời nhiều yêu cầu kiểm tra số trong miền.
- Giải thích vì sao lúc xét 7 không cần bắt đầu đánh dấu từ 14.

## Tự kiểm tra

> **Câu hỏi 1:** Dừng vòng sàng ở căn của `N` có bỏ các nguyên tố lớn hơn căn khỏi kết quả không?
>
> **Trả lời:** Không. Các ô của chúng vẫn nằm trong bảng và không bị loại. Cận căn chỉ giới hạn những số cần dùng để đánh dấu bội; mọi hợp số trong miền đã có ước nhỏ được xử lý.

> **Câu hỏi 2:** Khi chỉ kiểm tra một số rất lớn, sàng đến số đó có luôn tốt hơn thử ước không?
>
> **Trả lời:** Không. Sàng trả giá cho toàn miền bằng thời gian và bộ nhớ `O(N)` trở lên, trong khi một truy vấn có thể chỉ cần thử đến căn. Lợi ích của sàng rõ khi có nhiều truy vấn trong một miền đủ nhỏ để chuẩn bị.

## Nguồn tham khảo thêm

- [VNOI — Sàng nguyên tố](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/prime_sieve.md)
- [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility)
- [Khan Academy — Sieve of Eratosthenes (video)](https://www.youtube.com/watch?v=klcIklsWzrY)
- [Viblo Algorithm — Số nguyên tố và các vấn đề liên quan](https://viblo.asia/p/so-nguyen-to-va-cac-van-de-lien-quan-ORNZqnx8l0n)
