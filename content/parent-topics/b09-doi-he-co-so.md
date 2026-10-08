Một số có thể được viết bằng nhiều hệ đếm mà vẫn giữ nguyên giá trị. Chẳng hạn, 45 ở hệ thập phân được viết thành `101101` ở hệ nhị phân. Hiểu phép chuyển đổi giúp học sinh nhìn các chữ số như một cấu trúc có quy luật, thay vì một dãy ký hiệu phải ghi nhớ.

## Tư duy

- Tách giá trị của một số khỏi cách viết số đó trong một hệ đếm.
- Dùng thương và số dư để lấy từng chữ số mà không đoán trọng số lớn nhất.
- Nhận biết thứ tự thu được khi phân tích số và thứ tự cần xuất ra.
- Kiểm tra chữ số hợp lệ và giới hạn kiểu dữ liệu khi đọc một biểu diễn.

## Nội dung học

- Hệ cơ số `b`, chữ số từ 0 đến `b - 1` và trọng số theo lũy thừa của `b`.
- Chuyển số nguyên không âm sang hệ 2–16 bằng phép chia lặp.
- Đọc một biểu diễn bằng công thức `value = value * b + digit`.
- Xử lý số 0, chữ số A–F và phát hiện kết quả vượt miền biểu diễn.

## Vì sao phép chia cho biết chữ số cuối?

Ở hệ thập phân, số 347 bằng `3 * 100 + 4 * 10 + 7`. Phần phía trước chữ số cuối chia hết cho 10, nên `347 % 10 = 7`; chia nguyên cho 10 bỏ chữ số này và còn 34.

Lập luận tương tự đúng với cơ số `b`: nếu `N = b * Q + r`, thì `r` là chữ số cuối và `Q` là giá trị của phần còn lại. Chia liên tiếp tạo các chữ số từ phải sang trái. Vì vậy, ta cần đảo dãy chữ số sau khi thu thập xong.

| Giá trị đang xét | Chia cho 2 được thương | Số dư |
|---:|---:|---:|
| 45 | 22 | 1 |
| 22 | 11 | 0 |
| 11 | 5 | 1 |
| 5 | 2 | 1 |
| 2 | 1 | 0 |
| 1 | 0 | 1 |

Đọc số dư từ dưới lên được `101101`. Kiểm tra ngược: `32 + 8 + 4 + 1 = 45`. Với hệ 16, phép chia đầu cho dư 13, ký hiệu D; phép chia tiếp cho dư 2, nên kết quả là `2D`.

## Chuyển từ giá trị sang cách viết

Hàm dùng `<string>`, `<algorithm>`, nhận `n >= 0` và `2 <= b <= 16`.

```cpp
string doi_co_so(long long n, int b) {
    string chu_so = "0123456789ABCDEF";
    if (n == 0) return "0";

    string s;
    while (n > 0) {
        s.push_back(chu_so[n % b]);
        n /= b;
    }
    reverse(s.begin(), s.end());
    return s;
}
```

Mỗi lượt lấy đúng chữ số thấp nhất của giá trị chưa xử lý. Thương nhỏ hơn giá trị trước vì `b >= 2`; vòng lặp sẽ về 0. Số chữ số là `O(log_b(n + 1))`, tương ứng thời gian và bộ nhớ kết quả. Thêm chữ số vào cuối rồi đảo một lần tránh chi phí dịch toàn bộ xâu khi liên tục chèn vào đầu.

## Đọc từ trái sang phải

Không cần tính từng lũy thừa. Khi đã đọc phần đầu có giá trị `v`, đọc thêm chữ số `d` ở bên phải tương đương dịch các chữ số cũ sang một hàng: `v * b + d`. Ví dụ, đọc `2D` trong hệ 16: từ 0 thành 2, rồi thành `2 * 16 + 13 = 45`.

Hàm sau dùng thêm `<climits>`, chỉ nhận chữ số viết hoa và không nhận dấu âm.

```cpp
bool doc_co_so(const string& s, int b, long long& value) {
    if (s.empty() || b < 2 || b > 16) return false;
    value = 0;
    for (char c : s) {
        int d;
        if ('0' <= c && c <= '9') d = c - '0';
        else if ('A' <= c && c <= 'F') d = c - 'A' + 10;
        else return false;

        if (d >= b || value > (LLONG_MAX - d) / b) return false;
        value = value * b + d;
    }
    return true;
}
```

Kiểm tra tràn phải thực hiện **trước** phép nhân và cộng. Chữ số 2 không hợp lệ trong hệ 2 dù nó là một ký tự số. Các số 0 ở đầu không đổi giá trị, nhưng biểu diễn do hàm chuyển đổi sinh ra chỉ có một chữ số 0 nếu số ban đầu bằng 0. Số âm và phần thập phân cần quy ước riêng, không nằm trong cài đặt này.

## Luyện tập

- Chuyển 26 sang hệ 2 và hệ 16, rồi đọc ngược để kiểm tra.
- Từ xâu nhị phân, đếm số chữ số 1 và giải thích trọng số của từng chữ số.
- Viết bộ chuyển đổi giữa hai cơ số thông qua giá trị trung gian, đồng thời phát hiện dữ liệu không hợp lệ hoặc quá lớn.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao phải đảo thứ tự số dư sau phép chia lặp?
>
> **Trả lời:** Phép chia lấy chữ số hàng thấp nhất trước, còn cách viết thông thường đặt hàng cao nhất trước. Hai thứ tự ngược nhau.

> **Câu hỏi 2:** Công thức `value * b + digit` có lợi gì so với tính từng lũy thừa?
>
> **Trả lời:** Nó dùng giá trị của phần đã đọc, chỉ cần một phép nhân và cộng cho mỗi chữ số; không cần hàm lũy thừa số thực hoặc lưu bảng trọng số, và có thể kiểm tra tràn trước từng bước.

## Nguồn tham khảo thêm

- [Viblo Algorithm — Hệ cơ số](https://viblo.asia/p/he-co-so-he-dem-m68Z0e72lkG)
- [CP Algorithms — Binary Exponentiation](https://cp-algorithms.com/algebra/binary-exp.html)
