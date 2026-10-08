Đổi tiền và chia kẹo đều dùng một tổng làm trạng thái, nhưng việc dùng lại phần tử và mục tiêu cần trả lời khác nhau. Bài này đối chiếu ba câu hỏi: ít đồng xu nhất, số tổ hợp đổi tiền và chia gói kẹo sao cho hai phần gần nhau nhất.

## Tư duy

- Phân biệt tồn tại, đếm và tối ưu trước khi chọn phép chuyển.
- Xác định phần tử được dùng lại hay chỉ dùng một lần.
- Giải thích những cách nào được coi là giống nhau để tránh đếm trùng.
- Thu bài chia hai tập về một tổng không vượt nửa tổng chung.

## Nội dung học

- Đổi tiền tối thiểu, trạng thái tổng chính xác và dấu không tới được.
- Đếm tổ hợp theo vòng ngoài là loại xu, vòng trong là tổng tăng.
- Bài toán tổng tập con 0/1 và cập nhật tổng giảm.
- Độ lệch hai tập `total - 2*s`, giới hạn tổng và bộ nhớ.

## Cùng tổng 6 nhưng mục tiêu khác nhau

Xu `{1,3,4}`: tham lam lấy xu lớn nhất được `4+1+1`, trong khi `3+3` ít hơn. Gọi `best[s]` là ít xu nhất tạo **đúng** s; cơ sở `best[0]=0`, tổng khác không tới được. Mỗi xu c có thể là xu cuối, nên lấy min của `best[s-c]+1` trên những trạng thái hợp lệ.

```cpp
#include <algorithm>
#include <vector>

int minimumCoins(const vector<int>& coins, int S) {
    const int INF = S + 1;
    vector<int> best(S + 1, INF);
    best[0] = 0;
    for (int sum = 1; sum <= S; sum++) {
        for (int coin : coins) {
            if (coin <= sum && best[sum - coin] != INF) {
                best[sum] = min(best[sum], best[sum - coin] + 1);
            }
        }
    }
    return best[S] == INF ? -1 : best[S];
}
```

Mệnh giá nguyên dương, S không âm; ví dụ S không quá 10^6. Mọi phương án tối thiểu hữu hạn không cần hơn S xu vì mỗi xu ít nhất 1, nên S+1 đánh dấu chưa tới được an toàn. Bước cuối là một xu thuộc danh sách; bỏ xu cuối cho tổng nhỏ hơn, thêm lại tạo phương án hợp lệ. Lấy min trên mọi xu cuối vì thế đúng. Thời gian O(nS), bộ nhớ O(S), n là số mệnh giá. Không tạo được đúng S thì trả −1.

Đếm tổ hợp tổng 6 lại có bốn kết quả: sáu xu 1; ba xu 1 và một xu 3; hai xu 3; hai xu 1 và một xu 4. Đổi vị trí các xu không tạo kết quả mới. Vòng ngoài theo loại đảm bảo mỗi tổ hợp được xây theo một thứ tự loại cố định:

```text
ways[0] = 1; các tổng khác = 0
Với từng mệnh giá c khác nhau:
    Với s từ c tới S:
        ways[s] += ways[s-c]
```

Đổi thành vòng ngoài theo tổng rồi thử mọi xu có thể đếm chuỗi: `1+3` và `3+1` khác nhau. Không có một thứ tự vòng lặp đúng cho mọi yêu cầu.

[Bài giảng Coin change của Errichto](https://www.youtube.com/watch?v=1mtvm2ubHCY) giúp đối chiếu thêm bài tối ưu và bài đếm; khi xem, hãy chú ý định nghĩa một cách chọn để nhận ra trường hợp đếm trùng.

## Gói kẹo không được dùng lại

Các gói `[2,3,7]` có tổng 12. Để hai bên lệch ít, tìm tổng s lớn nhất tạo được nhưng không vượt 6. Ta có:

| Đã xét | Tổng tới được ≤6 |
|---|---|
| Chưa có | 0 |
| 2 | 0, 2 |
| 2 và 3 | 0, 2, 3, 5 |
| 2, 3 và 7 | 0, 2, 3, 5 |

Chọn s bằng 5 cho hai bên 5 và 7, lệch 2. Mã nhận số kẹo nguyên không âm, mỗi gói chia nguyên vẹn; ví dụ `n <= 200`, `a[i] <= 1000` nên tổng vừa int và mảng khả thi.

```cpp
#include <numeric>
#include <vector>

int partitionDifference(const vector<int>& a) {
    int total = accumulate(a.begin(), a.end(), 0);
    int half = total / 2;
    vector<bool> possible(half + 1);
    possible[0] = true;

    for (int x : a) {
        for (int s = half; s >= x; s--) {
            possible[s] = possible[s] || possible[s - x];
        }
    }

    for (int s = half; s >= 0; s--) {
        if (possible[s]) return total - 2 * s;
    }
    return total;
}
```

Sau mỗi lượt, `possible[s]` cho biết có tập từ các gói đã xét đạt s hay không. Bỏ gói giữ giá trị cũ; lấy gói dùng s−x của lượt trước. Duyệt giảm tránh dùng gói hiện tại hai lần. Gói 0 không tạo tổng mới, tập rỗng trả độ lệch 0.

## Vì sao chỉ tìm tới nửa tổng?

Nếu một tập lớn hơn nửa, tập bù nhỏ hơn nửa và có cùng độ lệch. Trong miền `s <= total/2`, độ lệch `total−2s` giảm khi s tăng. Vì vậy tổng tới được lớn nhất trong miền ấy là tối ưu.

Với H là nửa tổng, thời gian O(nH), bộ nhớ O(H). Đây là chi phí theo giá trị tổng, không theo số chữ số của tổng. Bài đếm đổi tiền còn cần miền số hoặc modulo vì số cách có thể rất lớn; không dùng modulo cho giá trị cần so min/max.

## Luyện tập

- So sánh tổ hợp và chuỗi với xu `{1,2}`, tổng 3.
- Thử một gói, các gói bằng nhau và tổng lẻ.
- Lưu lựa chọn để trả về hai tập thực tế, không chỉ độ lệch.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao chia gói kẹo duyệt tổng giảm?
>
> **Trả lời:** Mỗi gói chỉ được chọn một lần. Tổng s−x được đọc phải chưa chứa gói đang xét, điều được giữ nhờ duyệt giảm.

> **Câu hỏi 2:** Vì sao vòng ngoài theo loại xu tránh đếm hoán vị của cùng tổ hợp?
>
> **Trả lời:** Tổ hợp được xây theo thứ tự loại cố định; đổi thứ tự lấy các xu không tạo một quá trình xây mới trong vòng lặp đó.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
- [USACO Guide — Knapsack DP](https://usaco.guide/gold/knapsack)
- [Viblo — Quy hoạch động, một thuật toán thần thánh](https://viblo.asia/p/quy-hoach-dong-mot-thuat-toan-than-thanh-E375zy01lGW)
- [Errichto — Coin change, double counting](https://www.youtube.com/watch?v=1mtvm2ubHCY)
