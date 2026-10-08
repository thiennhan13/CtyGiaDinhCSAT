Bài trước giới hạn mỗi vật được chọn một lần. Trong biến thể không giới hạn, một loại vật có thể được chọn nhiều lần, miễn tổng trọng lượng không vượt sức chứa. Sự thay đổi nằm ở điều kiện bài toán, vì vậy nó phải được phản ánh trong trạng thái và cách cập nhật; dùng lại mã 0/1 mà không xem xét điều này sẽ giải một bài toán khác.

## Tư duy

- Đọc kỹ “mỗi vật một lần” và “mỗi loại được lấy nhiều lần” để xác định đúng không gian lựa chọn.
- Giải thích lời giải khi lấy thêm một vật cùng loại từ một phương án đã có.
- Duy trì ý nghĩa giá trị tốt nhất dưới một sức chứa; phân biệt việc còn chỗ trống với việc có thể thêm một vật hợp lệ.
- Dùng những ví dụ chỉ có một loại vật để thấy trực tiếp tác động của việc cho phép lấy lặp.

## Nội dung học

- Mô hình cái túi không giới hạn với trọng lượng nguyên dương, giá trị không âm và sức chứa nguyên không âm.
- Trạng thái theo các loại đã xét và giới hạn sức chứa; nhánh lấy có thể tiếp tục dùng cùng loại.
- Mảng một chiều `dp[cap]` và cách duyệt sức chứa từ nhỏ lên lớn trong vòng xử lý một loại.
- So sánh kết quả và hướng duyệt với cái túi 0/1; tránh nhầm “tối ưu giá trị” với “đếm số cách”.
- Phân tích thời gian `O(nW)`, bộ nhớ phụ `O(W)` và điều kiện để quá trình chuyển trạng thái có cơ sở kết thúc.

## Cùng dữ liệu, khác điều kiện lựa chọn

Giữ sức chứa 6 và ba loại vật như bài trước:

| Loại | Trọng lượng mỗi vật | Giá trị mỗi vật |
|---|---:|---:|
| A | 2 | 4 |
| B | 3 | 5 |
| C | 4 | 7 |

Với mô hình 0/1, nhóm A + C cho kết quả tốt nhất là 11. Khi được lấy lặp, ba vật loại A có trọng lượng 6 và giá trị 12. Hai vật loại B có giá trị 10; một A và một C có giá trị 11. Giá trị tốt nhất vì thế là 12.

“Không giới hạn” ở đây nói về số lượng sẵn có của mỗi loại, không có nghĩa chọn vô hạn vật vào một túi hữu hạn. Mọi trọng lượng đều dương, nên sức chứa vẫn giới hạn số vật có thể chọn.

## Suy ra công thức từ một lần lấy thêm

Gọi `f[i][cap]` là giá trị tốt nhất khi được dùng `i` loại đầu tiên và tổng trọng lượng không vượt `cap`.

Nếu không dùng loại `i`, ta giữ `f[i - 1][cap]`. Nếu dùng ít nhất một vật loại `i`, bỏ tạm một vật đó ra: phần còn lại có sức chứa `cap - w[i]` và **vẫn được dùng loại `i`**. Vì vậy, nhánh lấy là `f[i][cap - w[i]] + v[i]`, khác với hàng `i - 1` của mô hình 0/1.

```text
f[i][cap] = f[i - 1][cap]                              nếu cap < w[i]
f[i][cap] = max(f[i - 1][cap],
                f[i][cap - w[i]] + v[i])               nếu cap >= w[i]
```

Trọng lượng dương bảo đảm `cap - w[i] < cap`. Nếu tính sức chứa từ nhỏ lên lớn, trạng thái nhỏ hơn ở **cùng hàng** đã được xác định trước khi cần dùng.

## Theo dõi cập nhật trong một loại vật

Khi chỉ xét loại A, mỗi vật có trọng lượng 2 và giá trị 4:

| Sức chứa | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Chưa xét loại nào | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Được lấy nhiều A | 0 | 0 | 4 | 4 | 8 | 8 | 12 |

Ở sức chứa 2, ta lấy một A và đạt 4. Đến sức chứa 4, kết quả tại sức chứa 2 đã chứa một A; lấy thêm một A cho giá trị 8. Tương tự, sức chứa 6 dùng kết quả tại 4 để đạt 12.

Với sức chứa 3 hoặc 5, còn một đơn vị trống nhưng không đặt thêm được A. Phương án vẫn hợp lệ vì đề yêu cầu không vượt sức chứa, không yêu cầu lấp đầy chính xác.

Sau khi xét cả ba loại, bảng kết quả là:

| Các loại đã xét / Sức chứa | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 0 | 0 | 4 | 4 | 8 | 8 | 12 |
| A, B | 0 | 0 | 4 | 5 | 8 | 9 | 12 |
| A, B, C | 0 | 0 | 4 | 5 | 8 | 9 | 12 |

C không cải thiện ô cuối trong ví dụ này. Thuật toán vẫn phải xét loại C; việc một loại không được chọn trong phương án tốt nhất không làm nó trở thành dữ liệu có thể bỏ tùy ý ở mọi bài khác.

## Cài đặt phần trọng tâm

