Mảng không chỉ để đọc lần lượt. Khi đảo dãy, thêm một phần tử hoặc bỏ một phần tử, chương trình phải thay đổi vị trí dữ liệu nhưng vẫn giữ đúng các giá trị cần có. Bài học tập trung vào hướng di chuyển: đi từ đâu để dữ liệu chưa xử lý không bị ghi đè, và độ dài dãy thay đổi như thế nào sau thao tác.

## Tư duy

- Mô tả dãy sau thao tác trước khi chọn cách di chuyển từng phần tử.
- Phân biệt ghi đè một giá trị với chèn thêm một vị trí mới.
- Chọn hướng dịch chuyển để giữ được dữ liệu chưa chuyển; theo dõi trạng thái trung gian.
- Xác định điều kiện hợp lệ của vị trí và sức chứa, không chỉ kiểm tra kết quả cuối.

## Nội dung học

- Đảo dãy bằng đổi chỗ các cặp đầu/cuối, dừng ở giữa.
- Chèn tại vị trí `pos`: dịch phần sau sang phải rồi đặt giá trị mới.
- Xóa tại vị trí `pos`: dịch phần sau sang trái và giảm độ dài.
- Độ dài đang dùng, sức chứa vật lý và phạm vi vị trí của từng thao tác.
- Chi phí di chuyển, trường hợp đầu/cuối, dãy rỗng và một phần tử.

## Đảo dãy bằng các cặp đối xứng

Với dãy `3, 8, 1, 6, 4`, đổi vị trí 0 với 4, rồi 1 với 3. Phần tử ở giữa giữ nguyên:

```diagram
3 8 1 6 4
↕       ↕      Đổi hai đầu
4 8 1 6 3
  ↕   ↕        Đổi cặp tiếp theo
4 6 1 8 3
```

Mã trong `main` dùng `<utility>` cho `swap`; mảng `a` có `n` phần tử hợp lệ:

```cpp
int trai = 0, phai = n - 1;
while (trai < phai) {
    swap(a[trai], a[phai]);
    ++trai;
    --phai;
}
```

Mỗi cặp được đổi đúng một lần. Nếu tiếp tục đổi sau khi hai chỉ số đã gặp hoặc vượt nhau, ta có thể đổi ngược những cặp vừa xử lý và làm mất kết quả đảo. Với `n = 0` hoặc 1, điều kiện sai ngay, không truy cập phần tử ngoài dãy.

## Chèn: giữ chỗ trước khi ghi

Xét `a = 3, 8, 1, 6`, độ dài 4, cần chèn 9 ở vị trí 2. Kết quả phải là `3, 8, 9, 1, 6`. Nếu ghi ngay `a[2] = 9`, số 1 sẽ mất và dãy vẫn chỉ có bốn phần tử.

Giả sử mảng có sức chứa 10, còn đủ ô trống và vị trí hợp lệ `0 ≤ pos ≤ n`. Phần mã trong `main`:

```cpp
int a[10] = {3, 8, 1, 6};
int n = 4, pos = 2, gia_tri = 9;

for (int i = n; i > pos; --i) {
    a[i] = a[i - 1];
}
a[pos] = gia_tri;
++n;
```

| Thao tác | Các ô từ 0 đến 4 |
|---|---|
| Ban đầu | `3, 8, 1, 6, trống` |
| Chép vị trí 3 sang 4 | `3, 8, 1, 6, 6` |
| Chép vị trí 2 sang 3 | `3, 8, 1, 1, 6` |
| Ghi 9 vào vị trí 2 | `3, 8, 9, 1, 6` |

Ta dịch từ cuối về đầu, để khi chép một phần tử sang phải, giá trị ở ô đích đã được chuyển đi hoặc chưa cần giữ nữa. Nếu đi từ `pos` lên, số 1 có thể đè lên số 6 trước khi số 6 được chuyển.

## Xóa: lấp chỗ trống bằng phần phía sau

Sau chèn, xóa vị trí 1 khỏi `3, 8, 9, 1, 6` cho dãy `3, 9, 1, 6`. Với mảng và `n` hiện tại, vị trí cần thỏa `0 ≤ pos < n`:

```cpp
int pos = 1;
for (int i = pos; i + 1 < n; ++i) {
    a[i] = a[i + 1];
}
--n;
```

Đây là đoạn mã trong `main`, dùng riêng cho bước xóa. Ta dịch từ trái sang phải; mỗi ô nhận giá trị của ô kế tiếp vẫn chưa bị thay đổi. Ô cũ ở cuối có thể còn giữ một giá trị, nhưng nó không còn thuộc độ dài đang dùng, nên không được xuất hoặc duyệt như dữ liệu hiện hành.

Chèn ở cuối không cần dịch chuyển nhưng cần sức chứa. Xóa phần tử cuối cũng không cần dịch, chỉ giảm độ dài. Không được xóa một vị trí của dãy rỗng; chèn ở vị trí 0 của dãy rỗng lại hợp lệ khi có ô trống.

## Tính đúng và chi phí

Đảo dãy đưa mỗi phần tử ở vị trí `i` đến `n - 1 - i`. Chèn giữ nguyên phần trước `pos`, dịch phần sau một ô và thêm đúng giá trị mới; xóa giữ phần trước và kéo phần sau lùi một ô. Cả ba bảo toàn những giá trị cần giữ theo đúng thứ tự yêu cầu.

Đảo cần `O(n)` thời gian. Chèn/xóa giữa dãy có thể phải chuyển gần `n` phần tử, cũng `O(n)` trong trường hợp xấu nhất; bộ nhớ phụ cho thao tác là `O(1)`. Việc truy cập một ô nhanh không làm chèn ở đầu mảng trở thành thao tác hằng số.

## Luyện tập

- Đảo một dãy chẵn và một dãy lẻ; đánh dấu các cặp được đổi.
- Chèn 5 vào đầu dãy `2, 7, 4`, rồi xóa phần tử cuối; viết trạng thái sau từng lần dịch.
- Thử chèn khi mảng đã đầy và xóa khi dãy rỗng: chỉ ra điều kiện phải kiểm tra trước khi chạy thao tác.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao chèn vào giữa mảng phải dịch từ cuối về đầu?
>
> **Trả lời:** Cần chuyển một giá trị trước khi ô chứa nó bị phần tử bên trái ghi đè. Đi từ cuối bảo vệ dữ liệu chưa chuyển. Sau khi tạo được ô trống tại vị trí chèn, ta mới ghi giá trị mới và tăng độ dài.

> **Câu hỏi 2:** Sau xóa, ô cuối cũ còn giá trị thì có cần xóa sạch nó để thuật toán đúng không?
>
> **Trả lời:** Không nhất thiết. Độ dài đã giảm nên ô đó nằm ngoài dữ liệu đang dùng. Tính đúng phụ thuộc việc chỉ duyệt các vị trí từ 0 đến `n - 1`; xóa sạch ô không thay cho việc cập nhật độ dài đúng.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
