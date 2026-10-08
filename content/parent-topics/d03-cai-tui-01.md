Một giới hạn về sức chứa khiến ta không thể chọn mọi vật có giá trị. Bài toán cái túi 0/1 yêu cầu tìm nhóm vật có tổng giá trị lớn nhất, trong đó mỗi vật chỉ được chọn một lần và tổng trọng lượng không vượt sức chứa. Điều cần học không phải một công thức đứng riêng, mà là cách mô tả quyết định “chọn hoặc bỏ” bằng các bài toán con có ý nghĩa rõ ràng.

## Tư duy

- Phân biệt giới hạn của bài toán với mục tiêu cần tối ưu: trọng lượng là ràng buộc, giá trị là kết quả muốn lớn nhất.
- Xét đủ hai khả năng cho một vật: bỏ vật đó, hoặc chọn rồi dùng lời giải của phần còn lại.
- Định nghĩa trạng thái theo những vật đã được phép xét và sức chứa còn cho phép, để không vô tình chọn một vật nhiều lần.
- Giải thích vì sao hai phương án bao phủ mọi lựa chọn hợp lệ; khi rút gọn bộ nhớ, giữ nguyên ý nghĩa đó bằng thứ tự cập nhật.

## Nội dung học

- Mô hình 0/1: mỗi vật có trọng lượng nguyên dương và giá trị không âm; chọn một tập con dưới giới hạn sức chứa.
- Trạng thái `f[i][cap]`: giá trị tốt nhất từ `i` vật đầu, với tổng trọng lượng không vượt `cap`.
- Hai nhánh chuyển trạng thái: bỏ vật `i`, hoặc lấy vật `i` và chuyển về hàng `i - 1` với sức chứa giảm.
- Cơ sở bằng 0 khi chưa xét vật hoặc sức chứa bằng 0; phân biệt “không vượt” với “bằng đúng” sức chứa.
- Rút gọn còn mảng một chiều và duyệt sức chứa từ lớn xuống nhỏ; phân tích `O(nW)` thời gian, `O(W)` bộ nhớ phụ.

## Không thể chọn chỉ dựa vào một vật

Giả sử túi có sức chứa 6 và có ba vật:

| Vật | Trọng lượng | Giá trị |
|---|---:|---:|
| A | 2 | 4 |
| B | 3 | 5 |
| C | 4 | 7 |

Chọn C là chọn vật có giá trị riêng lớn nhất, nhưng ta vẫn có thể thêm A. Nhóm A + C có trọng lượng 6, giá trị 11, tốt hơn chọn riêng C. A + B có giá trị 9; B + C vượt sức chứa; cả ba cũng vượt sức chứa.

Một quy tắc chọn theo tỉ lệ giá trị/trọng lượng không đủ bảo đảm đúng cho bài toán 0/1. Ví dụ khác có sức chứa 6, một vật `(4, 5)` và hai vật riêng biệt cùng `(3, 3)`: vật đầu có tỉ lệ cao hơn, nhưng chọn hai vật sau đạt giá trị 6, cao hơn 5. Ta cần cách xét quyết định có hệ thống, thay vì chọn theo một đặc điểm cục bộ rồi bỏ qua các kết hợp khác.

## Định nghĩa trạng thái trước khi viết công thức

Gọi `f[i][cap]` là giá trị lớn nhất có thể đạt được khi chỉ xét `i` vật đầu tiên và cho phép tổng trọng lượng **không vượt** `cap`.

Với vật thứ `i` có trọng lượng `w[i]` và giá trị `v[i]`, một phương án hợp lệ chỉ có hai trường hợp:

1. **Không chọn vật `i`:** dùng kết quả tốt nhất từ `i - 1` vật đầu với cùng sức chứa, tức `f[i - 1][cap]`.
2. **Chọn vật `i`:** nếu `w[i] <= cap`, phần đã chọn trước đó chỉ được dùng `i - 1` vật đầu và không vượt `cap - w[i]`; giá trị là `f[i - 1][cap - w[i]] + v[i]`.

Chọn giá trị lớn hơn giữa hai trường hợp. Nếu vật không vừa túi, chỉ còn nhánh bỏ:

```text
f[i][cap] = f[i - 1][cap]                              nếu cap < w[i]
f[i][cap] = max(f[i - 1][cap],
                f[i - 1][cap - w[i]] + v[i])           nếu cap >= w[i]
```

Điểm quyết định là **cả hai nhánh đều đọc từ hàng `i - 1`**. Nhánh lấy không được đọc từ hàng `i`, vì hàng đó có thể đã sử dụng chính vật đang xét.

## Theo dõi bảng phương án

Với ba vật của ví dụ đầu, bảng có các cột sức chứa từ 0 đến 6:

| Các vật đã xét / Sức chứa | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Chưa có vật | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| A | 0 | 0 | 4 | 4 | 4 | 4 | 4 |
| A, B | 0 | 0 | 4 | 5 | 5 | 9 | 9 |
| A, B, C | 0 | 0 | 4 | 5 | 7 | 9 | 11 |

Ở ô cuối, nhánh bỏ C cho giá trị 9. Nhánh lấy C còn sức chứa 2, nên có thể kết hợp với giá trị 4 của A; tổng là `4 + 7 = 11`. Không phải mọi ô đều sử dụng hết sức chứa: với chỉ A và sức chứa 3, kết quả 4 dùng trọng lượng 2, vẫn là phương án hợp lệ.

