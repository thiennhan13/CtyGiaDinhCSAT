Khi cần liệt kê mọi cấu hình hợp lệ, ta có thể xây từng phần thay vì viết trước toàn bộ kết quả. Quay lui thử một lựa chọn, tiếp tục hoàn thiện cấu hình rồi khôi phục trạng thái để thử lựa chọn khác. Bài này dùng xâu nhị phân, tổ hợp và hoán vị để làm rõ cách tránh thiếu, lặp hoặc làm bẩn trạng thái giữa các nhánh.

## Tư duy

- Chia một cấu hình thành những vị trí hoặc quyết định có thứ tự.
- Xác định những lựa chọn hợp lệ tại vị trí đang xây dựng.
- Giữ bất biến của phần đã chọn, khôi phục nó sau khi kết thúc mỗi nhánh.
- Dự đoán số kết quả phải xuất trước khi đánh giá một thuật toán liệt kê.

## Nội dung học

- Mẫu thử → ghi nhận → gọi tiếp → hoàn tác trong quay lui.
- Sinh xâu nhị phân và xâu trên một bảng chữ cái hữu hạn.
- Sinh tổ hợp bằng các phần tử tăng dần, sinh hoán vị bằng mảng đánh dấu.
- Trường hợp cấu hình rỗng, chi phí đầu ra và giới hạn kích thước.

## Liệt kê nhưng không viết mọi trường hợp bằng tay

Xâu nhị phân dài 3 có tám kết quả. Có thể viết ba vòng lặp lồng nhau, nhưng số vòng sẽ thay đổi khi n thay đổi. Hàm đệ quy cho phép một quy tắc dùng cho mọi vị trí:

```diagram
chuỗi rỗng
├─ 0 → 00 → 000, 001
│     01 → 010, 011
└─ 1 → 10 → 100, 101
      11 → 110, 111
```

Tại một vị trí chỉ có hai lựa chọn. Khi đã chọn đủ n kí tự, xuất chuỗi. Mọi xâu có đúng một đường đi từ gốc tới lá, nên không thiếu và không trùng.

```cpp
#include <iostream>
#include <string>

void binaryStrings(int n, string& current) {
    if (current.size() == n) {
        cout << current << '\n';
        return;
    }

    for (char digit : {'0', '1'}) {
        current.push_back(digit);
        binaryStrings(n, current);
        current.pop_back();
    }
}
```

Gọi với n không âm và `current` rỗng. n bằng 0 sinh một cấu hình rỗng, được thể hiện bằng một dòng trống. Nếu quên `pop_back`, nhánh sau sẽ chứa kí tự của nhánh trước.

## Tổ hợp cần loại thứ tự dư thừa

Chọn 2 phần tử từ `{1, 2, 3, 4}` có sáu tổ hợp:

| Bắt đầu bằng | Các tổ hợp |
|---|---|
| 1 | `(1,2)`, `(1,3)`, `(1,4)` |
| 2 | `(2,3)`, `(2,4)` |
| 3 | `(3,4)` |

Nếu sinh cả `(1,2)` lẫn `(2,1)`, ta đang đếm hai lần cùng một tập. Vì thế sau khi chọn x, chỉ chọn phần tử lớn hơn x. Cận `n - need + 1` loại nhánh không còn đủ phần tử để hoàn thành.

```cpp
#include <iostream>
#include <vector>

void combinations(int n, int need, int start, vector<int>& chosen) {
    if (need == 0) {
        for (int x : chosen) cout << x << ' ';
        cout << '\n';
        return;
    }

    for (int x = start; x <= n - need + 1; x++) {
        chosen.push_back(x);
        combinations(n, need - 1, x + 1, chosen);
        chosen.pop_back();
    }
}
```

Gọi `combinations(n, k, 1, chosen)` với `0 <= k <= n`.

## Hoán vị giữ thứ tự, nhưng không dùng lại phần tử

Với hoán vị, `(1,2)` khác `(2,1)`, nên không dùng điều kiện tăng. Ta lưu `used[x]`: true nghĩa là x đã nằm trong phần đang xây. Mã sau sinh hoán vị của 1..n; gọi với current rỗng và used có n+1 ô đều false.

```cpp
#include <iostream>
#include <vector>

void permutations(int n, vector<int>& current, vector<bool>& used) {
    if (current.size() == n) {
        for (int x : current) cout << x << ' ';
        cout << '\n';
        return;
    }

    for (int x = 1; x <= n; x++) {
        if (used[x]) continue;
        used[x] = true;
        current.push_back(x);
        permutations(n, current, used);
        current.pop_back();
        used[x] = false;
    }
}
```

Phần đã chọn luôn chứa các số khác nhau. Mỗi hoán vị xác định một lựa chọn tại từng vị trí, nên có đúng một đường đi sinh nó. Nếu các phần tử đầu vào trùng nhau, sinh theo chỉ số có thể tạo kết quả trùng về giá trị; cần quy tắc loại trùng riêng.

## Liệt kê có một giới hạn không thể bỏ qua

Xuất tất cả xâu nhị phân mất ít nhất O(n·2^n) kí tự; thuật toán trên có cùng bậc thời gian và O(n) bộ nhớ phụ. Tổ hợp xuất O(k·C(n,k)) kí tự; hoán vị dài n có n! kết quả và chi phí xuất O(n·n!). Cắt nhánh không thể làm nhanh hơn kích thước đầu ra khi mọi kết quả đều phải in.

Không lưu cả danh sách nếu chỉ cần in hoặc cập nhật một thống kê. Nếu chỉ cần **số lượng** cấu hình, cân nhắc công thức hoặc quy hoạch động trước khi chọn liệt kê.

## Luyện tập

- Sinh xâu nhị phân không có hai kí tự 1 liên tiếp bằng cách kiểm tra tiền tố.
- Sinh tổ hợp k phần tử, kiểm chứng số kết quả với n nhỏ.
- Sinh hoán vị của 1..n và mô tả trạng thái `used` ngay trước và sau một nhánh.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao tổ hợp dùng phần tử tăng dần còn hoán vị không dùng quy tắc đó?
>
> **Trả lời:** Tổ hợp không phân biệt thứ tự, nên chọn một thứ tự tăng để biểu diễn duy nhất. Hoán vị phân biệt thứ tự; bắt tăng sẽ loại những kết quả cần liệt kê.

> **Câu hỏi 2:** Vì sao thuật toán in mọi xâu nhị phân không thể có thời gian O(n)?
>
> **Trả lời:** Có 2^n xâu và mỗi xâu dài n. Chỉ riêng việc xuất đủ kết quả đã cần O(n·2^n) công việc.

## Nguồn tham khảo thêm

- [VNOI — Đệ quy và thuật toán quay lui](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md)
- [USACO Guide — Basic Complete Search](https://usaco.guide/bronze/intro-complete)
