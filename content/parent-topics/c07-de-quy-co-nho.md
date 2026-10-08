Đệ quy có thể mô tả bài toán rất gọn nhưng vẫn tính đi tính lại cùng một kết quả. Đệ quy có nhớ giữ kết quả đã tính theo trạng thái, để những lời gọi sau sử dụng lại. Điểm cần hiểu là **hai lời gọi khi nào thực sự là cùng một bài toán**, không phải cứ thêm mảng là chương trình sẽ nhanh.

## Tư duy

- Nhận diện các bài toán con xuất hiện nhiều lần trong cây lời gọi.
- Chọn đủ thông tin để một trạng thái xác định duy nhất kết quả cần trả về.
- Phân biệt trạng thái chưa tính với trạng thái đã tính nhưng có kết quả bằng 0.
- Đếm số trạng thái khác nhau và chi phí xử lý một trạng thái để ước lượng thời gian.

## Nội dung học

- Dãy Fibonacci với `F(0) = 0`, `F(1) = 1` và quan hệ truy hồi.
- Mảng kết quả `memo`, mảng đánh dấu `seen` và thứ tự lưu kết quả.
- Chuyển từ đệ quy có nhớ sang cách tính từ nhỏ đến lớn.
- Giới hạn ngăn xếp, miền kiểu dữ liệu và điều kiện phụ thuộc không có vòng.

## Một cây lời gọi có nhiều nhánh trùng

Muốn tính `F(5)`, ta cần `F(4)` và `F(3)`. Muốn tính `F(4)`, ta lại cần `F(3)` và `F(2)`. Nếu tính trực tiếp theo công thức, `F(3)` đã xuất hiện hai lần; những trạng thái nhỏ hơn còn được gọi nhiều hơn.

```diagram
F(5)
├─ F(4)
│  ├─ F(3)
│  └─ F(2)
└─ F(3)       ← cùng đầu vào, cùng kết quả
```

Một bảng theo chỉ số n giúp thay cây nhiều nhánh bằng các kết quả dùng chung:

| n | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| F(n) | 0 | 1 | 1 | 2 | 3 | 5 | 8 |

Giả sử `F(3)` đã được tính là 2. Lời gọi sau không cần mở lại hai nhánh `F(2)` và `F(1)`; nó chỉ đọc ô đã lưu.

[Bài giảng Fibonacci của Errichto](https://www.youtube.com/watch?v=YBSt1jYwVfU) là một minh họa bổ sung cho sự khác nhau giữa cây gọi đệ quy và bảng kết quả; hãy đối chiếu với các nhánh trùng trong sơ đồ trên.

## Lưu kết quả sau khi giải xong

Mã trọng tâm sau nhận `0 <= n <= 92`, với các vector ban đầu có ít nhất `n + 1` phần tử và mọi ô `seen` bằng false. `F(92)` còn vừa số nguyên có dấu 64 bit; không mở rộng giới hạn chỉ vì mảng còn chỗ.

```cpp
#include <vector>

long long fib(int n, vector<long long>& memo, vector<bool>& seen) {
    if (seen[n]) {
        return memo[n];
    }

    if (n <= 1) {
        memo[n] = n;
    } else {
        memo[n] = fib(n - 1, memo, seen) + fib(n - 2, memo, seen);
    }

    seen[n] = true;
    return memo[n];
}
```

`seen` không được thay bằng điều kiện `memo[n] != 0`: số 0 là đáp án hợp lệ của `F(0)`. Khi xử lý nhiều bộ dữ liệu có quy tắc khác nhau, phải tạo lại hoặc xóa bảng nhớ; kết quả cũ không còn cùng hợp đồng.

## Vì sao dùng lại được?

Kết quả Fibonacci chỉ phụ thuộc n. Mỗi lời gọi với cùng n có cùng hai trạng thái phụ thuộc, nên kết quả đã lưu thay thế được phép tính mới. Các phụ thuộc đều có chỉ số nhỏ hơn, vì vậy không có vòng chờ. Nếu một bài toán còn phụ thuộc vị trí, sức chứa hoặc một lựa chọn trước đó, chỉ lưu theo n có thể gộp những trường hợp khác nhau và làm sai đáp án.

Đệ quy trực tiếp có số lời gọi tăng theo cấp số nhân. Với bảng nhớ, chỉ có `n + 1` trạng thái và mỗi trạng thái thực hiện số phép toán hằng số: `O(n)` thời gian, `O(n)` bảng nhớ và `O(n)` độ sâu ngăn xếp. Nhớ kết quả không tự làm giảm độ sâu lời gọi.

## Tính từ dưới lên là một cách nhìn khác

Vì biết trạng thái n chỉ cần hai trạng thái nhỏ hơn, ta có thể tính lần lượt 0, 1, 2,..., n bằng vòng lặp. Khi chỉ cần đáp án cuối, giữ hai giá trị gần nhất là đủ. Cách đệ quy có nhớ thuận tiện khi muốn bắt đầu từ câu hỏi cần trả lời; cách từ dưới lên thuận tiện khi thứ tự phụ thuộc đã rõ.

## Luyện tập

- Đếm số lần `F(3)` được tính trong đệ quy trực tiếp và trong phiên bản có nhớ.
- Viết lại số cách leo n bậc với mỗi bước dài 1 hoặc 2; nêu vì sao trạng thái 0 có một cách.
- Thử một bài toán có hai tham số và giải thích vì sao bảng nhớ một chiều không đủ.

## Tự kiểm tra

> **Câu hỏi 1:** Khi nào hai lời gọi có thể dùng chung kết quả?
>
> **Trả lời:** Khi trạng thái đã chứa đủ mọi thông tin ảnh hưởng đến kết quả, và quy tắc bài toán không thay đổi giữa hai lời gọi đó.

> **Câu hỏi 2:** Thêm bảng nhớ có loại bỏ nguy cơ đệ quy quá sâu không?
>
> **Trả lời:** Không. Bảng nhớ giảm tính toán lặp, nhưng chuỗi phụ thuộc dài vẫn có thể tạo nhiều lời gọi đang chờ.

## Nguồn tham khảo thêm

- [Viblo — Top-down và Bottom-up](https://viblo.asia/p/quy-hoach-dong-76-top-down-va-bottom-up-gwd43g0j4X9)
- [USACO Guide — Introduction to DP](https://usaco.guide/gold/intro-dp)
- [Errichto — Fibonacci, iteration vs recursion](https://www.youtube.com/watch?v=YBSt1jYwVfU)
