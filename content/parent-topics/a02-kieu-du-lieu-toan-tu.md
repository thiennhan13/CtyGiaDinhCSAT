Máy tính không lưu mọi số theo cùng một cách. Một biến có thể chứa số nguyên, số thực, ký tự hoặc giá trị đúng/sai; cách chọn kiểu ảnh hưởng trực tiếp đến phép tính. Bài học giúp học sinh đọc giới hạn dữ liệu, hiểu phép toán đang thực hiện và nhận ra những kết quả sai dù câu lệnh vẫn hợp lệ.

## Tư duy

- Chọn kiểu từ dữ liệu và kết quả lớn nhất có thể xuất hiện, kể cả giá trị trung gian.
- Phân biệt phép chia nguyên với phép chia lấy phần thập phân, không chỉ nhìn kiểu của biến nhận kết quả.
- Theo dõi thứ tự thực hiện các phép toán và dùng ngoặc để diễn đạt ý định rõ ràng.
- Giải thích việc ép kiểu thay đổi cách tính nào, thay vì thêm ép kiểu để thử cho hết lỗi.

## Nội dung học

- Các kiểu thường dùng: `int`, `long long`, `double`, `char`, `bool` và giá trị ban đầu.
- Phép gán, cộng, trừ, nhân, chia, lấy dư; các toán tử so sánh và logic.
- Ép kiểu trong biểu thức, đặc biệt trước phép chia hoặc phép nhân có nguy cơ vượt giới hạn.
- Độ ưu tiên toán tử, vai trò của ngoặc và sự khác nhau giữa `=` với `==`.
- Giới hạn số nguyên, sai số số thực và cách chọn dữ liệu thử để phát hiện lỗi kiểu số.

## Cùng hai số, hai cách chia

Có 7 bài tập chia cho 2 buổi. Nếu hỏi mỗi buổi được bao nhiêu bài khi chia đều theo số nguyên, kết quả là 3 và dư 1. Nếu hỏi trung bình bao nhiêu bài mỗi buổi, kết quả là 3,5. Câu chữ của bài toán quyết định phép tính cần dùng.

| Biểu thức | Kết quả | Lý do |
|---|---:|---|
| `7 / 2` | 3 | Hai toán hạng nguyên, chia nguyên |
| `7 % 2` | 1 | Phần dư của phép chia nguyên |
| `1.0 * 7 / 2` | 3.5 | Có toán hạng thực trước khi chia |
| `double ket_qua = 7 / 2` | 3.0 | Phép chia đã ra 3 rồi mới chuyển sang thực |

Phần mã sau có `a`, `b` là số nguyên và `b != 0`:

```cpp
int a = 7, b = 2;
int thuong = a / b;
int du = a % b;
double trung_binh = 1.0 * a / b;
```

Đặt kết quả vào `double` không thể khôi phục phần thập phân đã bị bỏ trong phép chia nguyên. Cần thay đổi kiểu của biểu thức **trước lúc chia**. Với số nguyên âm, chia nguyên cắt phần lẻ về phía 0; bài nhập môn nên thử bằng số không âm trước rồi đối chiếu quy tắc khi mở rộng.

## Kiểu kết quả không tự bảo vệ phép nhân

Trong môi trường thường dùng cho bài thi, `int` có giới hạn trên khoảng 2,1 tỷ. Hai cạnh hình chữ nhật cùng bằng 50 000 cho diện tích 2,5 tỷ, đã vượt giới hạn đó. Viết `long long dien_tich = a * b` vẫn có thể sai nếu `a`, `b` đều là `int`: phép nhân được thực hiện trước theo kiểu của hai toán hạng.

```cpp
int a = 50000, b = 50000;
long long dien_tich = 1LL * a * b;
```

`1LL` đưa phép nhân sang `long long` ngay từ đầu. Cách khác là khai báo cả hai cạnh bằng `long long`. Cần giữ kết quả trong giới hạn của kiểu đã chọn; đổi sang kiểu rộng hơn không có nghĩa mọi số đều được lưu chính xác hoặc mọi tích đều an toàn.

## Diễn đạt điều kiện bằng biểu thức

Các biểu thức so sánh như `x >= 0`, `x == 5` trả về giá trị đúng/sai. `&&` yêu cầu cả hai điều kiện đúng; `||` cần ít nhất một điều kiện đúng; `!` đảo đúng thành sai và ngược lại.

Để kiểm tra `x` nằm từ 1 đến 10, viết `x >= 1 && x <= 10`. Không viết `1 <= x <= 10`: chương trình sẽ tính so sánh đầu thành đúng/sai rồi so sánh giá trị ấy với 10, khác ý nghĩa khoảng số trong toán học.

Biểu thức `(a + b) * c` cũng khác `a + b * c`. Nếu `a = 2`, `b = 3`, `c = 4`, hai kết quả lần lượt là 20 và 14. Ngoặc không chỉ giúp trình biên dịch; nó còn giúp người đọc thấy nhóm đại lượng nào được xử lý cùng nhau.

## Tính đúng, chi phí và các điểm biên

Các phép toán cơ bản trên kiểu số cố định có thời gian `O(1)` và bộ nhớ phụ `O(1)`. Tuy nhiên một biểu thức ngắn vẫn cần kiểm tra: mẫu số khác 0, phép tính trung gian vừa kiểu số, và kết quả nguyên hay thực đúng với yêu cầu.

Số thực thường lưu giá trị gần đúng; không nên dùng chúng để kiểm tra chia hết hoặc tính những số nguyên lớn cần chính xác tuyệt đối. Ví dụ một phép cộng thập phân có thể không khớp tuyệt đối với cách viết thập phân trên giấy. Việc so sánh số thực cần tiêu chí sai số phù hợp với đề, không áp một ngưỡng tùy ý cho mọi bài.

## Luyện tập

- Tính trung bình của ba số nguyên, giải thích vì sao chia cho `3.0` giữ phần thập phân.
- Tính số hộp đầy và số vật còn dư khi có `n` vật, mỗi hộp chứa `k > 0` vật.
- So sánh biểu thức có và không có ngoặc; tự tính kết quả trước khi chạy.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao `double t = 7 / 2` không cho kết quả 3,5?
>
> **Trả lời:** Hai toán hạng của phép chia đều nguyên nên kết quả phép chia là 3. Sau đó 3 mới được chuyển sang `double`. Muốn tính phần thập phân, cần có toán hạng thực trước khi chia, chẳng hạn `7 / 2.0`.

> **Câu hỏi 2:** Khai báo biến nhận kết quả bằng `long long` đã đủ tránh tràn khi nhân hai `int` chưa?
>
> **Trả lời:** Chưa. Phép nhân có thể vượt kiểu `int` trước khi gán. Cần đưa ít nhất một toán hạng sang `long long` từ đầu, đồng thời bảo đảm tích cuối cùng vẫn nằm trong giới hạn kiểu đó.

## Nguồn tham khảo thêm

- [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
