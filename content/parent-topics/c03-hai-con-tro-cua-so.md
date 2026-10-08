Nhiều bài toán trên dãy có hai cận: hai phần tử cần ghép, hoặc đầu và cuối của một đoạn. Xét mọi cặp cận thường tốn thời gian bậc hai. Hai con trỏ khai thác một quan hệ có hướng để dịch cận mà không phải quay lại những phương án đã loại. Điều quyết định là chứng minh vì sao dịch như vậy không bỏ đáp án.

## Tư duy

- Xác định ý nghĩa của hai vị trí và phần phương án còn cần xét giữa chúng.
- Tìm tính đơn điệu bảo đảm một lần dịch cận có thể loại bỏ cả nhóm phương án.
- Duy trì thông tin của một cửa sổ bằng thêm phần tử mới và bỏ phần tử cũ.
- Đếm tổng số lần dịch con trỏ thay vì nhân số vòng lặp lồng nhau một cách máy móc.

## Nội dung học

- Hai con trỏ từ hai đầu trên dãy sắp tăng để tìm tổng hai phần tử.
- Cửa sổ độ dài cố định và cập nhật tổng khi trượt.
- Cửa sổ độ dài thay đổi trên dữ liệu không âm.
- Điều kiện đơn điệu, số âm và các tình huống làm quy tắc thu hẹp mất hiệu lực.

## Tìm một cặp trên dãy đã sắp

Cho `1, 3, 4, 7, 9`, tìm hai vị trí khác nhau có tổng 11. Duyệt mọi cặp cần `O(n²)` lần kiểm tra. Đặt `l = 0`, `r = n - 1`: tổng đầu tiên là 10. Với phần tử 1 này, ngay cả ghép với số lớn nhất 9 vẫn thiếu, nên mọi cặp dùng 1 đều không phù hợp; tăng `l`.

| `l`, `r` | Hai giá trị | Tổng | Quyết định |
|---|---|---:|---|
| 0, 4 | 1 và 9 | 10 | Bỏ đầu trái |
| 1, 4 | 3 và 9 | 12 | Bỏ đầu phải |
| 1, 3 | 3 và 7 | 10 | Bỏ đầu trái |
| 2, 3 | 4 và 7 | 11 | Tìm thấy |

Khi tổng lớn hơn đích, phần tử bên phải ghép với mọi phần tử còn lại đều ít nhất bằng tổng đang xét, nên có thể bỏ nó. Lập luận này dựa vào dãy sắp tăng và vẫn đúng khi dãy có số âm.

Đoạn mã dùng `<vector>`, `<utility>`, nhận dãy `int` đã sắp và số phần tử vừa miền `int`; tổng dùng `long long` để không tràn hai giá trị `int`.

```cpp
pair<int, int> tim_cap(const vector<int>& a, long long x) {
    int n = a.size();
    int l = 0, r = n - 1;
    while (l < r) {
        long long tong = 1LL * a[l] + a[r];
        if (tong == x) return {l, r};
        if (tong < x) l++;
        else r--;
    }
    return {-1, -1};
}
```

Mỗi lượt dịch ít nhất một con trỏ; tổng số lần dịch không quá `n`, nên phần tìm cặp tốn `O(n)`, bộ nhớ phụ `O(1)`. Nếu phải sắp trước thì tổng thời gian gồm `O(n log n)`. Muốn trả vị trí trong dãy gốc, phải giữ vị trí trước khi sắp.

## Cửa sổ: cùng hướng nhưng không cùng tốc độ

Với đoạn liên tiếp dài đúng `k`, có thể cộng `k` phần tử đầu rồi mỗi lần trượt bỏ phần tử vừa ra khỏi cửa sổ và thêm phần tử mới. Cách này dùng được cả với số âm, vì độ dài được quy định sẵn.

Khó hơn là tìm đoạn dài nhất có tổng không quá `K`. Nếu mọi số **không âm**, thêm đầu phải không giảm tổng; bỏ đầu trái không tăng tổng. Vì vậy, sau khi thêm phần tử mới, ta thu hẹp đến khi tổng hợp lệ.

Với `2, 1, 1, 3, 1` và `K = 4`:

