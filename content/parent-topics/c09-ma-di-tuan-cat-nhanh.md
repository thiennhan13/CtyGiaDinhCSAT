Mã đi tuần yêu cầu một quân mã đi qua mỗi ô của bàn cờ đúng một lần. Nếu chỉ thử một đường rồi đi theo nó, ta có thể mắc ở một ô chưa hoàn thành hành trình. Quay lui cho phép rút lại lựa chọn; các điều kiện hợp lệ và thứ tự thử giúp việc tìm kiếm có tổ chức hơn.

## Tư duy

- Biểu diễn một bước đi bằng độ thay đổi hàng và cột, thay vì viết tám nhánh riêng.
- Xem phần đường đi đã xây là trạng thái cần giữ nguyên khi gọi tiếp.
- Phân biệt điều kiện chắc chắn loại được nhánh với một quy tắc chỉ giúp thử nhánh có triển vọng trước.
- Nêu rõ mục tiêu tìm một hành trình hay đếm mọi hành trình để chọn cách dừng đúng.

## Nội dung học

- Tám độ lệch hợp lệ của quân mã và kiểm tra biên bàn cờ.
- Mảng `visited`, danh sách đường đi và phép hoàn tác sau nhánh thất bại.
- Quay lui tìm một hành trình mở; hành trình đóng có thêm điều kiện nối về ô đầu.
- Cắt nhánh an toàn, heuristic Warnsdorff và độ phức tạp cấp số nhân.

## Từ một bước đi tới toàn bộ hành trình

Từ `(2, 2)`, một mã có thể tới `(0, 1)`, `(0, 3)`, `(1, 0)`, `(1, 4)`, `(3, 0)`, `(3, 4)`, `(4, 1)`, `(4, 3)` nếu các ô nằm trong bàn. Trên bàn 3 × 3, nhiều vị trí ấy nằm ngoài biên; ô giữa thậm chí không có bước đi hợp lệ.

| Kiểm tra một ứng viên | Quyết định |
|---|---|
| Hàng hoặc cột ngoài bàn | Không thử |
| Ô đã có trong đường đi | Không thử |
| Ô chưa đi, nằm trong bàn | Đánh dấu và gọi tiếp |
| Đã đi đủ mọi ô | Ghi nhận hành trình |

Hai kiểm tra đầu loại lựa chọn không hợp lệ, không phải một dự đoán về khả năng thành công.

## Cốt lõi của quá trình tìm kiếm

Ví dụ dưới dùng bảng `n × m` với n,m dương và số ô N không quá 64; `seen` cùng kích thước và `path` lưu tọa độ. Đó là miền để biểu diễn an toàn, không bảo đảm vét cạn sẽ chạy nhanh; khi luyện trực tiếp, bắt đầu từ bàn rất nhỏ. Hàm được gọi sau khi ô đầu đã được đánh dấu và đưa vào path. `count` là số ô đã đi, khởi đầu bằng 1. Đây là tìm **một hành trình mở**, không bắt buộc bước cuối quay về ô đầu.

```cpp
#include <utility>
#include <vector>

int dr[] = {-2, -2, -1, -1, 1, 1, 2, 2};
int dc[] = {-1, 1, -2, 2, -2, 2, -1, 1};

bool tour(int r, int c, int count, int n, int m,
          vector<vector<bool>>& seen, vector<pair<int, int>>& path) {
    if (count == n * m) return true;

    for (int k = 0; k < 8; k++) {
        int nr = r + dr[k], nc = c + dc[k];
        if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
        if (seen[nr][nc]) continue;

        seen[nr][nc] = true;
        path.push_back({nr, nc});
        if (tour(nr, nc, count + 1, n, m, seen, path)) return true;
        path.pop_back();
        seen[nr][nc] = false;
    }

    return false;
}
```

Khi một nhánh thành công, hàm trả về ngay và giữ đường đi để sử dụng. Chỉ nhánh thất bại mới hoàn tác. Nếu đổi yêu cầu thành đếm mọi hành trình, phải tiếp tục thử các nhánh và hoàn tác cả sau khi ghi nhận kết quả.

## Làm sao thử ít nhánh hơn mà vẫn hiểu giới hạn?

Có thể ưu tiên ô có ít bước tiếp theo chưa đi nhất, gọi là heuristic Warnsdorff. Quy tắc này giúp tránh bỏ lại một ô khó vào, nhưng **không phải chứng minh rằng lựa chọn đầu luôn đúng**. Muốn tìm kiếm đầy đủ, vẫn phải quay lại thử ứng viên khác khi thất bại.

Một cắt nhánh an toàn là: nếu những ô chưa đi không thể được nối tới nhau và tới vị trí hiện tại bằng các bước mã hợp lệ, không thể còn một đường đi qua tất cả. Kiểm tra kết nối tốn thêm công việc, nên chỉ dùng sau khi hiểu lợi ích trên dữ liệu. Không được cắt chỉ vì một ô “có vẻ xa”.

Gọi N là số ô. Mỗi nút thử tối đa tám bước và độ sâu tối đa N; cận trên thô O(8^N) cho thấy không có bảo đảm chạy nhanh trên mọi bàn cờ. Bộ nhớ O(N) cho đánh dấu, đường đi và ngăn xếp. Đặt giới hạn bài luyện nhỏ, tránh tuyên bố cách thử trực tiếp giải được mọi bàn 8 × 8.

## Luyện tập

- Liệt kê bước hợp lệ từ một góc và từ tâm bàn nhỏ.
- Kiểm tra đường đi được trả về: không lặp ô, đủ số ô và mỗi cặp liên tiếp là một bước mã.
- So sánh số nút đã thử trước và sau khi đổi thứ tự ứng viên; không suy từ một ví dụ ra bảo đảm tổng quát.

## Tự kiểm tra

> **Câu hỏi 1:** Ưu tiên ô ít bước tiếp có thay thế quay lui không?
>
> **Trả lời:** Không. Đó là thứ tự thử có ích trong nhiều trường hợp; muốn bảo đảm tìm đủ khả năng, vẫn phải quay lui khi nhánh được ưu tiên thất bại.

> **Câu hỏi 2:** Hành trình mở khác hành trình đóng ở điều kiện nào?
>
> **Trả lời:** Hành trình mở chỉ cần đi đủ các ô đúng một lần. Hành trình đóng còn cần ô cuối nối được về ô đầu bằng một bước mã.

## Nguồn tham khảo thêm

- [VNOI — Đệ quy và thuật toán quay lui](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md)
- [USACO Guide — Basic Complete Search](https://usaco.guide/bronze/intro-complete)
