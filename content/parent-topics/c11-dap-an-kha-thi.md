Không phải bài tìm kiếm nhị phân nào cũng có một dãy đã sắp xếp sẵn. Khi bài toán yêu cầu một giá trị nhỏ nhất hoặc lớn nhất, ta có thể thử một giá trị và hỏi: **với giới hạn này, có làm được hay không?** Nếu tính khả thi đổi theo đúng một chiều, tìm kiếm nhị phân giúp xác định ranh giới của đáp án.

## Tư duy

- Tách bài toán tối ưu khỏi bài toán quyết định đúng hoặc sai cho một giá trị cố định.
- Chứng minh tính đơn điệu của khả năng thực hiện, không chỉ quan sát vài mẫu.
- Chọn cận chứa đáp án và xác định đang tìm giá trị khả thi đầu tiên hay cuối cùng.
- Tính tổng chi phí bằng số lần thử nhân với chi phí kiểm tra.

## Nội dung học

- Chặt nhị phân trên đáp án nguyên và bảng khả thi false → true.
- Chia dãy không âm thành không quá k đoạn liên tiếp với tổng đoạn lớn nhất nhỏ nhất.
- Hàm kiểm tra tham lam kéo dài mỗi đoạn hết mức cho phép.
- Bất biến khoảng đáp án, cách cập nhật cận và sử dụng `long long`.

## Một giới hạn cố định dễ kiểm tra hơn đáp án tối ưu

Cho dãy `[2, 4, 3, 5]`, chia thành không quá hai đoạn liên tiếp để tổng lớn nhất của một đoạn nhỏ nhất. Thử mọi chỗ cắt cho kết quả nhỏ nhất 8: `[2,4] | [3,5]` có hai tổng 6 và 8.

Nếu số phần tử lớn, liệt kê mọi cách chia nhiều đoạn không còn thuận tiện. Giả sử giới hạn tổng mỗi đoạn là X. Ta duyệt từ trái sang phải, thêm phần tử vào đoạn hiện tại khi còn vừa; chỉ mở đoạn mới khi phải mở. Với X bằng 7, cần ba đoạn `[2,4] | [3] | [5]`, nên không làm được với hai đoạn. Với X bằng 8, hai đoạn là đủ.

| X | 5 | 6 | 7 | 8 | 9 | 14 |
|---|---|---|---|---|---|---|
| Chia được với ≤2 đoạn? | Không | Không | Không | Có | Có | Có |

Một cách chia đã vừa X chắc chắn vẫn vừa X lớn hơn. Đó là chứng minh false → true; không cần giả định điểm chuyển từ một bảng thử nhỏ.

## Hàm kiểm tra và vòng tìm kiếm

Đầu vào là dãy không rỗng, các phần tử không âm, `k >= 1`; tổng cả dãy phải vừa `long long`. Phép so sánh `sum > limit - x` tránh cộng vượt giới hạn đang xét.

```cpp
#include <algorithm>
#include <numeric>
#include <vector>

bool feasible(const vector<long long>& a, int k, long long limit) {
    int groups = 1;
    long long sum = 0;
    for (long long x : a) {
        if (x > limit) return false;
        if (sum > limit - x) {
            groups++;
            sum = x;
        } else {
            sum += x;
        }
    }
    return groups <= k;
}

long long minimumLimit(const vector<long long>& a, int k) {
    long long low = *max_element(a.begin(), a.end());
    long long high = accumulate(a.begin(), a.end(), 0LL);
    while (low < high) {
        long long mid = low + (high - low) / 2;
        if (feasible(a, k, mid)) high = mid;
        else low = mid + 1;
    }
    return low;
}
```

Cận dưới là phần tử lớn nhất vì một phần tử phải thuộc một đoạn. Cận trên là tổng cả dãy vì dùng một đoạn luôn đủ khi k ít nhất 1. Nếu dãy toàn 0, hai cận đều 0 và không cần lặp.

## Hàm kiểm tra cũng cần chứng minh

Tham lam đặt điểm kết thúc đoạn đầu xa nhất có thể. Với phần tử không âm, một cách chia hợp lệ khác không thể kết thúc đoạn đầu xa hơn. Lặp lại lập luận trên phần còn lại cho thấy sau cùng số đoạn tham lam không lớn hơn số đoạn của cách chia kia. Vì vậy tham lam kiểm tra đúng có tồn tại cách chia dùng không quá k đoạn hay không.

Nếu dãy có số âm, lập luận ấy không còn đúng: một tổng tạm vượt X có thể giảm khi thêm phần tử âm. Chặt nhị phân không sửa được một hàm kiểm tra sai.

Mỗi lượt kiểm tra O(n); số lượt O(log R), với R là độ rộng miền giá trị ban đầu cộng 1. Tổng thời gian O(n log R), bộ nhớ phụ O(1). Khi đề yêu cầu **đúng k đoạn không rỗng**, cần thêm `k <= n`; với số không âm, có thể tách một đoạn thành các đoạn nhỏ hơn mà không vượt giới hạn.

## Luyện tập

- Vẽ bảng khả thi cho dãy mẫu với k bằng 1, 2 và 4.
- Giải thích vì sao giữ `high = mid` khi mid khả thi không bỏ đáp án nhỏ nhất.
- Tạo một dãy có số âm khiến bước mở đoạn tham lam không còn hợp lệ.

## Tự kiểm tra

> **Câu hỏi 1:** Tính đơn điệu cần áp dụng cho đáp án hay cho hàm kiểm tra?
>
> **Trả lời:** Cho mệnh đề khả thi tại mỗi giá trị ứng viên. Ta cần chứng minh tăng hoặc giảm giới hạn làm khả thi thay đổi theo một chiều duy nhất.

> **Câu hỏi 2:** Vì sao chi phí không chỉ là O(log R)?
>
> **Trả lời:** Mỗi lần chọn mid còn duyệt cả dãy để kiểm tra, mất O(n). Tổng là O(n log R).

## Nguồn tham khảo thêm

- [USACO Guide — Binary Search](https://usaco.guide/silver/binary-search)
- [VNOI — Tham lam](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/greedy-new.md)
