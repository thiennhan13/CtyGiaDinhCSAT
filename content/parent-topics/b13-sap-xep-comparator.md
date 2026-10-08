Sắp xếp làm lộ ra những quan hệ khó thấy trong dữ liệu lộn xộn: các giá trị bằng nhau đứng cạnh nhau, phần tử nhỏ nằm trước phần tử lớn, một ranh giới có thể được tìm nhanh. Học sinh cần hiểu quy tắc thứ tự và cách xây quy tắc ấy, đồng thời biết lựa chọn giữa thuật toán tự cài và hàm thư viện.

## Tư duy

- Diễn đạt rõ “đứng trước” theo yêu cầu của bài toán, kể cả khi các trường bằng nhau.
- Duy trì một phần của dãy đã được sắp đúng và mở rộng phần ấy sau mỗi lượt.
- Nhận biết dữ liệu cần giữ vị trí gốc trước khi đổi thứ tự.
- Kiểm tra tính nhất quán của comparator thay vì chỉ nhìn vài kết quả đầu ra.

## Nội dung học

- Sắp xếp chọn và sắp xếp chèn; phân tích thao tác trên ví dụ nhỏ.
- Hàm `sort` và phạm vi nửa mở `[begin, end)`.
- Comparator cho một hoặc nhiều trường; quan hệ nghiêm ngặt.
- So sánh thời gian bậc hai với `O(n log n)` phép so sánh và nhận biết hòa khóa.

## Chọn phần tử nhỏ nhất còn lại

Cho dãy `6, 2, 5, 2`. Ở lượt đầu, tìm số nhỏ nhất rồi đổi nó về vị trí đầu. Ở lượt tiếp theo, chỉ tìm trong phần chưa được xử lý. Đây là sắp xếp chọn.

| Sau lượt | Phần đã cố định | Dãy hiện tại |
|---:|---|---|
| 0 | Chưa có | 6, 2, 5, 2 |
| 1 | Vị trí 0 | 2, 6, 5, 2 |
| 2 | Vị trí 0–1 | 2, 2, 5, 6 |
| 3 | Vị trí 0–2 | 2, 2, 5, 6 |

Mỗi lượt đặt phần tử nhỏ nhất của phần còn lại vào đúng vị trí. Những phần tử đã cố định không lớn hơn các phần tử còn lại, nên mở rộng một vị trí vẫn giữ đúng thứ tự.

Đoạn mã dùng `<vector>` và `<algorithm>`, giả sử số phần tử vừa miền `int`.

```cpp
void sap_xep_chon(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        int p = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[p]) p = j;
        }
        swap(a[i], a[p]);
    }
}
```

Sắp xếp chèn có cách tổ chức khác: giữ đoạn đầu đã tăng, lấy phần tử tiếp theo và dịch các phần tử lớn hơn sang phải để chèn nó vào đúng chỗ. Với dãy đã tăng, sắp xếp chèn chỉ cần kiểm tra nhanh mỗi phần tử; nhưng trong trường hợp xấu nhất vẫn phải dịch `O(n²)` phần tử. Cả hai thuật toán giúp hiểu thao tác, nhưng dữ liệu lớn thường cần `sort`.

```cpp
void sap_xep_chen(vector<int>& a) {
    int n = a.size();
    for (int i = 1; i < n; i++) {
        int x = a[i], j = i - 1;
        while (j >= 0 && a[j] > x) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = x;
    }
}
```

Hàm dùng `<vector>`, với độ dài vừa miền `int`. Chỉ các phần tử lớn hơn `x` được dịch, nên lúc vòng `while` dừng, `j + 1` chính là vị trí chèn giữa phần không lớn hơn `x` và phần lớn hơn `x`. Đoạn đã sắp tăng được mở rộng thêm một phần tử. Trong điều kiện `j >= 0 && a[j] > x`, kiểm tra cận trước giúp không đọc `a[-1]`.

## Xếp nhiều trường bằng một quy tắc

Giả sử xếp học sinh theo điểm giảm; hòa điểm thì mã tăng. Chỉ đảo toàn bộ kết quả sắp tăng sẽ làm mã cũng giảm, sai yêu cầu. Ta cần nêu hai mức ưu tiên riêng.

```cpp
struct HocSinh {
    int diem;
    int ma;
};

bool truoc(const HocSinh& a, const HocSinh& b) {
    if (a.diem != b.diem) return a.diem > b.diem;
    return a.ma < b.ma;
}

// ds là vector<HocSinh>; cần <vector> và <algorithm>.
// sort(ds.begin(), ds.end(), truoc);
```

Các bản ghi `(8, 3), (9, 2), (8, 1)` được xếp thành `(9, 2), (8, 1), (8, 3)`. Comparator trả `true` nghĩa là bản ghi thứ nhất phải đứng trước bản ghi thứ hai.

### Vì sao không dùng `<=`?

Một phần tử không được đứng trước chính nó: `truoc(a, a)` phải sai. Các quan hệ cũng phải nhất quán theo thứ tự, tránh vòng “A trước B, B trước C nhưng C trước A”. Dùng `<=` cho trường cuối làm hai bản ghi giống nhau đều đứng trước nhau, vi phạm yêu cầu của hàm sắp xếp.

`sort` không bảo đảm giữ thứ tự ban đầu giữa các bản ghi tương đương theo comparator. Nếu đề cần thứ tự gốc trong nhóm hòa, đưa vị trí gốc vào quy tắc hoặc dùng `stable_sort` theo đúng mục tiêu. Không tự thêm tiêu chí hòa điểm nếu đề đã quy định khác.

## Chi phí và luyện tập

Sắp xếp chọn luôn dùng `O(n²)` phép so sánh và `O(1)` bộ nhớ phụ. `sort` dùng `O(n log n)` phép so sánh; chi phí thực tế còn phụ thuộc comparator. Với khóa xâu, so sánh có thể đọc nhiều ký tự. Thử dãy rỗng, một phần tử, đã tăng, giảm và toàn giá trị bằng nhau.

- Tự truy vết sắp xếp chèn trên `4, 1, 3, 2`.
- Xếp các đoạn theo đầu trái tăng, hòa đầu trái thì đầu phải giảm.
- Giữ vị trí gốc, sắp giá trị và khôi phục kết quả theo thứ tự nhập.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao comparator dùng `a.diem >= b.diem` không hợp lệ?
>
> **Trả lời:** Khi hai điểm bằng nhau, nó trả đúng cả khi so một phần tử với chính nó. Comparator phải mô tả thứ tự nghiêm ngặt và trả sai cho hai khóa tương đương.

> **Câu hỏi 2:** Sau sắp xếp, làm thế nào giữ được vị trí ban đầu của các giá trị trùng nhau?
>
> **Trả lời:** Ghép mỗi giá trị với vị trí gốc trước khi sắp. Hai trường đi cùng một bản ghi, nên vẫn truy được nguồn gốc dù thứ tự đã đổi.

## Nguồn tham khảo thêm

- [VNOI — Thuật toán sắp xếp](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/basic/sorting-new.md)
- [USACO Guide — Introduction to Sorting](https://usaco.guide/bronze/intro-sorting)
- [Viblo Algorithm — STL và các tiện ích cơ bản](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-1-gioi-thieu-cac-thanh-phan-cua-stl-c-va-cac-tien-ich-co-ban-GrLZDr6n5k0)
