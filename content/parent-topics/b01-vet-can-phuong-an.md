Một bài toán có thể được giải bằng cách xét mọi phương án hợp lệ, kiểm tra điều kiện rồi đếm hoặc chọn kết quả tốt nhất. Cách này gọi là vét cạn. Giá trị của nó nằm ở việc không bỏ sót phương án và có một lời giải dễ kiểm chứng; số lượng phương án phải phù hợp giới hạn của đề, chứ không thể kết luận vét cạn luôn đúng về thời gian.

## Tư duy

- Mô tả chính xác một phương án gồm những lựa chọn nào trước khi viết vòng duyệt.
- Tìm cách sinh mỗi phương án đúng một lần, tránh tự ghép hoặc đếm lại một cặp theo thứ tự ngược.
- Tách việc sinh phương án khỏi việc kiểm tra điều kiện để dễ kiểm chứng.
- Ước lượng số phương án và chi phí mỗi lần kiểm tra trước khi quyết định dùng cách này.

## Nội dung học

- Duyệt các cặp, bộ nhỏ bằng vòng lặp và điều kiện chỉ số.
- Đếm có điều kiện, giữ phương án tốt nhất và phân biệt vị trí với giá trị.
- Cặp không xét thứ tự dùng `i < j`; bộ ba dùng `i < j < k`.
- Chứng minh đủ và không trùng, chọn kiểu số cho tổng và số lượng.
- Độ phức tạp theo số lựa chọn, dùng lời giải trực tiếp làm cách đối chiếu trên dữ liệu nhỏ.

## Đếm cặp có tổng bằng một số

Cho dãy `1, 3, 5, 3`, cần đếm những cặp **vị trí khác nhau**, không xét thứ tự, có tổng bằng 8. Hai số 3 ở hai vị trí khác nhau vẫn là hai phần tử riêng.

| Cặp chỉ số | Hai giá trị | Tổng | Được đếm? |
|---|---|---:|---|
| `(0,1)` | 1 và 3 | 4 | Không |
| `(0,2)` | 1 và 5 | 6 | Không |
| `(0,3)` | 1 và 3 | 4 | Không |
| `(1,2)` | 3 và 5 | 8 | Có |
| `(1,3)` | 3 và 3 | 6 | Không |
| `(2,3)` | 5 và 3 | 8 | Có |

Đáp án là 2. Nếu chỉ đếm các bộ **giá trị phân biệt**, yêu cầu đã khác: hai cặp trên cùng gồm giá trị 3 và 5. Vì vậy phải đọc rõ đang chọn phần tử, vị trí hay giá trị.

## Sinh mỗi cặp một lần

Đoạn mã trong `main` dùng mảng có sẵn, không cần thư viện ngoài khung chương trình:

```cpp
int a[] = {1, 3, 5, 3};
int n = 4, muc_tieu = 8;
long long so_cap = 0;

for (int i = 0; i < n; ++i) {
    for (int j = i + 1; j < n; ++j) {
        if (1LL * a[i] + a[j] == muc_tieu) {
            ++so_cap;
        }
    }
}
```

Vòng trong bắt đầu ở `i + 1`, nên không có cặp một phần tử với chính nó và không có cặp đảo `(j,i)` sau khi đã xét `(i,j)`. Hai cặp được đếm trong ví dụ là hai lựa chọn hợp lệ khác nhau, không phải lỗi trùng do cùng giá trị.

Một cặp hai vị trí khác nhau luôn có vị trí nhỏ hơn và lớn hơn. Gọi chúng là `i`, `j`, cặp đó chắc chắn xuất hiện khi vòng ngoài đến `i`, vòng trong đến `j`. Nó không thể xuất hiện lần khác vì thuật toán luôn buộc `i < j`. Đây là lập luận đủ và không trùng của cách sinh.

## Từ cặp đến bộ ba và tối ưu

Nếu chọn ba vị trí không xét thứ tự, dùng ba vòng với `i < j < k`. Mỗi vòng sau bắt đầu ngay sau vị trí trước. Khi bài yêu cầu một kết quả tốt nhất, thay biến đếm bằng biến giữ giá trị/phương án, nhưng cách sinh phải vẫn bao phủ mọi lựa chọn hợp lệ.

```diagram
Chọn vị trí i
    → chọn j ở sau i
        → kiểm tra cặp (i,j)
            → đếm nếu đúng / cập nhật nếu tốt hơn
```

Tách bước kiểm tra giúp thay yêu cầu từ “tổng bằng 8” sang “tổng lớn nhất không vượt 8” mà vẫn thấy rõ phần nào cần đổi. Với tối ưu, cần cả cách khởi tạo khi chưa có phương án hợp lệ, không tự dùng 0 nếu kết quả có thể âm.

## Chi phí và giới hạn

Có `n(n - 1)/2` cặp, thời gian `O(n²)` khi kiểm tra mỗi cặp mất `O(1)`. Bộ nhớ phụ của ví dụ là `O(1)`. Ba vị trí có khoảng `n³/6` bộ, nên thời gian tăng đến `O(n³)`. Nếu mỗi kiểm tra lại duyệt một dãy, phải nhân thêm chi phí đó.

Với 2000 phần tử có 1 999 000 cặp, còn 200 000 phần tử có 19 999 900 000 cặp. Cùng một ý tưởng có thể phù hợp trường hợp trước nhưng quá chậm ở trường hợp sau. Ngưỡng chạy thực còn phụ thuộc môi trường và việc xử lý mỗi cặp; không dùng một số lượt cố định như cam kết cho mọi hệ thống.

Dãy có dưới hai phần tử không tạo cặp, kết quả đếm là 0. Nếu giá trị phần tử lớn, tổng phải được tính bằng kiểu đủ rộng như trong đoạn mã. Biến đếm cũng có thể vượt `int` vì số cặp tăng theo bình phương.

## Luyện tập

- Đếm cặp có tổng chẵn; giải thích vì sao không được duyệt cả `(i,j)` lẫn `(j,i)` nếu không xét thứ tự.
- Tìm tổng nhỏ nhất của hai phần tử khác vị trí trong dãy có số âm.
- Chọn ba vị trí có tổng bằng một mục tiêu và tính số bộ phải xét với dữ liệu nhỏ.

## Tự kiểm tra

> **Câu hỏi 1:** Hai phần tử cùng giá trị 3 có làm hai cặp `(3,5)` trở thành đếm trùng không?
>
> **Trả lời:** Không nếu đề chọn theo vị trí: hai số 3 ở hai vị trí tạo hai lựa chọn khác nhau. Chỉ khi đề đếm bộ giá trị phân biệt mới cần gộp chúng. Điều kiện `i < j` loại trùng thứ tự, không gộp dữ liệu có giá trị bằng nhau.

> **Câu hỏi 2:** Vét cạn có luôn là một lời giải quá chậm không?
>
> **Trả lời:** Không. Nếu số phương án và chi phí kiểm tra phù hợp giới hạn, vét cạn là lời giải rõ và đúng. Cần tính số lựa chọn, chẳng hạn `n(n-1)/2` cặp, rồi đối chiếu với kích thước dữ liệu thay vì đánh giá theo tên phương pháp.

## Nguồn tham khảo thêm

- [USACO Guide — Basic Complete Search](https://usaco.guide/bronze/intro-complete)
- [VNOI — Độ phức tạp tính toán](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/computational-complexity.md)