| Đầu phải | Tổng sau thu hẹp | Đầu trái | Độ dài hợp lệ |
|---:|---:|---:|---:|
| 0 | 2 | 0 | 1 |
| 1 | 3 | 0 | 2 |
| 2 | 4 | 0 | 3 |
| 3 | 4 | 2 | 2 |
| 4 | 4 | 3 | 2 |

Đoạn dài nhất có độ dài 3. Hàm dưới nhận `K >= 0`, dãy không âm, độ dài vừa miền `int` và tổng dãy vừa miền `long long`.

```cpp
int dai_nhat(const vector<int>& a, long long K) {
    int n = a.size(), l = 0, best = 0;
    long long tong = 0;
    for (int r = 0; r < n; r++) {
        tong += a[r];
        while (l <= r && tong > K) tong -= a[l++];
        best = max(best, r - l + 1);
    }
    return best;
}
```

Hàm cần thêm `<algorithm>`. Mọi đầu trái đã bỏ vì tổng quá lớn sẽ tiếp tục không hợp lệ khi thêm các số không âm sau này. Đầu trái giữ lại là nhỏ nhất còn hợp lệ cho đầu phải hiện tại, nên cho đoạn dài nhất kết thúc tại đó. Xét mọi đầu phải sẽ tìm đáp án toàn cục.

Hai vòng lặp không làm chi phí thành `O(n²)`: `r` đi qua dãy một lần, `l` cũng chỉ tăng và không quay lại. Tổng thời gian `O(n)`, bộ nhớ phụ `O(1)`.

## Điều kiện không thể bỏ qua

Nếu có số âm, quy tắc trên sai. Dãy `4, -3`, `K = 2` có cả đoạn dài 2 với tổng 1, nhưng thuật toán sẽ bỏ số 4 ngay lúc đọc phần tử đầu và không lấy lại nó khi -3 xuất hiện. Thêm phần tử âm đã làm một đoạn từng không hợp lệ trở thành hợp lệ.

Do đó, phải kiểm tra dữ kiện trước khi chọn cửa sổ thay đổi. Không áp kỹ thuật chỉ vì đề có từ “đoạn con”. Thử dãy rỗng, toàn 0, `K = 0`, phần tử đơn vượt `K` và toàn dãy thỏa điều kiện.

## Minh họa và luyện tập

[USACO Guide — Two Pointers](https://www.youtube.com/watch?v=zmadiUuUeAA).

Vẽ một dải số và hai mũi tên: ở tìm cặp, chúng tiến từ hai phía vào nhau; ở cửa sổ, chúng cùng tiến sang phải. Ghi dưới mỗi mũi tên nhóm phương án bị bỏ. Bảng trên giúp đối chiếu ý nghĩa của từng bước trước khi xem cách trình bày trong video.

- Tìm cặp có tổng bằng đích trên dãy đã sắp; thử phần tử trùng và trường hợp không có đáp án.
- Tìm tổng lớn nhất của một cửa sổ có độ dài cố định.
- Tìm đoạn dài nhất có tổng không quá ngưỡng trên dãy không âm, rồi kiểm tra bằng vét cạn cho dãy nhỏ.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao hai vòng lặp trong cửa sổ trên vẫn có tổng thời gian tuyến tính?
>
> **Trả lời:** Mỗi con trỏ chỉ tăng và đi qua mỗi vị trí tối đa một lần. Tổng số lần thêm và bỏ phần tử là `O(n)`, dù một lượt của đầu phải có thể bỏ nhiều phần tử.

> **Câu hỏi 2:** Số âm phá vỡ điều kiện nào của cửa sổ tổng không quá ngưỡng?
>
> **Trả lời:** Thêm đầu phải không còn bảo đảm tổng tăng hoặc giữ nguyên. Một đầu trái đã bỏ do tổng lớn có thể trở thành hợp lệ sau khi thêm số âm, nên việc loại bỏ ấy không còn an toàn.

## Nguồn tham khảo thêm

- [VNOI — Hai con trỏ](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/two-pointers.md)
- [USACO Guide — Two Pointers](https://usaco.guide/silver/two-pointers)
- [USACO Guide — Sliding Window](https://usaco.guide/gold/sliding-window)
