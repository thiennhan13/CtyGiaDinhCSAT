Quy hoạch động bắt đầu từ một câu hỏi đủ nhỏ để có thể dùng lại câu trả lời. Bài này nối ba mô hình: đếm cách leo bậc, tìm đường tốt nhất trong tam giác và tìm đoạn có tổng lớn nhất. Mỗi mô hình có một ý nghĩa trạng thái khác nhau; không áp dụng cùng công thức chỉ vì cùng dùng mảng.

## Tư duy

- Viết ý nghĩa của trạng thái bằng một câu đầy đủ trước khi đặt tên `dp`.
- Xét bước cuối của một phương án để tìm các trạng thái dẫn tới nó.
- Phân biệt bài đếm với bài tối ưu: cộng số cách khác với chọn min hoặc max.
- Chọn cơ sở theo ý nghĩa bài toán, không mặc định mọi ô bắt đầu bằng 0.

## Nội dung học

- Leo bậc thang với bước dài 1 hoặc 2, trạng thái và công thức đếm.
- Tam giác số, hai ô kề ở hàng dưới và cách tính từ đáy lên.
- Kadane cho đoạn liên tiếp có tổng lớn nhất, kể cả dãy toàn số âm.
- Số trạng thái, số chuyển mỗi trạng thái, bộ nhớ và giới hạn giá trị.

## Đếm cách leo một cầu thang

Mỗi bước leo 1 hoặc 2 bậc. Liệt kê mọi chuỗi bước có nhiều nhánh; thay vào đó, gọi `ways[i]` là số cách tới bậc i. Bước cuối dài 1 đi từ i−1, bước cuối dài 2 đi từ i−2. Hai nhóm không trùng vì bước cuối khác nhau.

| Bậc i | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|---:|
| Số cách | 1 | 1 | 2 | 3 | 5 | 8 |

`ways[0] = 1` là một cách không thực hiện bước nào. Gán 0 sẽ xóa nguồn của mọi cách đi. Với `0 <= n <= 90`, đáp án vừa `long long`:

```cpp
#include <vector>

long long climb(int n) {
    vector<long long> ways(n + 1);
    ways[0] = 1;
    for (int i = 1; i <= n; i++) {
        ways[i] = ways[i - 1];
        if (i >= 2) ways[i] += ways[i - 2];
    }
    return ways[n];
}
```

Thời gian và bộ nhớ O(n); chỉ cần giữ hai giá trị gần nhất nếu không cần bảng. Với n lớn, cần yêu cầu modulo hoặc kiểu số phù hợp vì số cách tăng nhanh.

Có thể xem [bài giảng nhập môn DP của Errichto](https://www.youtube.com/watch?v=YBSt1jYwVfU) để đặt cạnh nhau cách đệ quy và tính từ nhỏ tới lớn; bảng số cách trên vẫn là điểm để tự kiểm tra.

## Tối ưu đường trong tam giác

Mỗi hàng có thêm một ô. Từ `(r,c)` chỉ đi tới `(r+1,c)` hoặc `(r+1,c+1)`. Tam giác `2 / 4 1 / 1 7 3` có đường tốt nhất `2 → 4 → 7`, tổng 13.

Gọi `best[r][c]` là tổng lớn nhất từ ô đó xuống đáy, tính cả ô hiện tại. Hàng đáy có đáp án bằng giá trị ô. Phía trên dùng `a[r][c] + max(best[r+1][c], best[r+1][c+1])`. Tính từ đáy lên để hai phụ thuộc đã sẵn sàng. Có O(n²) ô cho n hàng: thời gian O(n²), bảng đầy đủ O(n²), có thể rút còn một hàng O(n).

## Trạng thái phải kết thúc ở đây: Kadane

Với `[-3,4,-1,2,-5]`, đoạn `[4,-1,2]` có tổng 5. Thử mọi đoạn mất O(n²) sau khi dùng tiền tố. Để đi nhanh hơn, gọi `ending` là tổng lớn nhất của đoạn **không rỗng kết thúc tại vị trí hiện tại**. Đoạn ấy bắt đầu ngay ở x hoặc nối x vào đoạn tốt nhất kết thúc ở ô trước: `ending = max(x, ending + x)`.

| x đang xét | −3 | 4 | −1 | 2 | −5 |
|---|---:|---:|---:|---:|---:|
| ending | −3 | 4 | 3 | 5 | 0 |
| Tốt nhất đã gặp | −3 | 4 | 4 | 5 | 5 |

```cpp
#include <algorithm>
#include <vector>

long long maximumSubarray(const vector<long long>& a) {
    long long ending = a[0], answer = a[0];
    for (int i = 1; i < a.size(); i++) {
        ending = max(a[i], ending + a[i]);
        answer = max(answer, ending);
    }
    return answer;
}
```

Đầu vào không rỗng và mọi tổng phải vừa `long long`. Dãy toàn âm trả về phần tử lớn nhất, không trả 0: đoạn không rỗng không cho phép bỏ hết. Hai lựa chọn cho phần tử cuối bao phủ mọi đoạn; theo quy nạp, chọn max cho đúng ending, rồi cập nhật answer cho mọi điểm kết thúc. Thời gian O(n), bộ nhớ phụ O(1).

## Luyện tập

- Đổi bước cầu thang thành 1 hoặc 3; xây lại công thức và cơ sở.
- Với tam giác chứa số âm, giải thích vì sao không khởi tạo mọi ô chưa có lời giải bằng 0.
- Thêm chỉ số đầu/cuối vào Kadane để trả về đoạn, xử lý nhiều đoạn cùng tổng.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao leo bậc dùng cộng, còn tam giác dùng max?
>
> **Trả lời:** Leo bậc cần đếm các phương án thuộc những nhóm không trùng; tam giác chỉ cần giá trị tốt nhất trong các lựa chọn hợp lệ.

> **Câu hỏi 2:** Vì sao phải phân biệt ending với answer?
>
> **Trả lời:** ending buộc đoạn kết thúc tại vị trí hiện tại để chuyển tiếp; answer là tốt nhất trên mọi điểm kết thúc đã xét.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
- [USACO Guide — Introduction to DP](https://usaco.guide/gold/intro-dp)
- [Errichto — Fibonacci, iteration vs recursion](https://www.youtube.com/watch?v=YBSt1jYwVfU)
