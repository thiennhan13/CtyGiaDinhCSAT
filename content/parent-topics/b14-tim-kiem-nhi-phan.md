Trên một dãy đã được sắp xếp, một phép so sánh có thể loại bỏ cả một nhóm vị trí không cần xét. Tìm kiếm nhị phân khai thác điều đó bằng cách liên tục thu hẹp phạm vi còn có khả năng chứa giá trị cần tìm. Bài học đi từ tìm một phần tử đến xác định ranh giới của các giá trị bằng nhau bằng `lower_bound` và `upper_bound`.

## Tư duy

- Khai thác thứ tự của dữ liệu để giải thích vì sao có thể bỏ nửa trái hoặc nửa phải.
- Duy trì một phạm vi tìm kiếm có ý nghĩa: nếu giá trị tồn tại nhưng chưa được tìm thấy, nó vẫn nằm trong phạm vi còn xét.
- Phân biệt ba yêu cầu: tìm một vị trí, tìm vị trí đầu tiên không nhỏ hơn một giá trị và tìm vị trí đầu tiên lớn hơn giá trị đó.
- Kiểm tra trường hợp không tìm thấy, phần tử trùng nhau và các vị trí biên; không đọc dữ liệu ở vị trí ngoài dãy.

## Nội dung học

- Tìm kiếm nhị phân trên dãy sắp tăng: hai cận `lo`, `hi`, vị trí giữa `mid` và cách cập nhật phạm vi.
- Điều kiện kết thúc `lo > hi`, giá trị trả về khi không tìm thấy và giới hạn của việc tìm một vị trí bất kỳ.
- Hàm `lower_bound`, `upper_bound` trong `<algorithm>`; chuyển iterator sang chỉ số và nhận biết `end()`.
- Tính số lần xuất hiện của một giá trị bằng khoảng giữa hai ranh giới.
- So sánh chi phí tìm kiếm tuyến tính với tìm kiếm nhị phân, tính cả bước sắp xếp nếu dữ liệu chưa có thứ tự.

## Một ví dụ có thể kiểm tra bằng tay

Cho dãy sắp tăng `2, 4, 4, 7, 10, 13`. Ta đánh số vị trí từ 0 đến 5 và cần tìm số 7.

| Lượt | `lo` | `hi` | `mid` | Giá trị ở giữa | Quyết định |
|---|---:|---:|---:|---:|---|
| 1 | 0 | 5 | 2 | 4 | 7 lớn hơn 4; chuyển `lo` thành 3 |
| 2 | 3 | 5 | 4 | 10 | 7 nhỏ hơn 10; chuyển `hi` thành 3 |
| 3 | 3 | 3 | 3 | 7 | Tìm thấy ở vị trí 3 |

Ở lượt đầu, các vị trí 0, 1, 2 đều có giá trị không lớn hơn 4. Do đó, không vị trí nào trong nhóm này có thể chứa số 7. Việc bỏ cả nhóm dựa vào **thứ tự đã biết**, không dựa vào đoán vị trí của số cần tìm.

Nếu dãy chưa được sắp xếp, nhận xét ấy không còn đúng. Sắp xếp trước khi tìm cũng có thể làm thay đổi vị trí gốc của các phần tử; bài toán yêu cầu vị trí trong dữ liệu ban đầu cần giữ thông tin vị trí riêng.

## Cài đặt và giải thích phạm vi

Hàm C++ dưới đây dùng `vector<int>` từ `<vector>`, trả về một chỉ số chứa `x` hoặc `-1` nếu không có. Giả sử số phần tử không vượt giới hạn của `int` và dãy đã sắp tăng.