Đoạn C++ dùng `<vector>`, `<algorithm>` và `<iostream>`. So với bài 0/1, thay đổi quan trọng là hướng duyệt sức chứa:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int W = 6;
vector<int> w = {2, 3, 4};
vector<long long> v = {4, 5, 7};
vector<long long> dp(W + 1, 0);
for (int i = 0; i < w.size(); ++i) {
    for (int cap = w[i]; cap <= W; ++cap) {
        dp[cap] = max(dp[cap], dp[cap - w[i]] + v[i]);
    }
}
cout << dp[W] << '\n';
```

Kết quả là 12. Khi đang xét một loại, vị trí `dp[cap - w[i]]` có thể đã được cập nhật bằng chính loại đó. Đây là điều ta **muốn** trong mô hình không giới hạn và phải tránh trong mô hình 0/1.

| Mô hình | Phần còn lại sau khi lấy | Hướng duyệt khi dùng một mảng |
|---|---|---|
| 0/1 | Chỉ dùng các vật trước | Sức chứa giảm dần |
| Không giới hạn | Vẫn được dùng loại hiện tại | Sức chứa tăng dần |

Hai hướng này được xét trong cách cài đặt có vòng ngoài duyệt vật/loại, vòng trong duyệt sức chứa. Không nên học thành một quy tắc đổi dấu vòng lặp mà bỏ qua ý nghĩa của trạng thái đang được đọc.

## Vì sao đúng và cần bao nhiêu công việc?

Với một loại và một sức chứa, mọi phương án hoặc không có loại hiện tại, hoặc có ít nhất một vật loại đó. Nếu có, bỏ một vật đi đưa về một trạng thái sức chứa nhỏ hơn, vẫn thuộc các loại được phép dùng. Hai nhánh bao phủ mọi phương án; chọn giá trị lớn hơn cho kết quả tốt nhất.

Tính theo số loại từ ít đến nhiều, sức chứa từ nhỏ đến lớn bảo đảm các trạng thái phụ thuộc đã sẵn sàng. Có tối đa `nW` lượt cập nhật, thời gian `O(nW)` và bộ nhớ phụ `O(W)`, với `n` là số loại. Vẫn cần đối chiếu `n` và `W` với giới hạn thực tế của đề.

Giá trị 0 ban đầu có ý nghĩa chọn không vật nào dưới mỗi sức chứa. Cách khởi tạo này dành cho yêu cầu “không vượt”. Nếu phải đạt đúng trọng lượng, cần đánh dấu các trạng thái không thể đạt, thay vì cho chúng giá trị 0 như một phương án hợp lệ.

## Các giả thiết không được bỏ qua

Hai dãy trọng lượng và giá trị phải có cùng số phần tử. Sức chứa không âm, mọi trọng lượng nguyên dương, số phần tử và sức chứa phù hợp với kiểu `int`, còn giá trị tổng nằm trong giới hạn `long long`.

Nếu cho phép trọng lượng 0 và giá trị dương, mô hình lấy vô hạn có thể tạo giá trị không bị chặn. Nếu trọng lượng âm, ý nghĩa “lấy một vật thì giảm sức chứa còn lại” cũng mất hiệu lực. Những trường hợp ấy không thuộc bài học và không thể xử lý bằng cách giữ nguyên vòng lặp trên.

Bài này **tối ưu tổng giá trị**, không đếm số cách lựa chọn. Trong bài đếm, thứ tự vật có được tính là một cách khác hay không còn ảnh hưởng cách chuyển và thứ tự vòng lặp; các mô hình đếm được học riêng trong phạm vi tiếp theo.

## Thực hành

- Với duy nhất loại A và sức chứa 6, giải thích vì sao đáp án là 12 ở mô hình này nhưng chỉ là 4 ở mô hình 0/1.
- Với ba loại A, B, C và sức chứa 5, đáp án là 9, từ một A và một B. Theo dõi thời điểm `dp[5]` được cải thiện.
- Chỉ có loại trọng lượng 4, giá trị 7, sức chứa 6: đáp án là 7 và còn trống 2. Giải thích vì sao không cần tiếp tục “lấp đủ” túi.

## Tự kiểm tra

> **Câu hỏi 1:** Nhánh lấy đọc hàng nào trong bảng hai chiều?
>
> **Trả lời:** Hàng của loại đang xét, vì sau khi lấy một vật, phần còn lại vẫn được dùng chính loại đó.

> **Câu hỏi 2:** Điều gì xảy ra nếu có loại trọng lượng 0 và giá trị dương?
>
> **Trả lời:** Có thể lấy không giới hạn mà không tăng trọng lượng, nên giá trị tối ưu không hữu hạn.

## Nguồn tham khảo thêm

- [VNOI — Quy hoạch động cơ bản, phần 2](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/dp/basic-dynamic-programming-2.md)
- [USACO Guide — Knapsack DP](https://usaco.guide/gold/knapsack)
- [Viblo — Top-down và Bottom-up](https://viblo.asia/p/quy-hoach-dong-76-top-down-va-bottom-up-gwd43g0j4X9)
- [Viblo — Các khuôn mẫu quy hoạch động](https://viblo.asia/p/lam-chu-quy-hoach-dong-cac-khuon-mau-thuong-gap-phan-1-13VM905GVY7)
