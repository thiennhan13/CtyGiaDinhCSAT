Khi các đối tượng nằm trên một hàng và chỉ được kết hợp những phần kề nhau, lời giải thường phải giữ cả hai đầu đoạn. Quy hoạch động chia đoạn xét cách một đoạn lớn được tách thành hai đoạn nhỏ. Bài gộp các đống giúp thấy rõ lựa chọn điểm chia, thứ tự theo độ dài và chi phí của ba vòng lặp.

## Tư duy

- Dùng điều kiện liền kề để xác định mọi nhóm trung gian đều là một đoạn liên tiếp.
- Xét thao tác cuối thay vì mô phỏng tất cả thứ tự gộp từ đầu.
- Tối ưu độc lập hai đoạn con rồi cộng chi phí nối chúng.
- Chọn độ dài tăng dần để mọi phụ thuộc ngắn hơn đã được tính.

## Nội dung học

- Gộp hai đống kề nhau với chi phí bằng tổng trọng lượng hai đống.
- Trạng thái `dp[l][r]`: chi phí ít nhất gộp đoạn l..r thành một đống.
- Điểm chia k, tổng đoạn bằng mảng tiền tố và cơ sở một đống.
- O(n³) thời gian, O(n²) bộ nhớ, giá trị vô cùng và miền số an toàn.

## Thử hai thứ tự gộp đã cho kết quả khác

Ba đống `[2,3,4]`:

| Thứ tự | Chi phí từng lần | Tổng |
|---|---|---:|
| Gộp 2 và 3, rồi gộp với 4 | 5, rồi 9 | 14 |
| Gộp 3 và 4, rồi gộp với 2 | 7, rồi 9 | 16 |

Chọn hai đống nhẹ nhất tùy ý không đúng mô hình: chúng có thể không kề nhau. Thử mọi thứ tự gộp tăng rất nhanh; cần tìm phần cấu trúc chung giữa các thứ tự ấy.

Trước thao tác cuối của đoạn `[l,r]`, phải có đúng hai đống. Do chỉ gộp kề nhau, chúng đại diện `[l,k]` và `[k+1,r]` với một k. Chi phí cuối luôn bằng tổng cả đoạn, không phụ thuộc k.

## Công thức từ thao tác cuối

```text
dp[l][l] = 0
dp[l][r] = nhỏ nhất trên l <= k < r của:
           dp[l][k] + dp[k+1][r] + sum(l..r)
```

Tổng đoạn lấy từ tiền tố: `prefix[r+1] - prefix[l]`. Với một điểm chia cố định, nếu cách gộp một đoạn con chưa tối ưu thì thay bằng cách tốt hơn không thay trọng lượng cuối của nó, nên làm lời giải tổng tốt hơn. Vì thế dùng kết quả tối ưu của hai đoạn con là hợp lệ. Xét mọi điểm chia bao phủ mọi thao tác cuối, nên phép min cho đáp án đúng.

## Cài đặt theo độ dài đoạn

Đầu vào có `0 <= n <= 400`, `0 <= weight[i] <= 10^9`. Tổng không quá `4·10^11`; có tối đa n−1 lần gộp, mỗi lần không vượt tổng, nên mọi đáp án dưới `1.6·10^14`. Giá trị INF bên dưới lớn hơn miền ấy và các phép cộng không tràn `long long`. n bằng 400 là giới hạn ví dụ cho thuật toán bậc ba, vẫn cần đối chiếu thời gian máy.

```cpp
#include <algorithm>
#include <vector>

long long mergeCost(const vector<long long>& weight) {
    int n = weight.size();
    if (n == 0) return 0;
    vector<long long> prefix(n + 1);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + weight[i];

    const long long INF = 1LL << 60;
    vector<vector<long long>> dp(n, vector<long long>(n));
    for (int length = 2; length <= n; length++) {
        for (int l = 0; l + length <= n; l++) {
            int r = l + length - 1;
            dp[l][r] = INF;
            long long sum = prefix[r + 1] - prefix[l];
            for (int k = l; k < r; k++) {
                dp[l][r] = min(dp[l][r], dp[l][k] + dp[k + 1][r] + sum);
            }
        }
    }
    return dp[0][n - 1];
}
```

Khi xét độ dài length, cả hai đoạn con đều ngắn hơn, nên đã có lời giải hữu hạn. Một đống không cần gộp, chi phí 0; hai đống chỉ có một điểm chia. Không cộng giá trị của đống vào cơ sở như bài tổng đường đi.

## Mỗi chiều có ý nghĩa, không chỉ là hình bảng

O(n²) đoạn, mỗi đoạn có O(n) điểm chia: O(n³) thời gian, O(n²) bộ nhớ. Các đoạn dài phụ thuộc nhiều đoạn ngắn không cùng một hàng, nên không rút đơn giản về hai hàng như LCS.

Có bài chia đoạn tối ưu theo đầu mút, có bài cắt dãy thành k phần cần thêm số phần. Không dùng công thức gộp ở đây nếu chi phí nối hoặc ràng buộc điểm chia đã đổi. Các kỹ thuật giảm O(n³) cần điều kiện riêng; không tự giả định một điểm chia tối ưu đơn điệu.

## Luyện tập

- Lập bảng mọi đoạn cho `[2,3,4]` và kiểm tra dp[0][2] bằng 14.
- Lưu k tốt nhất để dựng cây thứ tự gộp.
- Thử một đống, toàn 0 và dãy đảo; giải thích đặc tính nào thay đổi, đặc tính nào giữ nguyên.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao thao tác cuối luôn tách thành hai đoạn liên tiếp?
>
> **Trả lời:** Mỗi lần chỉ gộp các đống kề nhau, nên mọi đống trung gian là một đoạn của dãy gốc. Hai đống cuối tương ứng hai đoạn kề nhau phủ toàn đoạn đang xét.

> **Câu hỏi 2:** Vì sao thuật toán O(n³) dù bảng chỉ có O(n²) ô?
>
> **Trả lời:** Mỗi ô còn thử O(n) điểm chia. Số ô nhân công việc mỗi ô tạo O(n³).

## Nguồn tham khảo thêm

- [USACO Guide — Range DP](https://usaco.guide/gold/dp-ranges)
- [VNOI — Quy hoạch động cơ bản, phần 2](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-2.md)
