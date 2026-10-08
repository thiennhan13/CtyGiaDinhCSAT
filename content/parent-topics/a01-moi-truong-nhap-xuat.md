Một lời giải bằng chương trình phải đi từ dữ liệu đầu vào đến kết quả đúng theo yêu cầu. Trước khi học thuật toán, học sinh cần biết viết mã ở đâu, biên dịch thế nào, đưa dữ liệu vào bằng cách nào và đọc kết quả ra sao. Bài này xây dựng quy trình thử một chương trình nhỏ để mỗi thay đổi đều có thể kiểm tra được.

## Tư duy

- Tách yêu cầu thành dữ liệu được cung cấp, phép xử lý cần làm và kết quả phải xuất.
- Phân biệt mã nguồn với chương trình đã biên dịch; sửa mã cần biên dịch lại trước khi chạy.
- Đọc đúng thứ tự và kiểu của dữ liệu, không suy cách nhập chỉ từ một ví dụ.
- Kiểm tra kết quả bằng phép tính tay và tuân thủ định dạng của đề, thay vì thêm lời dẫn tùy ý.

## Nội dung học

- Vai trò của trình soạn thảo, trình biên dịch và cửa sổ chạy chương trình.
- Khung chương trình với `#include`, `main`, khai báo biến và câu lệnh.
- `cin` để đọc dữ liệu; `cout`, dấu cách và `\n` để xuất kết quả.
- Chuyển nhập/xuất sang tệp bằng `freopen` khi đề yêu cầu, phân biệt đọc với ghi.
- Thử dữ liệu nhỏ, nhận biết lỗi biên dịch, lỗi lúc chạy và kết quả sai.

## Từ đề bài đến chương trình đầu tiên

Cho số quyển vở `so_vo` và giá mỗi quyển `gia`, hãy tính số tiền phải trả. Giả sử `0 ≤ so_vo ≤ 1000`, `0 ≤ gia ≤ 1 000 000`, và cả hai là số nguyên. Đầu vào `4 12500` phải cho kết quả `50000`.

| Bước | Thông tin | Trong chương trình |
|---|---|---|
| Nhập | Số quyển, giá mỗi quyển | Đọc hai biến theo thứ tự |
| Xử lý | Số quyển nhân giá | Tính `so_vo * gia` |
| Xuất | Tổng tiền | In một số và xuống dòng |

Đây là một chương trình đầy đủ, có thể biên dịch và chạy:

```cpp
#include <iostream>

int main() {
    long long so_vo, gia;
    cin >> so_vo >> gia;

    long long tong_tien = so_vo * gia;
    cout << tong_tien << '\n';
    return 0;
}
```

Thư viện `<iostream>` cung cấp `cin` và `cout`. Hàm `main` là nơi chương trình bắt đầu thực hiện. `cin >> so_vo >> gia` đọc lần lượt hai số; chúng có thể cách nhau bằng dấu cách hoặc xuống dòng. Biến đầu nhận số đầu, biến sau nhận số tiếp theo, nên đổi thứ tự đọc có thể làm sai bài khác dù phép nhân ở ví dụ này không đổi.

`cout` chỉ in đáp án. Trong bài chấm tự động, không nên thêm câu “Tong tien la” nếu đề không yêu cầu. Một chương trình đúng phép tính vẫn có thể không được chấp nhận vì định dạng đầu ra không phù hợp.

## Quy trình chạy và kiểm tra

```text
Đọc đề → viết mã → biên dịch → chạy với dữ liệu thử
                           → đối chiếu kết quả → sửa và biên dịch lại
```

Biên dịch biến mã nguồn thành chương trình thực thi. Nếu thiếu dấu chấm phẩy hoặc tên biến chưa được khai báo, trình biên dịch có thể báo lỗi trước khi chương trình chạy. Khi biên dịch thành công, vẫn phải thử kết quả: viết nhầm `+` thay cho `*` không nhất thiết tạo lỗi cú pháp.

