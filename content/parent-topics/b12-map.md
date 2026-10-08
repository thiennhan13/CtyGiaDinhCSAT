Một bảng thống kê có thể dùng tên làm khóa: mỗi tên ứng với số lần xuất hiện hoặc một giá trị được cập nhật. Mảng thông thường thuận tiện khi khóa là số nguyên nhỏ; với tên hoặc mã rất lớn, `map` cho phép lưu trực tiếp những khóa thực sự có mặt.

## Tư duy

- Xác định khóa dùng để nhận diện một mục và giá trị cần gắn với mục đó.
- So sánh miền khóa có thể có với số khóa thực tế được sử dụng.
- Phân biệt truy vấn chỉ đọc với thao tác có thể tạo thêm khóa mới.
- Khai thác thứ tự khóa khi cần xuất thống kê hoặc tìm ranh giới.

## Nội dung học

- Khai báo `map<Key, Value>` và tính duy nhất của khóa.
- Gán, tăng giá trị bằng `operator[]`; tìm bằng `find`.
- Duyệt các cặp khóa–giá trị, `size`, `empty` và `erase`.
- Chi phí thao tác theo số khóa phân biệt; lựa chọn giữa mảng đếm và `map`.

## Lưu những khóa thật sự xuất hiện

Cho các tên `An, Binh, An, Chi, Binh, An`; cần đếm số lần của mỗi tên. Cách trực tiếp có thể giữ danh sách tên đã gặp, rồi mỗi lần đọc một tên lại tìm tuyến tính trong danh sách. Nếu gần như mọi tên khác nhau, số lần so sánh tăng theo `1 + 2 + ... + n`, tức bậc hai.

`map<string, int>` giữ một mục cho mỗi tên. Tên là khóa; số lần gặp là giá trị. Một lần cập nhật đi tìm đúng mục theo khóa, không phải duyệt toàn bộ danh sách thống kê.

| Sau khi đọc | An | Binh | Chi |
|---|---:|---:|---:|
| An | 1 | Chưa có | Chưa có |
| Binh | 1 | 1 | Chưa có |
| An | 2 | 1 | Chưa có |
| Chi | 2 | 1 | 1 |
| Binh, An | 3 | 2 | 1 |

Đoạn mã dùng `<map>`, `<string>`, `<iostream>`, với `n` là số tên nhập bằng các từ không có khoảng trắng.

```cpp
map<string, int> dem;
for (int i = 0; i < n; i++) {
    string ten;
    cin >> ten;
    dem[ten]++;
}

for (const auto& muc : dem) {
    cout << muc.first << ' ' << muc.second << '\n';
}
```

Sau mỗi lần đọc, đúng một khóa được tăng thêm 1. Khóa chưa có được tạo với giá trị `int` ban đầu bằng 0. Bởi vậy, sau `n` lần cập nhật, mỗi mục chứa chính xác số lần tên ấy xuất hiện.

## Đọc một khóa có thể làm bảng thay đổi

`dem["Dung"]` tạo mục Dung với giá trị 0 nếu khóa chưa có, ngay cả khi ta chỉ muốn đọc. Điều này làm `size()` tăng và có thể ảnh hưởng một phép đếm số tên phân biệt.

Khi chỉ kiểm tra hoặc đọc một khóa, dùng `find`:

```cpp
auto it = dem.find("Dung");
if (it == dem.end()) cout << "Chua co\n";
else cout << it->second << '\n';
```

Không được đọc `it->second` nếu `it == dem.end()`. Duyệt `map` đi theo thứ tự khóa, nên thống kê trên được xuất thành An, Binh, Chi, không phải thứ tự những người xuất hiện lần đầu. Bài yêu cầu thứ tự lần đầu cần lưu thứ tự ấy riêng.

## Chi phí và lựa chọn cấu trúc

Với `k` khóa đang lưu, tìm, thêm, cập nhật hoặc xóa theo khóa có số phép so sánh `O(log(k + 1))`; bộ nhớ `O(k)`. Nếu khóa là xâu, mỗi phép so sánh còn đọc những ký tự cần thiết, nên không thể bỏ qua độ dài xâu trong đánh giá chi tiết.

Nếu khóa là điểm nguyên từ 0 đến 10, mảng đếm 11 ô đơn giản hơn và cập nhật `O(1)`. Nếu khóa là mã có thể đến hàng tỷ nhưng chỉ vài nghìn mã xuất hiện, cấp phát mảng cho toàn bộ miền rất lãng phí; `map` phù hợp hơn. `map` không phải bảng băm: nó giữ thứ tự khóa và không có cam kết thao tác `O(1)`.

Tên có dấu và tên chứa khoảng trắng cần một quy ước nhập, chuẩn hóa rõ ràng. Trong bài ví dụ chỉ dùng tên không dấu để tập trung mô hình khóa–giá trị; không được suy rằng hai cách viết khác nhau luôn chỉ cùng một người.

## Luyện tập

- Thống kê số lần của mỗi từ trong một văn bản đã tách từ.
- Lưu tổng số lượng theo mã mặt hàng và xuất theo mã tăng.
- So sánh `find` với `operator[]` khi kiểm tra một khóa không tồn tại.

## Tự kiểm tra

> **Câu hỏi 1:** Khi nào `map` có lợi hơn một mảng thống kê?
>
> **Trả lời:** Khi miền khóa lớn hoặc khóa không tiện dùng làm chỉ số, nhưng số khóa thực tế ít. `map` chỉ lưu các mục cần thiết và hỗ trợ tìm theo khóa.

> **Câu hỏi 2:** Vì sao dùng `operator[]` để hỏi khóa có tồn tại có thể cho kết quả thống kê sai?
>
> **Trả lời:** Nếu khóa thiếu, toán tử ấy thêm khóa mới với giá trị mặc định. Việc chỉ đọc đã làm thay đổi số mục; nên dùng `find` cho truy vấn không muốn thêm dữ liệu.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Sets & Maps](https://usaco.guide/bronze/intro-sets)
- [Viblo Algorithm — Map và Dictionary](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-3-anh-xa-mapdictionary-aWj53mbPZ6m)
- [cppreference — map](https://en.cppreference.com/w/cpp/container/map.html)
