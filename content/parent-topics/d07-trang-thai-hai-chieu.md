Một tổng chưa đủ mô tả bài toán khi đề còn yêu cầu lấy đúng một số lượng phần tử. Ta phải giữ thêm thông tin về số phần tử đã chọn. Bài này mở rộng bài toán tổng tập con để luyện cách đặt từng chiều của trạng thái, chọn thứ tự cập nhật và dự báo kích thước bảng trước khi cài đặt.

## Tư duy

- Tìm thông tin mà một trạng thái cũ còn thiếu khi yêu cầu đề thay đổi.
- Đặt ý nghĩa độc lập cho từng chiều, tránh thêm chiều chỉ vì thấy nhiều tham số đầu vào.
- Xác định trạng thái nào cùng thuộc lượt trước khi rút gọn số chiều.
- Đếm tích kích thước và chi phí chuyển để chọn giới hạn phù hợp.

## Nội dung học

- Chọn đúng k phần tử từ n phần tử không âm để đạt tổng S.
- Trạng thái ba thông tin số đã xét, số đã chọn, tổng; rút phần đã xét vào vòng lặp.
- Mảng `possible[count][sum]`, cơ sở chọn 0 phần tử đạt tổng 0.
- Duyệt count và sum giảm để giữ mỗi phần tử dùng một lần.

## Cùng tổng nhưng số lượng khác

Cho `[2,3,5]`. Tổng 5 tạo được bằng một phần tử 5 hoặc bằng hai phần tử 2 và 3. Một mảng theo tổng trả lời “có” nhưng không phân biệt được yêu cầu đúng một hay đúng hai phần tử.

Với yêu cầu k bằng 2, S bằng 7, bảng sau khi xét hết:

| Số chọn / tổng | 0 | 2 | 3 | 5 | 7 |
|---|---|---|---|---|---|
| 0 | Có | Không | Không | Không | Không |
| 1 | Không | Có | Có | Có | Không |
| 2 | Không | Không | Không | Có | Có |

Các cột khác cũng tồn tại trong bảng đầy đủ; bảng rút gọn trên chỉ để thấy sự khác nhau giữa hai chiều. Phương án `2+5` đạt đúng số lượng và tổng yêu cầu.

## Viết chuyển đầy đủ rồi rút gọn

Gọi `f[i][c][s]` là có thể chọn c phần tử trong i phần tử đầu để đạt tổng s. Bỏ phần tử i giữ `f[i-1][c][s]`. Lấy x là giá trị phần tử i, đọc `f[i-1][c-1][s-x]` nếu c≥1 và s≥x. Phép hoặc kết hợp hai khả năng, vì chỉ cần biết tồn tại.

Chỉ cần hàng i−1 nên đưa i vào vòng ngoài, giữ hai chiều c và s. Mã dưới có `0 <= k <= n`, giá trị phần tử không âm; ví dụ `n <= 100`, `k <= 30`, `0 <= S <= 2000`.

```cpp
#include <vector>

bool exactCountSum(const vector<int>& a, int k, int S) {
    vector<vector<bool>> possible(k + 1, vector<bool>(S + 1));
    possible[0][0] = true;

    for (int x : a) {
        for (int count = k; count >= 1; count--) {
            for (int sum = S; sum >= x; sum--) {
                possible[count][sum] = possible[count][sum]
                    || possible[count - 1][sum - x];
            }
        }
    }
    return possible[k][S];
}
```

Duyệt count giảm là điểm quyết định: hàng count−1 chưa được phần tử hiện tại cập nhật. Vì vậy kể cả x bằng 0, một phần tử cũng không được dùng nhiều lần. Duyệt sum giảm giúp giữ quy tắc nhất quán với bài toán tổng tập con; không dùng sum tăng để thay count giảm khi có phần tử 0.

## Kiểm tra một trường hợp nhỏ để hiểu cơ sở

`k=0,S=0` đúng bằng tập rỗng; `k=0,S>0` sai. `k>0,S=0` có thể đúng nếu đủ phần tử bằng 0, nên không trả false ngay chỉ vì tổng bằng 0. Các vị trí bằng giá trị nhau vẫn là những phần tử riêng: hai số 3 ở hai vị trí có thể cùng được chọn nếu đề cho phép.

Theo quy nạp số phần tử xét, mọi tập hợp hợp lệ hoặc chứa phần tử mới hoặc không chứa; công thức bao phủ cả hai và chỉ đọc các tập hợp từ lượt trước. Điều này chứng minh không chọn lặp và không bỏ thiếu tập.

## Chi phí và hướng mở rộng

O(nkS) thời gian, O(kS) bộ nhớ, chưa gồm lưu truy vết. Không cho rằng thêm một chiều chỉ tăng chi phí một chút: k,S lớn làm tích tăng rất nhanh. Nếu cần đếm, thay kiểu boolean và phép hoặc bằng quy tắc đếm có kiểm soát tràn; nếu cần tổng giá trị tốt nhất, ý nghĩa trạng thái và cơ sở phải đổi.

- So sánh với liệt kê mọi tập con khi n nhỏ.
- Thử `[0,0,5]`, k bằng 2, S bằng 0 để kiểm tra count giảm.
- Bổ sung tiền nhiệm theo lượt i nếu cần in các chỉ số được chọn.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao một mảng chỉ theo tổng không giải đủ yêu cầu đúng k phần tử?
>
> **Trả lời:** Nó gộp những tập cùng tổng nhưng khác số lượng, trong khi số lượng quyết định tính hợp lệ của đáp án.

> **Câu hỏi 2:** Khi phần tử bằng 0, hướng duyệt nào vẫn giữ nó chỉ được dùng một lần?
>
> **Trả lời:** Count giảm giữ hàng count−1 ở lượt trước. Chỉ dựa vào sum giảm không đủ khi sum−0 vẫn là cùng tổng.

## Nguồn tham khảo thêm

- [USACO Guide — Knapsack DP](https://usaco.guide/gold/knapsack)
- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
