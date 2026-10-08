LCS tìm dãy kí tự chung dài nhất của hai xâu, trong đó được bỏ bớt kí tự nhưng giữ thứ tự. Các kí tự được chọn **không bắt buộc liên tiếp**. Đây là điểm cần phân biệt với đoạn xâu chung liên tiếp: hai bài có tên gọi gần nhau nhưng công thức và cách truy vết khác nhau.

## Tư duy

- Dùng hai độ dài tiền tố để mô tả phần của hai xâu đang xét.
- Xét kí tự cuối của hai tiền tố, phân biệt khớp và không khớp.
- Hiểu nhánh bỏ kí tự là giữ lựa chọn tốt nhất, không mặc định bỏ bên dài hơn.
- Đi ngược bảng theo quyết định hợp lệ để dựng một LCS thật.

## Nội dung học

- `dp[i][j]`: độ dài LCS của i kí tự đầu xâu a và j kí tự đầu xâu b.
- Hàng 0 và cột 0, chuyển chéo khi kí tự bằng nhau và max hai nhánh khi khác.
- Truy vết, nhiều đáp án tối ưu và đảo chuỗi được dựng ngược.
- O(nm) thời gian, bộ nhớ bảng và rút hàng khi chỉ cần độ dài.

## Một ví dụ phân biệt dãy con với đoạn liên tiếp

Hai xâu `ABC` và `AC` có LCS `AC` dài 2: bỏ B từ xâu đầu. Trong `ABC`, A và C không đứng cạnh nhau, nên `AC` không phải đoạn liên tiếp. Một phương pháp chỉ dò các đoạn liên tiếp sẽ trả thiếu độ dài.

| Tiền tố a / tiền tố b | Rỗng | A | AC |
|---|---:|---:|---:|
| Rỗng | 0 | 0 | 0 |
| A | 0 | 1 | 1 |
| AB | 0 | 1 | 1 |
| ABC | 0 | 1 | 2 |

Nếu kí tự cuối bằng nhau, có một lời giải tối ưu ghép cặp hai kí tự cuối: lấy LCS của phần trước rồi thêm kí tự ấy. Có thể giải thích bằng cách đưa lần xuất hiện cuối được chọn của kí tự đó ra vị trí cuối cùng trong cả hai xâu; việc dịch về sau không phá thứ tự của phần đã chọn.

Nếu kí tự cuối khác nhau, không thể dùng chúng làm cùng một kí tự cuối của dãy chung. Mọi lời giải bỏ ít nhất một trong hai, nên lấy max của hai trạng thái bỏ bên a hoặc bỏ bên b.

## Lập bảng và truy vết trong cùng một hàm

Mã nhận hai xâu có kích thước vừa int; bảng cần `(n+1)(m+1)` ô int. Ví dụ n,m không quá 2000 để vùng nhớ và thời gian thực hành vừa phải. Trả một LCS, không yêu cầu nhỏ nhất từ điển.

```cpp
#include <algorithm>
#include <string>
#include <vector>

string lcs(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    string result;
    int i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            result.push_back(a[i - 1]);
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    reverse(result.begin(), result.end());
    return result;
}
```

Chỉ số dp là độ dài tiền tố; kí tự cuối tương ứng nằm ở `i-1` và `j-1`. Không thêm kí tự khi đi lên hoặc sang trái, vì các bước ấy biểu diễn bỏ một kí tự. Nếu hai nhánh ngang bằng, chọn một bên bất kỳ vẫn cho một đáp án tối ưu; quy tắc khác có thể tạo LCS khác cùng độ dài.

## Chi phí và những giới hạn cần đọc

Thử mọi dãy con của một xâu đã có số lượng cấp số nhân. Bảng có nm trạng thái và mỗi ô O(1) công việc, nên O(nm) thời gian, O(nm) bộ nhớ; truy vết thêm O(n+m). Nếu chỉ cần độ dài, hai hàng giảm bộ nhớ O(min(n,m)), nhưng không còn sẵn bảng để truy vết như trên.

Xâu rỗng có LCS rỗng. Kí tự lặp không làm công thức sai; nó chỉ có thể tạo nhiều đường truy vết. Với chuỗi Unicode, `string` và chỉ số trong mã xử lý byte; bài luyện dùng bảng kí tự đơn byte, không coi byte là mọi kí tự tiếng Việt.

## Luyện tập

- Lập bảng cho `ABA` và `BAA`, dựng hai LCS nếu có.
- Kiểm tra kết quả trả về là dãy con của cả hai đầu vào, không chỉ đúng độ dài.
- Nêu công thức cho đoạn xâu chung liên tiếp và chỉ ra nơi khác LCS.

## Tự kiểm tra

> **Câu hỏi 1:** LCS có bắt buộc kí tự đứng cạnh nhau trong xâu gốc không?
>
> **Trả lời:** Không. Chỉ cần giữ thứ tự; có thể bỏ các kí tự nằm giữa những kí tự được chọn.

> **Câu hỏi 2:** Khi hai nhánh bỏ kí tự có cùng giá trị, có thể chọn bất kỳ không?
>
> **Trả lời:** Có nếu chỉ cần một LCS. Mỗi nhánh giữ cùng độ dài tối ưu, nhưng có thể dựng ra nội dung đáp án khác nhau.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 2](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-2.md)
- [Viblo — Quy hoạch động, một thuật toán thần thánh](https://viblo.asia/p/quy-hoach-dong-mot-thuat-toan-than-thanh-E375zy01lGW)
