Tổng tiền tố một chiều lưu thông tin về phần đầu của một dãy. Với một bảng số, ta có thể lưu tổng của những hình chữ nhật tính từ góc trên bên trái. Từ các tổng ấy, một vùng bất kỳ được lấy ra bằng cách trừ những phần nằm ngoài rồi cộng lại phần bị trừ hai lần. Bài này tiếp nối cộng dồn một chiều và dành trọng tâm cho cách nhìn vùng giao nhau.

## Tư duy

- Chuyển từ một đoạn trên dãy sang một vùng có cận hàng và cận cột trên bảng.
- Định nghĩa mỗi tổng tiền tố theo một hình chữ nhật cụ thể, tránh nhầm với tổng riêng hàng hoặc cột.
- Nhận ra phần giao nhau khi gộp hoặc loại bỏ hai vùng; giải thích vì sao phải cộng bù hoặc trừ bớt.
- Kiểm tra công thức trên một ô, một hàng, một cột và cả bảng trước khi dùng cho nhiều truy vấn.

## Nội dung học

- Tổng `s[i][j]` của hình chữ nhật từ ô `(1, 1)` đến ô `(i, j)`, gồm cả hàng và cột biên.
- Công thức xây dựng từ vùng phía trên, vùng bên trái và phần giao nhau.
- Công thức lấy tổng hình chữ nhật đóng từ `(x1, y1)` đến `(x2, y2)`.
- Mảng hai chiều có hàng 0 và cột 0 làm vùng đệm; cách duyệt để các giá trị cần dùng đã được tính.
- Chi phí `O(h × c)` khi tiền xử lý, `O(1)` mỗi truy vấn và lựa chọn kiểu dữ liệu cho tổng.

## Định nghĩa vùng đã lưu

Xét bảng có 3 hàng và 4 cột. Các hàng đánh số từ trên xuống, các cột từ trái sang phải:

| Hàng / Cột | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|
| 1 | 2 | -1 | 3 | 4 |
| 2 | 0 | 5 | 1 | -2 |
| 3 | 6 | 2 | -3 | 1 |

`s[2][3]` là tổng của sáu ô nằm trong hai hàng đầu, ba cột đầu: `2 - 1 + 3 + 0 + 5 + 1 = 10`. Nó không phải tổng hàng 2, cũng không phải tổng cột 3. Việc định nghĩa bằng **phạm vi ô** giúp học sinh biết chính xác những phần nào được cộng hoặc trừ sau đó.

## Tạo tổng tiền tố: tránh đếm hai lần

Để xây `s[i][j]`, ta ghép vùng phía trên `s[i - 1][j]` với vùng bên trái `s[i][j - 1]`, rồi thêm ô mới `a[i][j]`. Hai vùng đã ghép cùng chứa hình chữ nhật `s[i - 1][j - 1]`, nên phần giao ấy bị tính hai lần và phải trừ một lần:

```text
s[i][j] = s[i - 1][j] + s[i][j - 1]
          - s[i - 1][j - 1] + a[i][j]
```

Tại ô `(2, 2)`, vùng phía trên có tổng 1, vùng bên trái có tổng 2, phần giao có tổng 2 và ô mới có giá trị 5. Vì thế, `s[2][2] = 1 + 2 - 2 + 5 = 6`.

Kết quả tiền xử lý của toàn bảng là:

| Hàng / Cột | 0 | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 2 | 1 | 4 | 8 |
| 2 | 0 | 2 | 6 | 10 | 12 |
| 3 | 0 | 8 | 14 | 15 | 18 |

Hàng 0 và cột 0 là những vùng rỗng có tổng 0. Chúng làm công thức đúng cả khi đang tính hàng đầu hoặc cột đầu.

## Cài đặt phần tiền xử lý

Đoạn C++ dưới đây dùng `<vector>`. Bảng `a` có sẵn một hàng và một cột đệm; chúng không phải dữ liệu của bài toán.

```cpp
int h = 3, c = 4;
vector<vector<long long>> a = {
    {0, 0, 0, 0, 0},
    {0, 2, -1, 3, 4},
    {0, 0, 5, 1, -2},
    {0, 6, 2, -3, 1}
};
vector<vector<long long>> s(h + 1,
    vector<long long>(c + 1, 0));
for (int i = 1; i <= h; ++i) {
    for (int j = 1; j <= c; ++j) {
        s[i][j] = s[i - 1][j] + s[i][j - 1]
                  - s[i - 1][j - 1] + a[i][j];
    }
}
```

Duyệt từng hàng từ trên xuống và từng cột từ trái sang phải bảo đảm ba tổng ở vế phải đã có giá trị. Khi đến một ô, ta không tính lại cả vùng từ đầu; chỉ kết hợp ba vùng đã lưu với giá trị ô mới.

## Lấy tổng một hình chữ nhật bất kỳ

Muốn lấy vùng từ `(x1, y1)` đến `(x2, y2)`, ta bắt đầu với `s[x2][y2]`. Vùng này còn chứa những hàng nằm phía trên `x1` và những cột nằm bên trái `y1`.

