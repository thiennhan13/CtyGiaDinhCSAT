Một dãy con được tạo bằng cách bỏ bớt phần tử nhưng giữ thứ tự ban đầu; các phần tử không cần liền nhau. LIS tìm dãy con **tăng nghiêm ngặt** dài nhất. Bài học đi từ trạng thái kết thúc tại một vị trí tới cách giữ đuôi nhỏ nhất, đồng thời phân biệt tính độ dài với dựng một dãy thật.

## Tư duy

- Giữ thứ tự chỉ số khi chọn dãy con, không sắp xếp đầu vào rồi coi đó là lời giải.
- Xét phần tử cuối để định nghĩa trạng thái có thể chuyển tiếp.
- Lưu người tiền nhiệm của một cải thiện để truy vết quyết định.
- Giải thích vì sao đuôi nhỏ hơn thuận lợi hơn cho việc nối các phần tử sau.

## Nội dung học

- Trạng thái `dp[i]`: LIS kết thúc đúng ở vị trí i.
- Chuyển từ j trước i với `a[j] < a[i]`, cơ sở độ dài 1.
- Mảng `previous`, vị trí kết thúc tốt nhất và đảo đường truy vết.
- Thuật toán đuôi nhỏ nhất kết hợp `lower_bound`, phân biệt tăng nghiêm ngặt và không giảm.

## Không cần liền nhau, nhưng không được đổi thứ tự

Với `[4,1,3,2,5]`, một LIS là `[1,3,5]`, một LIS khác là `[1,2,5]`, cùng dài 3. Dãy `[1,2,3,4,5]` sau khi sắp xếp không phải dãy con của đầu vào.

| Chỉ số i | 0 | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|---:|
| a[i] | 4 | 1 | 3 | 2 | 5 |
| dp[i] | 1 | 1 | 2 | 2 | 3 |
| Tiền nhiệm một phương án | — | — | 1 | 1 | 2 |

Một dãy tăng kết thúc tại i hoặc chỉ có a[i], hoặc nối a[i] vào một dãy tăng kết thúc tại j<i và a[j]<a[i]. Dùng kết quả tốt nhất ở j tạo `dp[j]+1`. Xét mọi j hợp lệ bao phủ mọi dãy kết thúc ở i.

## Lưu dấu vết khi cải thiện

Mã trả về một LIS; không cam kết dãy nhỏ nhất theo thứ tự từ điển. Dãy rỗng trả vector rỗng.

```cpp
#include <algorithm>
#include <vector>

vector<int> lisSequence(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return {};
    vector<int> dp(n, 1), previous(n, -1);
    int end = 0;

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (a[j] < a[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                previous[i] = j;
            }
        }
        if (dp[i] > dp[end]) end = i;
    }

    vector<int> result;
    for (int i = end; i != -1; i = previous[i]) {
        result.push_back(a[i]);
    }
    reverse(result.begin(), result.end());
    return result;
}
```

`previous[i]` luôn nhỏ hơn i, nên truy vết dừng và giữ đúng thứ tự chỉ số sau khi đảo. Chỉ cập nhật tiền nhiệm cùng lúc dp tốt hơn; lưu tùy tiện một j có giá trị nhỏ hơn chưa chắc tạo dãy dài nhất.

Thời gian O(n²), bộ nhớ phụ O(n); dùng như lời giải dễ kiểm tra khi n vừa phải.

## Giữ đuôi nhỏ nhất để đi nhanh hơn

Gọi `tails[len-1]` là giá trị cuối nhỏ nhất của một dãy tăng độ dài len đã thấy. Với x mới, tìm ô đầu tiên có giá trị **không nhỏ hơn x**, rồi thay bằng x; nếu không có, nối thêm một ô.

```cpp
#include <algorithm>
#include <vector>

int lisLength(const vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}
```

Những độ dài ngắn hơn vị trí tìm được có đuôi nhỏ hơn x nên nối được x; vị trí thay thế vẫn biểu diễn một dãy cùng độ dài nhưng đuôi không lớn hơn trước. Dãy tails tăng nên dùng được nhị phân. Thời gian O(n log n), bộ nhớ O(n).

**tails không nhất thiết là một LIS thực tế**: các ô có thể đến từ những dãy khác nhau. Muốn dựng dãy ở thuật toán nhanh cần lưu chỉ số đuôi và tiền nhiệm; không in tails rồi coi là truy vết.

Dãy `[2,2,2]` có LIS dài 1. `lower_bound` thay cùng ô cho giá trị bằng nhau; dùng `upper_bound` sẽ chuyển sang yêu cầu không giảm, khác bài này.

## Luyện tập

- Đối chiếu độ dài hai thuật toán trên dãy nhỏ ngẫu nhiên.
- Kiểm tra dãy giảm, dãy toàn bằng nhau và dãy rỗng.
- Thử dựng một dãy mà tails cuối không giữ thứ tự chỉ số của đầu vào.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao điều kiện chuyển là a[j] < a[i], không phải ≤?
>
> **Trả lời:** LIS trong bài này tăng nghiêm ngặt. Hai phần tử bằng nhau không được nối để tăng độ dài.

> **Câu hỏi 2:** Tại sao không in tails như một LIS?
>
> **Trả lời:** Mỗi ô giữ đuôi tốt nhất của một độ dài, nhưng các ô không bắt buộc thuộc cùng một dãy con có thứ tự chỉ số hợp lệ.

## Nguồn tham khảo thêm

- [USACO Guide — Longest Increasing Subsequence](https://usaco.guide/gold/lis)
- [VNOI — Quy hoạch động cơ bản, phần 1](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-1.md)
- [Viblo — Nhập môn quy hoạch động cơ bản](https://viblo.asia/p/nhap-mon-quy-hoach-dong-co-ban-XRJ8RlY9VGq)