Có thể xem thêm [Abdul Bari — 0/1 Knapsack Problem](https://www.youtube.com/watch?v=zRza99HPvkQ) để theo dõi cách cập nhật bảng; hãy đối chiếu từng ô với hai nhánh lấy và bỏ ở ví dụ trên.

### Vì sao lời giải đúng?

Không có vật nào thì chỉ có phương án rỗng, giá trị 0. Giả sử các trạng thái của `i - 1` vật đầu đã đúng. Mọi tập vật hợp lệ trong `i` vật đầu hoặc chứa vật `i`, hoặc không chứa nó; hai nhánh trên xét kết quả tốt nhất trong từng nhóm. Lấy giá trị lớn nhất giữa hai nhóm vì thế cho kết quả tốt nhất của trạng thái hiện tại.

Trạng thái cần tìm là `f[n][W]`: đã xét đủ `n` vật và dùng giới hạn sức chứa `W` của bài toán.

## Rút gọn bộ nhớ: thứ tự duyệt là một phần của thuật toán

Ta có thể chỉ giữ `dp[cap]` thay cho cả bảng. Với mỗi vật, duyệt sức chứa từ `W` xuống `w[i]`. Khi cập nhật `dp[cap]`, vị trí `cap - w[i]` nhỏ hơn cap và chưa bị cập nhật bởi vật hiện tại, nên vẫn thuộc kết quả của các vật trước.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int W = 6;
vector<int> w = {2, 3, 4};
vector<long long> v = {4, 5, 7};
vector<long long> dp(W + 1, 0);
for (int i = 0; i < w.size(); ++i) {
    for (int cap = W; cap >= w[i]; --cap) {
        dp[cap] = max(dp[cap], dp[cap - w[i]] + v[i]);
    }
}
cout << dp[W] << '\n';
```

Đoạn C++ dùng `<vector>`, `<algorithm>` và `<iostream>`, in ra 11. Hai dãy trọng lượng/giá trị có cùng số phần tử; mọi trọng lượng dương, `W` không âm và các phép cộng nằm trong giới hạn `long long`.

Nếu duyệt sức chứa tăng dần với vật A, `dp[2]` trở thành 4 rồi `dp[4]` có thể lấy chính kết quả ấy để thành 8. Khi đó A đã được lấy hai lần, trái với mô hình 0/1. Vì vậy, đổi hướng duyệt không phải thay đổi hình thức viết mã; nó có thể đổi hẳn bài toán đang giải.

## Chi phí và những trường hợp cần kiểm tra

Có tối đa `n × W` lượt cập nhật, thời gian `O(nW)` và bộ nhớ phụ `O(W)`. Cách này phù hợp khi tích ấy nằm trong giới hạn tính toán của đề. `W` rất lớn có thể khiến lời giải không khả thi dù số vật nhỏ; ký hiệu độ phức tạp phải được đối chiếu với dữ liệu cụ thể.

Khởi tạo mọi `dp[cap] = 0` phù hợp với yêu cầu **không vượt sức chứa**, vì tập rỗng luôn hợp lệ. Nếu yêu cầu dùng đúng trọng lượng `W`, những sức chứa chưa thể đạt không được xem là có giá trị 0; cần định nghĩa và khởi tạo khác. Bài này không sử dụng mô hình “đúng bằng”.

Nên thử `W = 0`, không có vật, mọi vật quá nặng, một vật vừa đủ sức chứa và một vật nhẹ có giá trị lớn. Hai vật có cùng thông số vẫn là hai vật riêng biệt, mỗi vật được chọn tối đa một lần. Trọng lượng 0 nằm ngoài giả thiết của bài và không nên tự đưa vào mà bỏ qua tác động đến công thức.

## Thực hành

- Chỉ có một vật trọng lượng 2, giá trị 4 và sức chứa 6: đáp án 0/1 là 4, không phải 12. Dùng trường hợp này để kiểm tra hướng duyệt.
- Với ba vật A, B, C, đổi sức chứa thành 5; đáp án là 9. Giải thích quyết định tại ô tương ứng của bảng.
- Đặt sức chứa bằng 4: chọn C cho giá trị 7, tốt hơn chọn A hoặc B riêng lẻ. Viết hai nhánh dẫn đến kết quả đó.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao duyệt sức chứa giảm trong mô hình 0/1?
>
> **Trả lời:** Để ô sức chứa nhỏ được đọc vẫn thuộc các vật trước; vật đang xét không bị dùng lại trong cùng lượt.

> **Câu hỏi 2:** Khởi tạo mọi ô bằng 0 có phù hợp khi phải đạt đúng trọng lượng không?
>
> **Trả lời:** Không. Chỉ tổng 0 có phương án ban đầu; những tổng chưa tạo được phải được đánh dấu không tới được.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
- [USACO Guide — Knapsack DP](https://usaco.guide/gold/knapsack)
- [Viblo — Top-down và Bottom-up](https://viblo.asia/p/quy-hoach-dong-76-top-down-va-bottom-up-gwd43g0j4X9)
- [Abdul Bari — 0/1 Knapsack Problem](https://www.youtube.com/watch?v=zRza99HPvkQ)