Trừ vùng phía trên bằng `s[x1 - 1][y2]`, rồi trừ vùng bên trái bằng `s[x2][y1 - 1]`. Phần góc trên bên trái thuộc cả hai vùng vừa trừ, nên đã bị trừ hai lần. Ta cộng lại `s[x1 - 1][y1 - 1]` để nó chỉ bị loại một lần:

```cpp
int x1 = 2, y1 = 2, x2 = 3, y2 = 4;
long long tong = s[x2][y2] - s[x1 - 1][y2]
                 - s[x2][y1 - 1] + s[x1 - 1][y1 - 1];
```

Vùng được hỏi gồm `5, 1, -2` ở hàng 2 và `2, -3, 1` ở hàng 3. Công thức cho `18 - 8 - 8 + 2 = 4`; cộng trực tiếp cũng được `(5 + 1 - 2) + (2 - 3 + 1) = 4`.

Đây là cách vận dụng nguyên tắc **bao hàm – loại trừ**: khi hai vùng có phần chung, phải theo dõi số lần phần chung được tính. Học sinh nên giải thích được dấu của từng hạng trước khi ghi nhớ công thức.

## Tính đúng, chi phí và điều kiện áp dụng

Trong bước xây dựng, mọi ô cần thuộc `s[i][j]` đều xuất hiện trong vùng phía trên, vùng bên trái hoặc ô mới. Những ô ở phần giao bị tính hai lần được trừ một lần; các ô khác được tính đúng một lần. Công thức truy vấn làm điều ngược lại: bỏ những vùng nằm ngoài và cộng bù phần giao đã bị bỏ thừa.

Với `h` hàng, `c` cột, mỗi ô được xử lý một lần nên tiền xử lý có thời gian `O(h × c)` và bộ nhớ phụ `O(h × c)`. Sau đó, mỗi tổng hình chữ nhật cần bốn lần đọc mảng, thời gian `O(1)`. Với `q` truy vấn, tổng thời gian là `O(h × c + q)`.

Cần có `1 ≤ x1 ≤ x2 ≤ h` và `1 ≤ y1 ≤ y2 ≤ c`. Bảng rỗng không có vùng hợp lệ để truy vấn. Số âm được phép; kiểu dữ liệu phải đủ chứa các tổng và các phép tính trung gian. Nếu bảng thay đổi sau khi tiền xử lý, các tổng đã lưu có thể không còn đúng.

Những ca kiểm tra dễ phát hiện lỗi là một ô ở góc, toàn hàng đầu, toàn cột đầu và cả bảng. Đừng hoán đổi cận hàng với cận cột chỉ vì một ví dụ dùng bảng vuông; bảng chữ nhật giúp thấy lỗi ấy rõ hơn.

## Thực hành

- Tính tổng riêng ô `(2, 2)`, cả hàng 1 và cả cột 4; kết quả tương ứng là 5, 8 và 3.
- Tính vùng từ `(1, 2)` đến `(3, 3)`; kiểm tra bằng cộng trực tiếp, kết quả là 7.
- Với bảng ô có hoặc không có vật đánh dấu, chuyển mỗi ô thành 1 hoặc 0 rồi đếm số vật trong những vùng được hỏi.

## Minh họa bằng video

[Prefix sums, difference arrays — peltorator](https://www.youtube.com/watch?v=5iW84xlL0j0).

Trên bảng ví dụ, hãy khoanh vùng cần lấy rồi tô phần phía trên và bên trái. Ô góc thuộc cả hai màu chính là phần phải cộng bù. Video có phần mở rộng nhiều chiều; khi đọc bài này, chỉ cần tập trung vào hình chữ nhật và đối chiếu bốn vùng trong công thức.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao công thức truy vấn hình chữ nhật phải cộng lại vùng góc trên bên trái?
>
> **Trả lời:** Vùng góc đó thuộc cả phần phía trên và phần bên trái đã trừ. Nó bị trừ hai lần, trong khi chỉ cần bỏ một lần, nên phải cộng bù một lần.

> **Câu hỏi 2:** Tiền xử lý có lợi gì khi số truy vấn lớn nhưng bảng không đổi?
>
> **Trả lời:** Xây các tổng một lần trong `O(h × c)` rồi trả mỗi truy vấn bằng bốn giá trị trong `O(1)`. Tổng chi phí là `O(h × c + q)`, thay vì có thể duyệt cả bảng cho từng truy vấn.

## Nguồn tham khảo thêm

- [VNOI — Mảng cộng dồn và mảng hiệu](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/data-structures/prefix-sum-and-difference-array.md)
- [USACO Guide — Introduction to Prefix Sums](https://usaco.guide/silver/prefix-sums)
- [Viblo Algorithm — Mảng tổng tiền tố và mảng hiệu](https://viblo.asia/p/quy-hoach-dong-55-mang-tong-tien-to-va-mang-hieu-phan-1-r1QLx6104Aw)
