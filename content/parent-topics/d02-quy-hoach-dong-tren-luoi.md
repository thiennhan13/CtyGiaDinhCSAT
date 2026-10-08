Khi chỉ đi sang phải hoặc xuống dưới trên một lưới, ô hiện tại nhận thông tin từ bên trái và phía trên. Ta có thể dùng kết quả ấy thay vì thử lại mọi đường. Bài học đặt cạnh nhau bài đếm đường và bài tìm tổng lớn nhất: cùng một hình lưới nhưng ý nghĩa trạng thái và cách khởi tạo khác nhau.

## Tư duy

- Mô tả trạng thái bằng điểm đến và những bước được phép thực hiện.
- Xét bước cuối để xác định tiền nhiệm, thay vì liệt kê toàn bộ hành trình.
- Tách không tới được khỏi tới được nhưng có giá trị âm.
- Chọn thứ tự duyệt phù hợp hướng phụ thuộc và điều kiện ô cấm.

## Nội dung học

- Đếm đường từ góc trên trái tới góc dưới phải bằng bước phải hoặc xuống.
- Ô cấm, hàng đầu, cột đầu và trạng thái xuất phát.
- Tổng lớn nhất trên đường khi giá trị ô có thể âm.
- Hai tiền nhiệm, O(nm) thời gian và rút bộ nhớ theo hàng.

## Bước cuối chia các đường thành hai nhóm

Tới `(r,c)`, bước cuối từ `(r−1,c)` hoặc `(r,c−1)`. Hai nhóm khác ô ngay trước đích nên cộng được mà không trùng. Lưới 3 × 3 không cấm có bảng số đường:

| r / c | 0 | 1 | 2 |
|---|---:|---:|---:|
| 0 | 1 | 1 | 1 |
| 1 | 1 | 2 | 3 |
| 2 | 1 | 3 | 6 |

Nếu ô giữa bị cấm, số đường tại đó bằng 0 và ô cuối chỉ còn 2 đường. Giá trị 0 ở đây thực sự mang nghĩa không có đường.

## Bài đếm có ô cấm

`blocked` là bảng chữ nhật không rỗng; true nghĩa là ô cấm. Bài minh họa yêu cầu đáp án modulo `1000000007`.

```cpp
#include <vector>

long long paths(const vector<vector<bool>>& blocked) {
    int n = blocked.size(), m = blocked[0].size();
    const long long MOD = 1000000007;
    vector<vector<long long>> dp(n, vector<long long>(m));

    for (int r = 0; r < n; r++) {
        for (int c = 0; c < m; c++) {
            if (blocked[r][c]) continue;
            if (r == 0 && c == 0) dp[r][c] = 1;
            else {
                if (r > 0) dp[r][c] += dp[r - 1][c];
                if (c > 0) dp[r][c] += dp[r][c - 1];
                dp[r][c] %= MOD;
            }
        }
    }
    return dp[n - 1][m - 1];
}
```

Xuất phát bị cấm cho kết quả 0. Lưới một ô không cấm có một đường: đứng sẵn tại đích. Đừng thêm một bước đi không tồn tại vào cơ sở.

## Tổng lớn nhất không dùng cơ sở của bài đếm

Với `[[2,-3,4],[1,5,-2]]`, bảng tổng tốt nhất là:

| r / c | 0 | 1 | 2 |
|---|---:|---:|---:|
| 0 | 2 | −1 | 3 |
| 1 | 3 | 8 | 6 |

Đường tốt nhất tới đích `2 → 1 → 5 → −2` đạt 6. `best[r][c]` bằng giá trị ô cộng max của các tiền nhiệm **tới được**. Nếu ô không tới được, dùng cờ riêng hoặc âm vô cùng có miền rõ. Không khởi tạo 0 rồi để nó thắng các tổng âm thật.

Có thể chọn `NEG = -(1LL << 60)` khi đã chứng minh trị tuyệt đối mọi tổng đường dưới `10^15`. Chỉ cộng từ tiền nhiệm khác NEG; nếu không có tiền nhiệm hợp lệ thì ô vẫn không tới được. Bài tối ưu không lấy modulo tổng: modulo thay đổi thứ tự lớn nhỏ.

## Thứ tự duyệt và chi phí

Duyệt hàng từ trên xuống, cột từ trái sang phải: hai tiền nhiệm đều đã tính. Mỗi bước tăng hàng hoặc cột nên không có vòng phụ thuộc. Quy nạp theo `r+c` cho thấy mỗi ô nhận đủ các đường hoặc ứng viên tối ưu.

nm trạng thái, tối đa hai chuyển mỗi trạng thái: O(nm) thời gian, O(nm) bảng. Nếu chỉ cần đáp án, dùng m ô và cập nhật trái sang phải: trước cập nhật ô đó còn là hàng trên, ô bên trái đã là hàng hiện tại. Bộ nhớ O(m). Muốn truy vết đường cần giữ lựa chọn hoặc tính lại có chủ đích.

## Luyện tập

- Chặn cả một hàng, kiểm tra đích không tới được.
- So sánh bảng đếm và bảng tổng tốt nhất trên cùng lưới.
- Thêm bước chéo xuống phải, viết lại nhóm bước cuối và chi phí.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao cộng hai nhóm đường không đếm trùng?
>
> **Trả lời:** Một đường chỉ có một bước cuối: hoặc từ trên xuống hoặc từ trái sang, không thể thuộc cả hai nhóm.

> **Câu hỏi 2:** Vì sao gán 0 cho ô không tới được có thể làm sai tổng lớn nhất?
>
> **Trả lời:** Tổng hợp lệ có thể âm. Số 0 giả sẽ được chọn thay đường thật, tạo một phương án không tồn tại.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to DP](https://usaco.guide/gold/intro-dp)
- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
