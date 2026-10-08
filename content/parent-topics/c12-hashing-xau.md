So sánh nhiều đoạn của một xâu bằng cách đọc lại từng kí tự có thể tốn nhiều thời gian. Hashing tạo một giá trị đại diện để loại nhanh những đoạn chắc chắn khác nhau. Lợi ích đi cùng một giới hạn quan trọng: hai đoạn có cùng mã băm vẫn có thể khác nội dung, gọi là va chạm.

## Tư duy

- Tách chi phí xây thông tin dùng chung khỏi chi phí trả lời từng truy vấn.
- Chọn cách biểu diễn giữ thứ tự kí tự, không chỉ tổng các mã kí tự.
- Hiểu phép loại bỏ tiền tố bằng nhân lũy thừa rồi trừ.
- Phân biệt bằng nhau chắc chắn với bằng nhau theo mã băm, lựa chọn mức kiểm chứng phù hợp.

## Nội dung học

- Hash đa thức, cơ số B, modulo M và ánh xạ kí tự.
- Mảng hash tiền tố và mảng lũy thừa để lấy hash đoạn trong O(1).
- Khoảng nửa mở `[l, r)`, chuẩn hóa phần dư sau phép trừ và so sánh độ dài.
- Va chạm, hash đôi, cơ số ngẫu nhiên và kiểm tra kí tự khi cần kết quả chắc chắn.

## Vì sao không chỉ cộng kí tự?

Nếu a có mã 1, b có mã 2, tổng mã của `ab` và `ba` đều bằng 3. Tổng đã làm mất thứ tự. Thay bằng `H(ab) = 1·B + 2`, `H(ba) = 2·B + 1`; cơ số B làm vị trí ảnh hưởng kết quả.

Với B bằng 31, chưa lấy modulo:

| Xâu | Cách tính | Hash |
|---|---|---:|
| a | 1 | 1 |
| ab | `1·31 + 2` | 33 |
| aba | `33·31 + 1` | 1024 |
| ba | `2·31 + 1` | 63 |

Hash đoạn `ba` trong `aba` bằng `1024 - 1·31² = 63`. Phần `a` đứng trước đoạn đã được nhân thêm đúng hai bậc cơ số, nên phải trừ nó theo cùng bậc.

## Xây tiền tố rồi lấy một đoạn

Đoạn mã minh họa chỉ nhận chữ thường a..z và các truy vấn có `0 <= l <= r <= n`. Cơ số cố định được dùng để dễ theo dõi phép tính, không phải cấu hình chống mọi dữ liệu va chạm. M bằng `1000000007`; các tích trong mã vừa `long long`.

```cpp
#include <string>
#include <vector>

struct StringHash {
    const long long B = 31, M = 1000000007;
    vector<long long> h, power;

    StringHash(const string& s) : h(s.size() + 1), power(s.size() + 1, 1) {
        for (int i = 0; i < s.size(); i++) {
            power[i + 1] = power[i] * B % M;
            h[i + 1] = (h[i] * B + s[i] - 'a' + 1) % M;
        }
    }

    long long segment(int l, int r) const {
        long long removed = h[l] * power[r - l] % M;
        return (h[r] - removed + M) % M;
    }
};
```

`h[i]` là hash của i kí tự đầu, không phải của kí tự thứ i. Đoạn rỗng cho hash 0. Chỉ so sánh hai đoạn khi đã kiểm tra cùng độ dài và cùng quy tắc hash.

## Điều gì chắc chắn, điều gì cần thận trọng?

Nếu hai đoạn cùng độ dài có hash khác nhau, chúng chắc chắn khác nội dung. Nếu hash bằng nhau, có thể giống hoặc va chạm: miền xâu lớn hơn nhiều miền số dư, nên không thể ánh xạ tất cả xâu khác nhau thành số khác nhau.

Hash đôi và lựa chọn cơ số ngẫu nhiên giảm rủi ro trong những điều kiện phù hợp, nhưng không biến thuật toán xác suất thành chứng minh tuyệt đối. Không nói xác suất luôn bằng `1/M` mà không nêu mô hình ngẫu nhiên và số lần so sánh. Với dữ liệu cố tình gây va chạm, cơ số cố định có thể bị khai thác.

Nếu kết quả phải chắc chắn, dùng hash để lọc rồi so sánh kí tự khi hash bằng nhau, hoặc chọn thuật toán xâu xác định phù hợp. Kiểm tra lại kí tự có thể làm tổng chi phí tăng khi nhiều đoạn giống nhau; cần ghi điều đó trong phân tích.

## Chi phí và luyện tập

Tiền xử lý O(n) thời gian, O(n) bộ nhớ; mỗi lần lấy hash O(1). q truy vấn chỉ so hash mất O(n + q), chưa gồm chi phí xác minh kí tự. Các số modulo thuộc hashing thuật toán, không dùng mã này để bảo vệ mật khẩu.

- Tính tay hash của hai đoạn `aba` trong `ababa` rồi đối chiếu kết quả.
- Tạo hàm so sánh đoạn kiểm tra độ dài trước hash.
- Dùng modulo rất nhỏ để chủ động tìm một va chạm và giải thích giới hạn của kết luận.

## Tự kiểm tra

> **Câu hỏi 1:** Hash bằng nhau có đủ kết luận hai xâu bằng nhau không?
>
> **Trả lời:** Không. Hash bằng nhau có thể là va chạm; cần chấp nhận rủi ro có phân tích hoặc xác minh bằng cách chắc chắn khác.

> **Câu hỏi 2:** Vì sao lấy hash đoạn phải nhân tiền tố bị bỏ với lũy thừa cơ số?
>
> **Trả lời:** Tiền tố đó nằm ở các bậc cao hơn sau khi nối thêm đoạn. Nhân B theo độ dài đoạn đưa nó về đúng vị trí trước khi trừ.

## Nguồn tham khảo thêm

- [USACO Guide — String Hashing](https://usaco.guide/gold/hashing)
- [USACO Guide — String Matching](https://usaco.guide/problems/cses-1753-string-matching/solution)
