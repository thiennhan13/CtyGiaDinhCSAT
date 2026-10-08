Không phải dữ liệu nào cũng được xử lý giống nhau. Chương trình cần lựa chọn cách làm dựa trên điều kiện: một số có chia hết hay không, một giá trị thuộc khoảng nào, hoặc một mã tương ứng yêu cầu nào. Cấu trúc rẽ nhánh giúp chuyển quy tắc của đề thành những trường hợp rõ ràng, đủ và không mâu thuẫn.

## Tư duy

- Chia dữ liệu thành các trường hợp dựa trên điều kiện thật của bài toán.
- Kiểm tra các trường hợp có bao phủ hết dữ liệu hợp lệ và có giao nhau ngoài ý muốn không.
- Đọc nhánh theo thứ tự, hiểu rằng điều kiện đúng trước có thể khiến nhánh sau không được xét.
- Dùng dữ liệu sát ngưỡng để phát hiện sai khác giữa lớn hơn và lớn hơn hoặc bằng.

## Nội dung học

- `if`, `else if`, `else` và cách liên kết các nhánh thành một chuỗi lựa chọn.
- Biểu thức so sánh, logic và điều kiện ghép bằng `&&`, `||`, `!`.
- Phân biệt các `if` độc lập với chuỗi chỉ chọn một nhánh.
- `switch`, `case`, `break`, `default` khi chọn theo giá trị rời rạc.
- Dấu ngoặc khối, thứ tự kiểm tra và dữ liệu biên của từng trường hợp.

## Phân loại một điểm số

Xét quy tắc minh họa: điểm nguyên từ 0 đến 100; từ 80 trở lên thuộc nhóm A, từ 50 đến dưới 80 thuộc nhóm B, còn lại thuộc nhóm C. Đây là dữ liệu giả để học câu lệnh, không phải quy định đánh giá của CSAT.

| Điểm | Nhóm | Trường hợp cần thấy rõ |
|---:|---|---|
| 49 | C | Ngay dưới ngưỡng 50 |
| 50 | B | Bắt đầu nhóm B |
| 79 | B | Ngay dưới ngưỡng 80 |
| 80 | A | Bắt đầu nhóm A |

Phần mã đặt trong chương trình có `<iostream>`; `diem` đã được nhập và thuộc khoảng hợp lệ:

```cpp
if (diem >= 80) {
    cout << "A\n";
} else if (diem >= 50) {
    cout << "B\n";
} else {
    cout << "C\n";
}
```

Khi đến điều kiện `diem >= 50`, chương trình đã biết điểm không đạt 80, vì nếu đạt thì nhánh trước đã được chọn. Do đó không cần viết lại `diem < 80` ở nhánh B. Phần `else` còn lại tương ứng điểm dưới 50.

Nếu đổi thành hai `if` độc lập, điểm 90 có thể khiến cả điều kiện `>= 80` lẫn `>= 50` đúng và in hai nhóm. Nếu kiểm tra `>= 50` trước trong một chuỗi, điểm 90 lại bị xếp vào B. Cú pháp đúng chưa bảo đảm việc phân loại đúng; thứ tự là một phần của lời giải.

## Điều kiện ghép và nhánh độc lập

Kiểm tra một số nằm trong khoảng dùng `x >= 1 && x <= 10`. Kiểm tra một trong hai trường hợp dùng `x == 1 || x == 10`. Hai biểu thức nói hai yêu cầu khác nhau: thuộc cả khoảng và chỉ bằng một trong hai đầu mút.

Các `if` độc lập phù hợp khi nhiều hành động có thể cùng xảy ra. Chẳng hạn, một số có thể vừa chẵn vừa chia hết cho 3, và đề muốn in cả hai tính chất. Không nên chuyển chúng thành `else if` chỉ để chương trình ngắn hơn, vì như vậy tính chất thứ hai có thể không được xét.

## Chọn theo mã bằng `switch`

Với một mã nguyên có các giá trị 1, 2, 3 tương ứng ba thao tác, `switch` diễn đạt lựa chọn theo giá trị trực tiếp:

```cpp
switch (ma) {
    case 1: cout << "Cong\n"; break;
    case 2: cout << "Tru\n"; break;
    case 3: cout << "Nhan\n"; break;
    default: cout << "Ma khong hop le\n";
}
```

`ma` đã được nhập; đoạn mã cần `<iostream>`. `break` kết thúc nhánh lựa chọn. Nếu bỏ nó, chương trình có thể tiếp tục thực hiện những câu lệnh của nhánh phía sau, dù mã không bằng giá trị của nhánh ấy. Đôi khi việc đi tiếp được dùng có chủ đích, nhưng trong bài chọn một thao tác cần kết thúc đúng chỗ.

`switch` thuận tiện cho các giá trị cố định; phân loại theo khoảng hoặc nhiều điều kiện thường dễ đọc hơn với `if`. Chọn cấu trúc theo ý nghĩa yêu cầu, không ép mọi bài vào cùng một cú pháp.

## Vì sao đúng, chi phí và kiểm tra biên

Ví dụ điểm số có ba miền không chồng nhau: `[80, 100]`, `[50, 79]`, `[0, 49]`; chúng bao phủ mọi điểm hợp lệ. Chuỗi điều kiện chọn đúng miền và chỉ in một kết quả. Số nhánh ở ví dụ là cố định nên thời gian và bộ nhớ phụ `O(1)`.

Cần thử chính ngưỡng, ngay dưới và ngay trên ngưỡng. Đừng kiểm tra một phép chia trước khi biết mẫu số khác 0. Với điều kiện `b != 0 && a % b == 0`, vế sau chỉ được xét khi vế trước đúng; đổi thứ tự có thể thực hiện phép lấy dư không hợp lệ.

## Luyện tập

- So sánh hai số và in “nhỏ hơn”, “bằng”, “lớn hơn”; ba trường hợp phải bao phủ hết dữ liệu.
- Phân loại một số vừa theo tính chẵn/lẻ vừa theo chia hết cho 3, khi đề yêu cầu ghi đủ các tính chất.
- Viết bảng dữ liệu kiểm tra cho một quy tắc có hai ngưỡng trước khi chọn thứ tự nhánh.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao trong nhánh B không cần kiểm tra lại `diem < 80`?
>
> **Trả lời:** Nhánh B chỉ được xét sau khi điều kiện `diem >= 80` sai. Kết hợp điều đã biết với `diem >= 50`, ta có đúng miền từ 50 đến dưới 80. Điều này chỉ đúng với chuỗi `if`–`else if`, không đúng với hai `if` độc lập.

> **Câu hỏi 2:** Khi nào nên dùng hai `if` độc lập thay vì `else if`?
>
> **Trả lời:** Khi hai hành động có thể đồng thời cần thực hiện, chẳng hạn ghi cả tính chẵn và tính chia hết cho 3. `else if` chỉ chọn một nhánh nên sẽ bỏ một thông tin hợp lệ nếu điều kiện trước đã đúng.

## Nguồn tham khảo thêm

- [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/)
- [Microsoft Learn — switch statement](https://learn.microsoft.com/en-us/cpp/cpp/switch-statement-cpp?view=msvc-170)
