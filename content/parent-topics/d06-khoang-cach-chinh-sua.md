Hai xâu có thể khác nhau vì thừa kí tự, thiếu kí tự hoặc có kí tự cần thay. Khoảng cách chỉnh sửa đo số phép biến đổi ít nhất để đưa xâu này thành xâu kia. Bài học định nghĩa rõ từng phép và chi phí, rồi dùng hai tiền tố để biểu diễn phần việc đã hoàn thành.

## Tư duy

- Nêu những thao tác được phép và đơn giá trước khi gọi một đáp án là ít nhất.
- Xét thao tác cuối để phân loại mọi cách biến đổi thành các nhánh không thiếu.
- Phân biệt sửa một kí tự với đổi vị trí hai kí tự; không tự thêm thao tác vào mô hình.
- Dùng hàng/cột cơ sở để biểu diễn biến đổi từ hoặc tới xâu rỗng.

## Nội dung học

- Khoảng cách Levenshtein với chèn, xóa, thay thế, mỗi phép có chi phí 1.
- Trạng thái `dp[i][j]` cho hai tiền tố và ba hướng chuyển.
- Nhánh giữ nguyên khi kí tự cuối bằng nhau.
- Truy vết thao tác, bộ nhớ hai hàng và giới hạn bảng.

## Đừng sửa theo sự khác nhau nhìn thấy đầu tiên

Biến `CAT` thành `CUT` chỉ cần thay A bằng U, chi phí 1. Biến `CA` thành `ABC` cần ít nhất 3 phép trong mô hình này; không được xem đảo hoặc chuyển vị kí tự là một phép nếu đề chưa cho phép.

Một ví dụ đơn giản để đọc bảng là `ab` thành `ac`:

| a / b | Rỗng | a | ac |
|---|---:|---:|---:|
| Rỗng | 0 | 1 | 2 |
| a | 1 | 0 | 1 |
| ab | 2 | 1 | 1 |

Hàng đầu cần chèn lần lượt 0, 1, 2 kí tự. Cột đầu cần xóa 0, 1, 2 kí tự. Ô cuối có thể thay b bằng c, từ ô chéo có chi phí 0 rồi cộng 1.

## Mỗi hướng có một ý nghĩa

Gọi `dp[i][j]` là ít phép nhất đổi i kí tự đầu của a thành j kí tự đầu của b:

- Xóa kí tự cuối của a: `dp[i-1][j] + 1`.
- Chèn kí tự cuối của b: `dp[i][j-1] + 1`.
- Ghép hai kí tự cuối: `dp[i-1][j-1]` nếu bằng nhau, cộng 1 nếu cần thay.

Lấy min của các ứng viên. Có thể nhìn một quá trình biến đổi như căn chỉnh hai xâu: một cột căn chỉnh ghép hai kí tự, ghép kí tự a với khoảng trống hoặc ghép khoảng trống với kí tự b. Xét cột cuối cho đúng ba nhánh trên; tối ưu phần căn chỉnh còn lại tạo lời giải tối ưu toàn bộ.

```cpp
#include <algorithm>
#include <string>
#include <vector>

int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;

    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            int replace = dp[i - 1][j - 1] + (a[i - 1] != b[j - 1]);
            dp[i][j] = min({dp[i - 1][j] + 1, dp[i][j - 1] + 1, replace});
        }
    }
    return dp[n][m];
}
```

Mã dành cho bảng kí tự đơn byte; n,m vừa int và tích kích thước vừa bộ nhớ, chẳng hạn không quá 2000 mỗi xâu. Giá trị lớn nhất không vượt n+m, nên int phù hợp trong miền đó.

## LCS gần nhau nhưng không phải cùng bài

Nếu **chỉ** cho chèn và xóa, số phép ít nhất liên hệ với LCS qua `n + m - 2*LCS`. Khi được thay thế với chi phí 1, công thức ấy không còn đúng: `a` thành `b` mất một lần thay, nhưng chèn/xóa cần hai lần. Không chuyển công thức giữa hai bài mà bỏ điều kiện thao tác.

Nếu chi phí chèn, xóa, thay khác nhau, thay các số cộng bằng đúng chi phí của đề. Nếu thêm hoán đổi hai kí tự kề nhau, cần một trạng thái/chuyển phù hợp và kiểm tra lại mô hình; không giữ nguyên hàm rồi gọi đó là khoảng cách mới.

## Chi phí và luyện tập

O(nm) thời gian, O(nm) bộ nhớ; rút còn hai hàng khi chỉ cần số phép, giữ O(min(n,m)) ô. Muốn in các thao tác, đi ngược theo nhánh tạo giá trị ô hiện tại và lưu thao tác; nhớ rằng vị trí trong xâu thay đổi khi thực hiện chèn/xóa.

- Kiểm tra hai xâu rỗng, một xâu rỗng và hai xâu giống nhau.
- Tính tay `book` thành `back`, giải thích hai phép thay.
- Đổi giá thay thành 3, rồi kiểm tra lúc nào chèn và xóa rẻ hơn thay.

## Tự kiểm tra

> **Câu hỏi 1:** Công thức n+m−2·LCS có dùng khi thay thế giá 1 không?
>
> **Trả lời:** Không nói chung. Công thức đó mô tả chèn/xóa; thay thế giá 1 có thể rẻ hơn một lần xóa cộng một lần chèn.

> **Câu hỏi 2:** Vì sao dp[i][0] bằng i?
>
> **Trả lời:** Muốn biến i kí tự thành xâu rỗng phải xóa cả i kí tự; mỗi phép xóa có giá 1 và không có cách rẻ hơn trong mô hình.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 2](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-2.md)
- [USACO Guide — Introduction to DP](https://usaco.guide/gold/intro-dp)
- [Viblo — Các khuôn mẫu quy hoạch động](https://viblo.asia/p/lam-chu-quy-hoach-dong-cac-khuon-mau-thuong-gap-phan-1-13VM905GVY7)
