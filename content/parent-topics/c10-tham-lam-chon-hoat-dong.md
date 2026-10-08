Một lựa chọn tốt ngay lúc này chưa chắc tạo lời giải tốt nhất. Thuật toán tham lam chỉ đáng tin khi ta chứng minh được lựa chọn cục bộ không làm mất một lời giải tối ưu. Bài chọn hoạt động cho thấy cách tìm quy tắc, tự phản biện bằng phản ví dụ và giải thích vì sao quy tắc cuối cùng đúng.

## Tư duy

- Phân biệt mục tiêu tối ưu của cả bài toán với một tiêu chí nhìn có vẻ thuận tiện.
- Thử phản ví dụ nhỏ trước khi chấp nhận quy tắc chọn.
- Dùng lập luận thay thế để chứng minh luôn có một lời giải tối ưu bắt đầu bằng lựa chọn tham lam.
- Xác định bài toán còn lại sau mỗi quyết định và kiểm tra nó giữ nguyên cấu trúc.

## Nội dung học

- Chọn nhiều hoạt động không chồng thời gian nhất bằng thứ tự kết thúc tăng dần.
- Quy ước khoảng `[start, finish)` để hoạt động sau có thể bắt đầu đúng lúc hoạt động trước kết thúc.
- Chứng minh trao đổi, phân tích sắp xếp và quét tuyến tính.
- Phân biệt chọn số lượng lớn nhất với chọn tổng giá trị lớn nhất; nhận diện tham lam đổi tiền không luôn đúng.

## Ba quy tắc có vẻ hợp lý

Giả sử các hoạt động là A=`[0,6)`, B=`[1,3)`, C=`[3,5)`, D=`[5,7)`. Chọn bắt đầu sớm nhất sẽ lấy A rồi bỏ ba hoạt động còn lại, trong khi B, C, D cùng thực hiện được. Vì vậy bắt đầu sớm không phải tiêu chí đúng.

Chọn ngắn nhất cũng có thể sai: với `[0,3)`, `[2,4)`, `[3,6)`, đoạn giữa ngắn nhất nhưng ngăn ta chọn hai đoạn hai bên. Một đặc điểm riêng của hoạt động không đủ nói lên việc nó cản trở phần còn lại thế nào.

Chọn hoạt động **kết thúc sớm nhất trong những hoạt động còn phù hợp** giữ nhiều thời gian nhất cho tương lai.

| Lượt | Hoạt động được chọn | Mốc kết thúc mới |
|---|---|---:|
| 1 | B `[1,3)` | 3 |
| 2 | C `[3,5)` | 5 |
| 3 | D `[5,7)` | 7 |

## Chọn xong là không đổi lại

Mỗi hoạt động có `start < finish`. Mã trả về số hoạt động lớn nhất, không trả về danh sách. Biến `hasLast` giúp xử lý cả thời gian âm mà không cần đoán một mốc ban đầu.

```cpp
#include <algorithm>
#include <utility>
#include <vector>

int selectActivities(vector<pair<long long, long long>> activities) {
    sort(activities.begin(), activities.end(), [](auto a, auto b) {
        if (a.second != b.second) return a.second < b.second;
        return a.first < b.first;
    });

    bool hasLast = false;
    long long finish = 0;
    int count = 0;
    for (auto [start, end] : activities) {
        if (!hasLast || start >= finish) {
            count++;
            finish = end;
            hasLast = true;
        }
    }
    return count;
}
```

Thời gian O(n log n) do sắp xếp, bước quét O(n). Hàm nhận bản sao vector nên bộ nhớ cho bản sao O(n); nếu được phép thay đổi dữ liệu gốc, truyền tham chiếu sẽ tránh bản sao đó.

## Vì sao kết thúc sớm là lựa chọn an toàn?

Xét một lời giải tối ưu có hoạt động đầu tiên Y, còn X là hoạt động kết thúc sớm nhất. Thay Y bằng X: X kết thúc không muộn hơn Y, nên mọi hoạt động vốn thực hiện sau Y vẫn thực hiện sau X. Số hoạt động không giảm. Do đó luôn có một lời giải tối ưu bắt đầu bằng X. Sau X, áp dụng cùng lập luận với các hoạt động bắt đầu từ thời điểm X kết thúc trở đi.

Lập luận phụ thuộc mục tiêu **đếm hoạt động**, không có trọng số. Nếu mỗi hoạt động có lợi ích khác nhau, đổi Y thành X có thể làm giảm tổng lợi ích. Bài xếp lịch có trọng số cần mô hình khác, thường là quy hoạch động.

Đổi tiền cũng cần phản biện. Mệnh giá `{1,3,4}` và số tiền 6: lấy xu lớn nhất trước được `4+1+1`, ba xu; phương án `3+3` chỉ hai xu. Không dùng một quy tắc tham lam cho mọi hệ mệnh giá chỉ vì nó đúng với vài ví dụ quen.

## Luyện tập

- Tạo phản ví dụ cho quy tắc “chọn bắt đầu sớm nhất”.
- Bổ sung chỉ số hoạt động để trả về lịch đã chọn, rồi kiểm tra không chồng thời gian.
- Khi mục tiêu là tổng lợi ích, nêu rõ bước nào của chứng minh trao đổi không còn đúng.

## Tự kiểm tra

> **Câu hỏi 1:** Điều gì khiến quy tắc kết thúc sớm có thể lặp lại sau mỗi lựa chọn?
>
> **Trả lời:** Sau hoạt động đã chọn, các hoạt động còn tương thích tạo một bài toán cùng dạng. Lập luận trao đổi vẫn áp dụng cho hoạt động đầu tiên của phần còn lại.

> **Câu hỏi 2:** Chọn hoạt động theo lợi ích lớn nhất có luôn giải được bài toán đếm nhiều hoạt động nhất không?
>
> **Trả lời:** Không. Lợi ích không phải mục tiêu của bài toán đếm, và một hoạt động lợi ích lớn có thể chặn nhiều hoạt động tương thích với nhau.

## Nguồn tham khảo thêm

- [VNOI — Tham lam](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/greedy-new.md)
- [Viblo — Tham lam, Greedy Method](https://viblo.asia/p/tham-lam-greedy-method-6J3ZgaeP5mB)
- [USACO Guide — Introduction to Greedy Algorithms](https://usaco.guide/bronze/intro-greedy)
