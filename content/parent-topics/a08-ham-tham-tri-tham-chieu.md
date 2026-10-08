Khi cùng một phép xử lý xuất hiện ở nhiều nơi, đặt nó vào một hàm giúp chương trình dễ đọc và dễ kiểm tra hơn. Hàm nhận thông tin qua tham số, làm một công việc có tên rõ ràng rồi trả kết quả hoặc thay đổi dữ liệu theo thỏa thuận. Bài học làm rõ dữ liệu nào chỉ là bản sao, dữ liệu nào được phép thay đổi và biến được sử dụng trong phạm vi nào.

## Tư duy

- Tách một nhiệm vụ nhỏ có đầu vào, kết quả và điều kiện sử dụng rõ ràng.
- Đọc lời gọi hàm như một bước xử lý, không cần lặp lại toàn bộ chi tiết ở mỗi nơi dùng.
- Phân biệt việc tính kết quả với việc thay đổi biến của nơi gọi.
- Giữ phạm vi biến vừa đủ để tránh các phần chương trình ảnh hưởng nhau ngoài ý muốn.

## Nội dung học

- Khai báo/định nghĩa hàm: kiểu trả về, tên, danh sách tham số và thân hàm.
- Lời gọi hàm, đối số, `return` và hàm không trả giá trị với `void`.
- Truyền tham trị: hàm làm việc trên bản sao của dữ liệu đơn giản.
- Truyền tham chiếu bằng `&`: thay đổi tham số có thể thay đổi biến tại nơi gọi.
- Biến cục bộ, phạm vi khối và đặt tên để làm rõ vai trò của mỗi biến.

## Một hàm có nhiệm vụ rõ

Muốn nhiều lần tính tổng từ 1 đến `n`, ta có thể viết một hàm riêng. Hàm sau đặt ngoài `main`, giả sử `0 ≤ n ≤ 1 000 000`:

```cpp
long long tong_den(int n) {
    long long tong = 0;
    for (int i = 1; i <= n; ++i) {
        tong += i;
    }
    return tong;
}
```

Lời gọi `tong_den(5)` có kết quả 15; `tong_den(0)` có kết quả 0. Tham số `n` trong hàm nhận giá trị của đối số ở mỗi lời gọi. Biến `tong` được tạo lại và bắt đầu bằng 0 khi gọi hàm, nên lần tính cho 5 không để lại tổng cho lần tính tiếp theo.

| Nơi gọi đưa vào | Hàm thực hiện | Giá trị trả về |
|---:|---|---:|
| 3 | Cộng 1, 2, 3 | 6 |
| 5 | Cộng 1 đến 5 | 15 |
| 0 | Không có lượt cộng | 0 |

`return` gửi giá trị về nơi gọi và kết thúc lần thực hiện hàm. Nơi gọi có thể gán kết quả vào biến, in nó hoặc sử dụng trong một biểu thức khác. Tên hàm mô tả công việc, còn điều kiện đầu vào làm rõ phạm vi mà công việc đó đúng.

## Bản sao và tham chiếu khác nhau thế nào?

Hai hàm sau đều cộng 1 vào tham số, nhưng tác động đến nơi gọi khác nhau:

```cpp
void tang_ban_sao(int x) {
    ++x;
}

void tang_bien_goc(int& x) {
    ++x;
}
```

Đây là hai định nghĩa ngoài `main`. Xét phần mã trong `main` dùng `<iostream>`:

```cpp
int a = 4;
tang_ban_sao(a);
cout << a << '\n';

tang_bien_goc(a);
cout << a << '\n';
```

Kết quả lần lượt là 4 và 5. Ở hàm đầu, `x` là bản sao nên tăng nó không đổi `a`. Ở hàm sau, `x` tham chiếu đến chính `a`; tác động lên `x` cũng là tác động lên biến tại nơi gọi.

```diagram
Tham trị:    a = 4 → tạo x = 4 → tăng x thành 5 → a vẫn là 4
Tham chiếu:  a = 4 ← cùng biến được gọi là x → tăng thành 5
```