```cpp
int tim_kiem(const vector<int>& a, int x) {
    int n = a.size();
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

Khi giá trị ở giữa nhỏ hơn `x`, ta bỏ cả `mid` vì đã biết vị trí này không phù hợp; cận mới phải là `mid + 1`. Tương tự, nếu lớn hơn `x`, cận phải mới là `mid - 1`. Giữ nguyên `mid` trong phạm vi có thể khiến thuật toán không thu hẹp được ở những trường hợp nhỏ.

Biểu thức `lo + (hi - lo) / 2` tránh cộng trực tiếp hai cận lớn. Với dãy rỗng, `hi = -1`, điều kiện vòng lặp sai ngay và hàm trả về `-1` mà không truy cập phần tử nào.

### Vì sao tìm kiếm đúng và sẽ dừng?

Ban đầu, phạm vi bao gồm toàn bộ dãy. Mỗi lần không tìm thấy ở giữa, tính sắp xếp cho phép loại bỏ một phía chắc chắn không chứa `x`; phần còn lại vẫn giữ mọi vị trí có khả năng phù hợp. Phạm vi giảm sau mỗi lượt, nên cuối cùng hoặc tìm thấy, hoặc trở thành rỗng. Phạm vi rỗng nghĩa là không còn vị trí nào có thể chứa `x`.

Hàm này không bảo đảm trả về **lần xuất hiện đầu tiên**. Với nhiều phần tử bằng `x`, nó có thể gặp bất kỳ phần tử nào trong số đó. Đây là lý do cần học thêm hai hàm xác định ranh giới.

## Tìm ranh giới bằng thư viện

Với dãy sắp tăng, `lower_bound` trả về vị trí đầu tiên có giá trị **lớn hơn hoặc bằng** `x`; `upper_bound` trả về vị trí đầu tiên có giá trị **lớn hơn** `x`. Nếu không có vị trí phù hợp, kết quả là iterator `end()` ngay sau phần tử cuối.

```cpp
vector<int> a = {2, 4, 4, 7, 10, 13};
int x = 4;
auto dau = lower_bound(a.begin(), a.end(), x);
auto sau = upper_bound(a.begin(), a.end(), x);
auto so_lan = sau - dau;
bool co_mat = dau != a.end() && *dau == x;
```

Đoạn mã cần `<vector>` và `<algorithm>`. `dau` ở vị trí 1; `sau` ở vị trí 3. Các phần tử bằng 4 nằm trong đoạn nửa mở `[1, 3)`, gồm vị trí 1 và 2, nên `so_lan = 2`.

Điều kiện `dau != a.end()` phải được kiểm tra trước khi đọc `*dau`. Toán tử `&&` chỉ xét vế sau khi vế trước đúng, vì vậy cách viết trên an toàn cả khi dãy rỗng hoặc `x` lớn hơn mọi phần tử.

Nếu tìm số 6, hai ranh giới đều ở vị trí 3 và số lần xuất hiện bằng 0. Giá trị tại vị trí đó là 7: `lower_bound` tìm ranh giới chèn, không tự xác nhận số 6 có mặt.

## Chi phí và trường hợp biên

Tìm kiếm nhị phân có thời gian `O(log n)` với dãy không rỗng và bộ nhớ phụ `O(1)`. Các hàm ranh giới trên `vector` cũng có thời gian `O(log n)`. Nếu có `q` truy vấn và phải sắp xếp trước, tổng chi phí gồm `O(n log n)` cho sắp xếp và `O(q log n)` cho tìm kiếm.

Với chỉ một truy vấn trên dãy chưa sắp xếp, duyệt tuyến tính `O(n)` có thể phù hợp hơn việc sắp xếp cả dãy. Lựa chọn thuật toán cần dựa vào dữ liệu, số truy vấn và yêu cầu giữ thứ tự, không chỉ vào tốc độ của một thao tác tìm kiếm sau khi đã sắp.

Nên thử dãy rỗng, dãy một phần tử, số cần tìm ở đầu/cuối, số không có trong dãy và dãy toàn các phần tử bằng nhau. Dùng dãy nhỏ để kiểm tra rằng mỗi lần cập nhật đều loại bỏ ít nhất vị trí vừa xét.

## Thực hành

- Tìm số 10, 6 và 20 trong dãy ví dụ; lập bảng `lo`, `hi`, `mid` cho từng lượt.
- Đếm số lần xuất hiện của một giá trị trong dãy có phần tử trùng nhau bằng hai ranh giới.
- Tìm phần tử đầu tiên không nhỏ hơn một ngưỡng; giải thích kết quả khi ngưỡng vượt phần tử cuối.

Chủ đề này tập trung tìm kiếm trên dãy đã sắp. Việc tìm một đáp án tối ưu bằng hàm kiểm tra khả thi thuộc C11, nơi điều kiện áp dụng được giải thích riêng.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao có thể bỏ mọi vị trí bên trái khi phần tử giữa nhỏ hơn số cần tìm?
>
> **Trả lời:** Dãy đã sắp tăng nên mọi phần tử bên trái không lớn hơn phần tử giữa. Chúng đều nhỏ hơn số cần tìm và không thể là đáp án.

> **Câu hỏi 2:** Khi `lower_bound` chỉ đến số 7 lúc đang tìm số 6, số 6 có tồn tại không?
>
> **Trả lời:** Chưa thể kết luận có. Hàm trả ranh giới đầu tiên có giá trị không nhỏ hơn 6; phải kiểm tra iterator chưa ở cuối và giá trị đúng bằng 6. Ở trường hợp này, 6 không tồn tại.

## Nguồn tham khảo thêm

- [VNOI — Tìm kiếm nhị phân](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/binary-search.md)
- [USACO Guide — Binary Search](https://usaco.guide/silver/binary-search)
- [Viblo Algorithm — Giới thiệu tìm kiếm nhị phân](https://viblo.asia/p/gioi-thieu-thuat-toan-tim-kiem-nhi-phan-maGK7BjB5j2)
