Một danh sách công việc chưa nói đủ cách xử lý: việc đến trước cần làm trước, hay việc vừa mở cần kết thúc trước? Hàng đợi, ngăn xếp và hàng đợi hai đầu cung cấp những quy tắc truy cập khác nhau. Chọn đúng quy tắc giúp chương trình mô phỏng quá trình tự nhiên và tránh thao tác dịch dữ liệu không cần thiết.

## Tư duy

- Mô tả thứ tự vào và thứ tự ra trước khi lựa chọn cấu trúc.
- Nhìn phần tử ở đầu hoặc đỉnh như một nhiệm vụ đang chờ xử lý theo quy tắc.
- Duy trì trạng thái của các việc còn chưa kết thúc và kiểm tra tính hợp lệ từng bước.
- Tính số lần một phần tử được thêm và bỏ để phân tích toàn bộ quá trình.

## Nội dung học

- `queue`: vào trước ra trước, `push`, `front`, `pop`.
- `stack`: vào sau ra trước, `push`, `top`, `pop`.
- `deque`: thêm/bỏ và đọc ở cả hai đầu.
- `empty()` trước truy cập, phân biệt đọc phần tử với xóa phần tử.

## Một dãy, hai thứ tự xử lý

Ba nhiệm vụ A, B, C được thêm theo thứ tự đó. Nếu nhiệm vụ đến trước được xử lý trước, kết quả là A, B, C; `queue` mô hình hóa quy tắc này. Nếu đây là ba lớp việc lồng nhau, C là lớp vừa mở và phải kết thúc trước B, A; ta cần `stack`.

| Cấu trúc | Thêm A, B, C | Phần tử ra đầu tiên | Thứ tự ra toàn bộ |
|---|---|---|---|
| Hàng đợi | C thêm vào cuối | A ở đầu | A, B, C |
| Ngăn xếp | C thêm lên đỉnh | C ở đỉnh | C, B, A |

Dùng `vector` rồi xóa phần tử đầu cũng có thể mô phỏng hàng đợi, nhưng mỗi lần xóa phải dịch phần còn lại; chuỗi thao tác có thể tốn bậc hai. Container phù hợp diễn đạt rõ quy tắc và tránh kiểu dịch đó.

Đoạn mã dùng `<queue>` và `<iostream>`.

```cpp
queue<int> q;
q.push(10);
q.push(20);
q.push(30);

while (!q.empty()) {
    int x = q.front();
    q.pop();
    cout << x << ' ';
}
// Thứ tự: 10 20 30.
```

`front()` đọc nhưng không xóa; `pop()` xóa nhưng không trả giá trị. Vì vậy, muốn xử lý giá trị sau khi bỏ nó khỏi cấu trúc thì cần lưu trước. Cả `front`, `top` và `pop` đều cần phần tử tồn tại.

## Ngăn xếp và dấu ngoặc lồng nhau

Chuỗi `([])` hợp lệ: dấu `]` đóng dấu `[` vừa mở, rồi `)` đóng `(`. Chuỗi `([)]` không hợp lệ dù số lần mở và đóng từng loại bằng nhau: dấu `)` xuất hiện khi lớp gần nhất chưa kết thúc là `[`.

Cách chỉ đếm số ngoặc mở và đóng không nắm được thứ tự lồng. Ngăn xếp giữ những ngoặc mở chưa được ghép, với ngoặc gần nhất ở đỉnh.

| Ký tự của `([])` | Ngăn xếp sau xử lý |
|---|---|
| `(` | `(` |
| `[` | `( [` |
| `]` | `(` |
| `)` | Rỗng |

Hàm dùng `<stack>` và `<string>`, nhận chuỗi chỉ có ba loại dấu ngoặc; ký tự khác bị coi là không hợp lệ.

```cpp
bool ngoac_dung(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (c != ')' && c != ']' && c != '}') return false;
            if (st.empty()) return false;
            char can = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (st.top() != can) return false;
            st.pop();
        }
    }
    return st.empty();
}
```

Sau mỗi ký tự hợp lệ, ngăn xếp chứa đúng những ngoặc mở chưa đóng, theo thứ tự mở. Đỉnh là ngoặc phải được đóng tiếp để giữ tính lồng nhau. Một ngoặc đóng sai loại hoặc không có ngoặc mở tương ứng chứng minh chuỗi sai ngay; cuối chuỗi còn ngoặc mở cũng là không hợp lệ.

Mỗi ký tự được xử lý một lần, mỗi ngoặc mở được thêm và bỏ tối đa một lần: thời gian `O(n)`, bộ nhớ phụ `O(n)` trong trường hợp mọi ngoặc đều mở. Chuỗi rỗng được coi hợp lệ theo quy ước của hàm.

## Hàng đợi hai đầu

`deque` cho phép bổ sung ưu tiên ở đầu hoặc công việc thường ở cuối. Đoạn mã dùng `<deque>`:

```cpp
deque<int> d;
d.push_back(20);
d.push_back(30);
d.push_front(10);
// Thứ tự từ đầu đến cuối: 10, 20, 30.
d.pop_back();
// Còn 10, 20.
```

Các thao tác thêm/bỏ một phần tử ở hai đầu có thời gian `O(1)`; truy cập chỉ số hợp lệ cũng `O(1)`. Chèn hoặc xóa ở giữa không có cùng chi phí thuận lợi. `deque` không tự tạo thứ tự ưu tiên theo giá trị: thứ tự chỉ do những lệnh thêm/bỏ mà chương trình đã chọn.

## Luyện tập

- Mô phỏng lượt xử lý nhiệm vụ theo quy tắc đến trước làm trước.
- Kiểm tra ngoặc đúng cho chuỗi thiếu mở, thiếu đóng và sai loại khi lồng.
- Duy trì dãy với thao tác thêm đầu, thêm cuối, xóa đầu, xóa cuối; đối chiếu bằng bảng trạng thái nhỏ.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao đếm tổng số ngoặc mở và đóng không đủ kiểm tra chuỗi lồng nhiều loại?
>
> **Trả lời:** Số lượng không thể hiện thứ tự. Một ngoặc đóng phải ghép với ngoặc mở gần nhất chưa đóng và đúng loại; chuỗi `([)]` có đủ số lượng nhưng vi phạm điều đó.

> **Câu hỏi 2:** Cấu trúc nào phù hợp khi công việc mới nhất phải được hoàn tất trước công việc cũ?
>
> **Trả lời:** Ngăn xếp, vì phần tử thêm gần nhất nằm ở đỉnh và được lấy ra trước. Đây là quy tắc vào sau ra trước, phù hợp quá trình lồng nhau hoặc quay lại các bước gần nhất.

## Nguồn tham khảo thêm

- [Viblo Algorithm — Ngăn xếp và hàng đợi](https://viblo.asia/p/ngan-xep-va-hang-doi-stack-queue-yMnKM6MQZ7P)
- [Viblo — Stack và queue trong cấu trúc dữ liệu](https://viblo.asia/p/stack-va-queue-trong-cau-truc-du-lieu-RQqKLv8Nl7z)