Tham chiếu phù hợp khi việc thay đổi dữ liệu là một phần có chủ đích của hàm, chẳng hạn đổi chỗ hai biến. Không nên thêm `&` chỉ vì muốn hàm “nhanh hơn” mà bỏ qua tác động thay đổi đầu vào.

[CS50 Shorts — Functions](https://www.youtube.com/watch?v=n1glFqt3g38) giúp quan sát cách thông tin đi vào một hàm và kết quả đi về nơi gọi; đối chiếu thêm sơ đồ tham trị/tham chiếu trong bài để thấy khi nào biến gốc thay đổi.

## Phạm vi biến và cách tổ chức chương trình

Biến khai báo trong hàm là biến cục bộ của lần thực hiện hàm đó. Biến `i` được khai báo trong `for` ở `tong_den` không thể dùng ở ngoài phạm vi vòng lặp. Hai hàm có thể có biến cùng tên nhưng đó không tự động là cùng một vùng dữ liệu.

Đặt biến kết quả ở nơi nhỏ nhất đủ dùng giúp theo dõi rõ lúc nó được khởi tạo và thay đổi. Nếu dùng biến chung ngoài mọi hàm, một lần gọi có thể ảnh hưởng lần sau; cần lý do cụ thể và thỏa thuận rõ, không dùng nó chỉ để tránh truyền tham số.

Khi hàm được định nghĩa sau `main`, chương trình cần một khai báo hàm trước nơi gọi. Với bài nhỏ, đặt định nghĩa trước `main` giúp học sinh đọc được nhiệm vụ trước khi xem cách sử dụng.

## Tính đúng, chi phí và điều kiện

Hàm `tong_den` đúng vì sau mỗi lượt, `tong` chứa tổng các số đã xét; cuối cùng trả đúng tổng đến `n`. Nó có thời gian `O(n)` và bộ nhớ phụ `O(1)`. Đưa một đoạn vào hàm không tự giảm độ phức tạp: gọi nó `q` lần với cận gần `n` có thể vẫn cần `O(qn)` công việc.

Các hàm tăng biến cần bảo đảm giá trị sau tăng vẫn vừa kiểu `int`. Hàm trả giá trị phải có kết quả phù hợp cho mọi đường đi hợp lệ; hàm `void` không thể dùng như một số trong biểu thức. Kiểm tra từng hàm bằng dữ liệu nhỏ trước, rồi kiểm tra cách các hàm kết hợp.

## Luyện tập

- Viết hàm trả số lớn hơn trong hai số và thử trường hợp chúng bằng nhau.
- Viết hàm đổi chỗ hai biến qua tham chiếu; giải thích vì sao truyền bản sao không đổi được hai biến gốc.
- Dùng hàm cộng tổng cho ba đầu vào khác nhau, kiểm tra rằng biến kết quả không bị tích lũy giữa các lời gọi.

## Tự kiểm tra

> **Câu hỏi 1:** Hai hàm cùng có biến tên `tong` thì các biến đó có tự chia sẻ giá trị không?
>
> **Trả lời:** Không. Biến cục bộ thuộc phạm vi và lần thực hiện hàm nơi nó được tạo. Cùng tên không làm chúng trở thành cùng một biến; chia sẻ dữ liệu cần cơ chế cụ thể như tham chiếu hoặc một biến chung có chủ đích.

> **Câu hỏi 2:** Vì sao hàm tăng tham trị không làm `a` từ 4 thành 5?
>
> **Trả lời:** Nó nhận một bản sao của giá trị `a`, rồi tăng bản sao. Muốn thay đổi biến của nơi gọi, hàm phải trả kết quả để nơi gọi gán lại hoặc nhận tham chiếu và công bố rõ tác động đó.

## Nguồn tham khảo thêm

- [Harvard CS50 — Lecture 1](https://cs50.harvard.edu/x/notes/1/)
- [CS50 Shorts — Functions (video)](https://www.youtube.com/watch?v=n1glFqt3g38)
- [Microsoft Learn — Reference-Type Function Arguments](https://learn.microsoft.com/en-us/cpp/cpp/reference-type-function-arguments?view=msvc-170)
