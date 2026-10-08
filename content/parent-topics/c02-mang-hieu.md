Nếu nhiều thao tác cùng cộng một lượng vào cả đoạn của dãy, đi sửa từng ô sẽ lặp lại rất nhiều lần. Mảng hiệu lưu nơi một thay đổi bắt đầu và nơi nó kết thúc; chỉ sau khi đã ghi tất cả thao tác, ta mới cộng dồn để biết thay đổi tại từng ô. Đây là cách chuyển từ “sửa mọi phần tử” sang “ghi hai ranh giới”.

## Tư duy

- Tìm thông tin tối thiểu mô tả một cập nhật đồng đều trên cả đoạn.
- Phân biệt ghi nhận tác động với khôi phục dữ liệu cuối cùng.
- Dùng phép cộng để chồng nhiều tác động mà không phụ thuộc thứ tự cập nhật.
- Theo dõi vị trí ngay sau đoạn và giải thích tại sao phải triệt tiêu tác động ở đó.

## Nội dung học

- Định nghĩa mảng hiệu và quan hệ giữa lấy hiệu với cộng dồn.
- Cập nhật đoạn `[l, r]` bằng dấu `+v` tại `l`, `-v` tại `r + 1`.
- Khôi phục mức tăng tại mỗi vị trí sau khi xử lý các cập nhật.
- Ô đệm `n + 1`, kiểu số cho tác động tích lũy và giới hạn của xử lý theo lô.

## Hai dấu mốc thay cho cả đoạn

Cho dãy `4, 1, 3, 0, 2`. Thực hiện cộng 3 vào `[2, 4]`, rồi trừ 2 ở `[1, 3]`. Cách trực tiếp làm 6 lần sửa phần tử; với `q` đoạn dài trên dãy `n` phần tử, chi phí có thể tới `O(nq)`.

Xét riêng cập nhật cộng 3 vào `[2, 4]`: mức tăng là 0 trước vị trí 2, thành 3 từ vị trí 2, rồi trở về 0 ở vị trí 5. Chỉ có hai nơi mức tăng thay đổi. Ghi `d[2] += 3`, `d[5] -= 3` là đủ; cộng dồn `d` sẽ tái tạo mức tăng.

Sau cả hai cập nhật, ta có:

| Vị trí | 1 | 2 | 3 | 4 | 5 | 6, ô đệm |
|---|---:|---:|---:|---:|---:|---:|
| Dấu thay đổi `d` | -2 | 3 | 0 | 2 | -3 | 0 |
| Mức tăng cộng dồn | -2 | 1 | 1 | 3 | 0 | 0 |
| Dữ liệu ban đầu | 4 | 1 | 3 | 0 | 2 | — |
| Dữ liệu cuối | 2 | 2 | 4 | 3 | 2 | — |

Mỗi cập nhật góp độc lập vào hai dấu mốc. Phép cộng có tính kết hợp và giao hoán, nên có thể cộng các dấu của nhiều cập nhật trước rồi khôi phục một lần.

## Cài đặt và ô ngay sau đoạn

Đoạn mã dùng `<vector>`, `<iostream>`; `a` có `n + 1` ô với dữ liệu ở 1 đến `n`, mỗi truy vấn thỏa `1 <= l <= r <= n`. Tổng và mức tăng phải nằm trong miền `long long`.

```cpp
vector<long long> d(n + 2, 0);
for (int i = 0; i < q; i++) {
    int l, r;
    long long v;
    cin >> l >> r >> v;
    d[l] += v;
    d[r + 1] -= v;
}

long long tang = 0;
for (int i = 1; i <= n; i++) {
    tang += d[i];
    a[i] += tang;
}
```

Mảng có `n + 2` ô vì chỉ số lớn nhất có thể ghi là `n + 1` khi cập nhật kết thúc ở `n`. Ô ấy không cần xuất ra, nhưng phải tồn tại để thao tác ghi hợp lệ. Nếu ghi `-v` tại `r` thay vì `r + 1`, phần tử cuối đoạn không còn được tăng đúng.

### Quan hệ với mảng hiệu của dữ liệu

Có thể tạo mảng hiệu trực tiếp từ dữ liệu: `d[1] = a[1]`, `d[i] = a[i] - a[i - 1]`. Khi đó, sau cập nhật, cộng dồn `d` cho ra luôn dữ liệu mới. Mã trên sử dụng một mảng **mức tăng** khởi tạo 0, nên lúc khôi phục phải cộng thêm vào `a[i]`. Hai cách đúng nhưng không được trộn bước khởi tạo của cách này với bước khôi phục của cách kia.

## Tính đúng, chi phí và phạm vi sử dụng

Với một cập nhật, tổng các dấu trước `l` bằng 0; từ `l` đến `r` chứa `+v` nhưng chưa có `-v`; từ `r + 1` chứa cả hai nên bằng 0. Vì vậy, phép cộng dồn tạo tác động đúng tại mọi vị trí. Nhiều cập nhật đúng vì tổng tác động của chúng bằng tổng các kết quả vừa phân tích.

Ghi `q` cập nhật tốn `O(q)`; khôi phục dãy tốn `O(n)`; tổng `O(n + q)` thời gian, `O(n)` bộ nhớ phụ. Kỹ thuật phù hợp khi thực hiện tất cả cập nhật rồi mới cần dữ liệu cuối. Nếu sau mỗi cập nhật đều phải hỏi ngay giá trị một vị trí, cộng dồn lại từ đầu mỗi lần có thể làm chi phí trở nên lớn; cần xem đúng mô hình bài toán.

## Minh họa và luyện tập

[Prefix sums, difference arrays — peltorator](https://www.youtube.com/watch?v=5iW84xlL0j0).

Trên một dải 5 ô, đánh dấu `+3` ở ô 2 và `-3` ngay sau ô 4. Khi đi từ trái qua phải, “mức đang tác động” nhảy từ 0 lên 3 rồi trở về 0. Đó là diễn giải trực quan của cột cộng dồn trong bảng, không phải hai ô duy nhất được cập nhật trong dãy cuối.

- Cập nhật cả dãy, một ô, hai đoạn giao nhau và một đoạn với lượng tăng âm.
- Kiểm tra dữ liệu cuối bằng cập nhật trực tiếp trên những dãy ngắn.
- Dùng mảng hiệu để đếm số đoạn phủ mỗi vị trí bằng cập nhật lượng tăng 1.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao dấu triệt tiêu phải đặt ở `r + 1`?
>
> **Trả lời:** Tác động phải còn hiệu lực tại `r`, vì hai đầu đều thuộc đoạn cập nhật. Chỉ từ vị trí sau `r` mới cần trở lại mức cũ.

> **Câu hỏi 2:** Khi nào không thể nói tổng chi phí chỉ là `O(n + q)`?
>
> **Trả lời:** Khi phải khôi phục hoặc trả truy vấn ngay giữa các cập nhật và thực hiện lại phép cộng dồn nhiều lần. Chi phí tuyến tính nêu trên dành cho mô hình ghi toàn bộ cập nhật rồi khôi phục một lần.

## Nguồn tham khảo thêm

- [VNOI — Mảng cộng dồn và mảng hiệu](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/data-structures/prefix-sum-and-difference-array.md)
- [Viblo Algorithm — Mảng tổng tiền tố và mảng hiệu](https://viblo.asia/p/quy-hoach-dong-55-mang-tong-tien-to-va-mang-hieu-phan-1-r1QLx6104Aw)
