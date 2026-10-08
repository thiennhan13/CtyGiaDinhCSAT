N quân hậu là bài toán đặt n quân hậu lên bàn cờ n × n sao cho không có hai quân nào cùng hàng, cột hoặc đường chéo. Khó khăn không nằm ở thao tác di chuyển quân cờ, mà ở cách biểu diễn những vị trí đã bị chiếm và bỏ sớm một lựa chọn không thể dẫn tới lời giải.

## Tư duy

- Dùng ràng buộc của bài toán để giảm số quyết định: mỗi hàng đặt đúng một quân.
- Chuyển điều kiện hình học trên đường chéo thành quan hệ giữa chỉ số hàng và cột.
- Kiểm tra xung đột ngay khi đặt quân, không chờ dựng đủ bàn cờ.
- Khôi phục mọi dấu đã đặt sau mỗi nhánh để không ảnh hưởng lựa chọn kế tiếp.

## Nội dung học

- Biểu diễn bàn cờ bằng dãy cột của từng hàng.
- Mảng đánh dấu cột, đường chéo có tổng chỉ số và đường chéo có hiệu chỉ số.
- Quay lui theo hàng và cắt các tiền tố vi phạm ràng buộc.
- Đếm nghiệm, ghi một nghiệm, phân biệt nghiệm đối xứng và giới hạn vét cạn.

## Không cần chọn n ô từ cả bàn cờ

Nếu chọn n vị trí bất kỳ trong n² ô rồi kiểm tra, phần lớn cấu hình đã sai ngay ở điều kiện cùng hàng. Mỗi nghiệm phải có đúng một quân trên mỗi hàng, nên ta chỉ cần quyết định cột cho hàng 0, rồi hàng 1,...

Với n bằng 4, một nghiệm có dãy cột `[1, 3, 0, 2]` theo chỉ số từ 0:

| Hàng / cột | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| 0 | · | H | · | · |
| 1 | · | · | · | H |
| 2 | H | · | · | · |
| 3 | · | · | H | · |

Hai ô `(r, c)` và `(u, v)` cùng đường chéo khi `r - c = u - v` hoặc `r + c = u + v`. Thêm `n - 1` vào hiệu để chỉ số không âm; mỗi mảng đường chéo cần `2n - 1` ô.

## Thử một cột hợp lệ rồi đi tiếp

Hàm đếm dưới đây dùng `1 <= n <= 12` để phù hợp bài luyện cơ bản; đây là giới hạn thực hành, không phải lời hứa thời gian cho mọi máy. Mỗi cột và đường chéo được đánh dấu theo các quân của những hàng trước.

```cpp
#include <functional>
#include <vector>

long long countQueens(int n) {
    vector<bool> column(n), down(2 * n - 1), up(2 * n - 1);
    long long answer = 0;

    function<void(int)> place = [&](int row) {
        if (row == n) {
            answer++;
            return;
        }

        for (int col = 0; col < n; col++) {
            int d = row - col + n - 1;
            int u = row + col;
            if (column[col] || down[d] || up[u]) continue;

            column[col] = down[d] = up[u] = true;
            place(row + 1);
            column[col] = down[d] = up[u] = false;
        }
    };

    place(0);
    return answer;
}
```

Sau khi đặt quân, lời gọi tiếp theo chỉ thử các ô không xung đột. Khi quay về, cả ba dấu phải được bỏ. Việc bỏ dấu là an toàn vì trước khi đặt quân, cả ba ô đánh dấu đều false; không có dấu của quân khác bị xóa nhầm.

## Cắt nhánh có bỏ mất nghiệm không?

Một tiền tố đã có hai hậu ăn nhau không thể được sửa bằng cách thêm hậu mới. Vì vậy bỏ tiền tố ấy không loại nghiệm hợp lệ nào. Ngược lại, mọi nghiệm hợp lệ có một cột xác định ở mỗi hàng, và thuật toán sẽ thử đúng dãy cột đó. Một nghiệm được tính đúng một lần vì thứ tự hàng cố định.

Các phép kiểm tra chỉ mất O(1), nhưng số nhánh vẫn lớn. Có nhiều nhất n! cách gán các cột phân biệt cho n hàng. Cài đặt còn quét n cột ở mỗi nút, nên một cận trên thô an toàn là O(n·n!); cắt đường chéo thường giảm nhiều số nút thực tế. Bộ nhớ phụ O(n), kể cả ngăn xếp.

Mã đếm mọi vị trí, không gộp phép quay hoặc phản chiếu của bàn cờ. Chẳng hạn n bằng 4 có hai nghiệm; muốn chỉ tính các lớp đối xứng phải định nghĩa và xử lý riêng.

## Luyện tập

- Đếm nghiệm với n từ 1 đến 4; kiểm tra n bằng 2 và 3 không có nghiệm.
- Lưu dãy cột để in nghiệm đầu tiên, rồi giải thích nơi cần dừng việc tìm kiếm.
- Thêm ô cấm và kiểm tra ô cấm trước khi đặt; giữ nguyên lập luận đầy đủ của thuật toán.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao có thể cắt ngay một nhánh có xung đột đường chéo?
>
> **Trả lời:** Thêm các quân ở hàng sau không loại bỏ xung đột đã tồn tại giữa hai quân trước. Không có nghiệm hợp lệ nào mở rộng từ tiền tố đó.

> **Câu hỏi 2:** Mảng đường chéo theo hiệu cần dịch chỉ số như thế nào?
>
> **Trả lời:** Với chỉ số từ 0, hiệu nằm từ −(n−1) đến n−1. Cộng n−1 tạo miền 0..2n−2, cần 2n−1 ô.

## Nguồn tham khảo thêm

- [VNOI — Đệ quy và thuật toán quay lui](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md)
- [USACO Guide — Basic Complete Search](https://usaco.guide/bronze/intro-complete)