Với ví dụ trên, hãy thử thêm `0 12500`, đáp án 0; `1 12500`, đáp án 12500; và `3 7000`, đáp án 21000. Mỗi ca làm rõ một khía cạnh của yêu cầu. Chạy nhiều lần với cùng dữ liệu không thay cho việc chọn các trường hợp khác nhau.

## Khi đề yêu cầu đọc và ghi tệp

Nếu đề quy định đọc `VOR.INP`, ghi `VOR.OUT`, thêm `<cstdio>` và chuyển luồng trước các câu lệnh nhập/xuất:

```cpp
#include <cstdio>

// Đặt ở đầu main, trước cin và cout.
freopen("VOR.INP", "r", stdin);
freopen("VOR.OUT", "w", stdout);
```

Đây là phần mã đặt trong chương trình, không phải một chương trình độc lập. Chế độ `"r"` đọc tệp có sẵn; `"w"` ghi tệp và có thể làm mất nội dung cũ của tệp cùng tên. Chỉ dùng tệp thử dành cho bài học. Tên và vị trí tệp phải đúng với môi trường đang chạy.

Sau khi chuyển luồng, `cin` vẫn đọc và `cout` vẫn ghi như trước, nhưng dữ liệu đi qua tệp thay vì cửa sổ nhập/xuất. Nếu hệ thống chấm yêu cầu nhập/xuất chuẩn, không giữ hai lệnh này chỉ vì chương trình từng chạy bằng tệp trên máy riêng.

## Vì sao đúng, chi phí và giới hạn

Mỗi quyển có cùng giá nên tổng tiền là tích số quyển với giá một quyển. Chương trình đọc đúng hai đại lượng, tính tích rồi in kết quả. Với hai số có kích thước nằm trong kiểu dữ liệu, số phép xử lý không phụ thuộc số quyển: thời gian và bộ nhớ phụ đều `O(1)`.

Chương trình giả sử dữ liệu đáp ứng giới hạn và có đủ hai số. Nếu nhập thiếu, nhập chữ ở chỗ cần số hoặc không tìm thấy tệp, phải kiểm tra việc đọc dữ liệu trước khi đánh giá thuật toán. Các bài thi thường bảo đảm đầu vào hợp lệ; điều đó không đồng nghĩa mọi thao tác nhập trên máy thử đều thành công.

## Luyện tập

- Đọc chiều dài và chiều rộng nguyên của một hình chữ nhật, in chu vi và diện tích trên hai dòng; chọn giới hạn để kết quả vừa kiểu số.
- Viết bảng ba ca thử trước khi chạy: một kích thước nhỏ, một hình vuông và hai cạnh khác nhau.
- Chạy cùng lời giải với nhập/xuất chuẩn rồi với hai tệp thử; xác định nơi kết quả xuất hiện trong mỗi cách.

## Tự kiểm tra

> **Câu hỏi 1:** Biên dịch thành công có chứng minh chương trình tính đúng không?
>
> **Trả lời:** Không. Biên dịch kiểm tra nhiều quy tắc của ngôn ngữ, nhưng phép tính đúng cú pháp vẫn có thể khác yêu cầu. Cần đối chiếu cách xử lý với đề và kiểm tra kết quả trên dữ liệu có thể tính độc lập.

> **Câu hỏi 2:** Khi chuyển sang tệp bằng `freopen`, có cần thay mọi `cin` và `cout` không?
>
> **Trả lời:** Không. Hai luồng được chuyển sang tệp, còn cách đọc/ghi giữ nguyên. Tuy nhiên phải dùng đúng tên tệp, đúng chế độ, đặt lệnh trước nhập/xuất và bỏ chuyển tệp nếu môi trường chấm yêu cầu luồng chuẩn.

## Nguồn tham khảo thêm

- [USACO Guide — Input & Output](https://usaco.guide/general/input-output)
- [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/)
