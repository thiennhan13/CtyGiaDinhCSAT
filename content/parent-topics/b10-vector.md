Khi chưa biết trước số lượng dữ liệu cần giữ lại, một mảng có kích thước cố định dễ gây lãng phí hoặc thiếu chỗ. `vector` biểu diễn một dãy có thể thay đổi số phần tử, đồng thời vẫn truy cập nhanh theo chỉ số. Bài học đặt trọng tâm vào lựa chọn thao tác phù hợp, không chỉ ghi nhớ tên hàm.

## Tư duy

- Phân biệt số phần tử đang sử dụng với sức chứa được cấp phát.
- Lựa chọn cách duyệt khi cần giá trị, vị trí hoặc sửa trực tiếp phần tử.
- Nhận biết thao tác làm các phần tử dịch chuyển và vì sao thao tác đó có chi phí lớn hơn.
- Giữ điều kiện truy cập chỉ số và kiểm tra trạng thái rỗng trước khi lấy phần tử.

## Nội dung học

- Khởi tạo `vector`, truy cập bằng chỉ số, `size()` và `empty()`.
- Thêm cuối bằng `push_back`, xóa cuối bằng `pop_back`.
- Duyệt bằng chỉ số, duyệt giá trị và duyệt tham chiếu.
- Chèn, xóa theo vị trí; phân biệt `reserve` và `resize`.

## Giữ những dữ liệu cần dùng

Cho các số `5, -2, 8, 0, 3`; cần lưu các số dương theo đúng thứ tự xuất hiện. Có thể dùng mảng ban đầu và một biến đếm số phần tử đã giữ. `vector` gói hai phần này thành một cấu trúc: thêm một số là tăng luôn độ dài dãy.

| Số đang đọc | Có giữ không? | Dãy đã giữ |
|---:|---|---|
| 5 | Có | 5 |
| -2 | Không | 5 |
| 8 | Có | 5, 8 |
| 0 | Không | 5, 8 |
| 3 | Có | 5, 8, 3 |

Đoạn mã dùng `<vector>` và `<iostream>`, với `n >= 0` là số giá trị đầu vào.

```cpp
vector<int> duong;
for (int i = 0; i < n; i++) {
    int x;
    cin >> x;
    if (x > 0) duong.push_back(x);
}

for (int x : duong) cout << x << ' ';
```

Sau khi xử lý `i` số đầu, dãy đang giữ chứa đúng những số dương trong đoạn đã đọc, theo thứ tự gốc. Đọc thêm số âm hoặc 0 không làm thay đổi dãy; đọc số dương nối đúng phần tử cần giữ vào cuối. Đây là cách giải thích tính đúng của phép lọc.

## Độ dài, sức chứa và chỉ số

`vector<int> a(5, 0)` tạo **5 phần tử** bằng 0; chỉ số hợp lệ là 0 đến 4. Trái lại, `vector<int> a; a.reserve(5);` chỉ chuẩn bị sức chứa, dãy vẫn rỗng và `a[0]` chưa hợp lệ. `resize(5)` mới đổi số phần tử thành 5.

Truy cập một chỉ số hợp lệ có thời gian `O(1)`. Thêm cuối có chi phí trung bình theo chuỗi thao tác là `O(1)` mỗi lần: một lần tăng sức chứa có thể phải sao chép toàn bộ dãy, nhưng tổng chi phí của một chuỗi `n` lần thêm cuối là `O(n)`. Đây là chi phí khấu hao, không phải lời khẳng định mọi lần thêm đều nhanh như nhau.

Khi cần sửa mỗi số đang có, dùng tham chiếu để không sửa một bản sao:

```cpp
vector<int> a = {2, 4, 6};
for (int& x : a) x += 1;
// a trở thành {3, 5, 7}.
```

Trước `back()` hoặc `pop_back()`, cần bảo đảm dãy không rỗng. `pop_back()` không trả lại giá trị bị xóa; nếu cần giá trị đó, lưu `back()` trước.

## Khi chèn và xóa làm dữ liệu dịch chuyển

Chèn vào giữa `{4, 7, 9}` để được `{4, 5, 7, 9}` buộc 7 và 9 chuyển sang phải. Xóa phần tử đầu buộc các phần tử sau chuyển sang trái. Cả hai có thể tốn `O(n)` thời gian; nếu lặp lại nhiều lần ở đầu dãy, tổng có thể thành `O(n²)`.

Một cách lọc tốt hơn xóa từng phần tử không phù hợp là xây dãy kết quả bằng `push_back`, như ví dụ đầu bài. Nếu lưu iterator, tham chiếu hoặc địa chỉ tới phần tử, không tiếp tục dùng chúng sau một thao tác có thể cấp phát lại hoặc xóa vị trí liên quan.

## Luyện tập

- Giữ lại các số chẵn, tính tổng và in theo thứ tự ban đầu.
- Tạo dãy kết quả chứa lần lượt các phần tử ở vị trí chẵn rồi vị trí lẻ.
- So sánh việc xóa nhiều phần tử ở đầu với lọc sang một dãy mới; lập bảng số phần tử phải dịch.

## Tự kiểm tra

> **Câu hỏi 1:** Sau `reserve(100)`, có thể gán `a[99]` khi dãy ban đầu rỗng không?
>
> **Trả lời:** Không. `reserve` thay sức chứa chứ không tạo phần tử. Cần `resize(100)` hoặc thêm đủ phần tử trước khi truy cập chỉ số đó.

> **Câu hỏi 2:** Vì sao lọc sang dãy mới thường tốt hơn xóa từng phần tử ở đầu?
>
> **Trả lời:** Xóa ở đầu phải dịch các phần tử sau, có thể tạo tổng chi phí bậc hai. Duyệt một lần rồi thêm cuối dãy kết quả có tổng thời gian tuyến tính.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Viblo — Sử dụng vector trong lập trình C++](https://viblo.asia/p/su-dung-vector-trong-lap-trinh-c-giai-bai-toan-lap-trinh-muon-thua-Az45bnGQ5xY)
- [cppreference — vector](https://en.cppreference.com/w/cpp/container/vector.html)
