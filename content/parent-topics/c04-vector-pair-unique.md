Khi dữ liệu đã được lưu thành một dãy, bước tiếp theo là tổ chức dãy sao cho thao tác phía sau trở nên đơn giản: ghép thông tin liên quan, sắp theo khóa và loại các bản ghi trùng. Bài này nối `vector`, `pair` với `unique`, đặc biệt làm rõ sự khác nhau giữa “loại trùng kề nhau” và “giữ mỗi giá trị một lần”.

## Tư duy

- Tạo thứ tự phù hợp để những phần tử cần xử lý cùng nhau nằm gần nhau.
- Phân biệt phần dữ liệu còn ý nghĩa với kích thước vật lý của vùng lưu trữ.
- Chọn quy tắc xem hai bản ghi là trùng nhau dựa vào yêu cầu, không chỉ dựa vào hình thức.
- Tính cả chi phí tổ chức dữ liệu trước bước xử lý chính.

## Nội dung học

- Lưu dãy giá trị hoặc cặp thông tin trong `vector`.
- Sắp xếp cặp theo thứ tự từ điển và giữ các trường cùng một bản ghi.
- `unique` gom những giá trị bằng nhau liên tiếp, trả ranh giới mới.
- Kết hợp `sort`, `unique`, `erase` để loại trùng trên toàn dãy.

## Tại sao dữ liệu cần được sắp trước?

Cho dãy `4, 2, 4, 4, 1, 2`. Muốn giữ mỗi giá trị một lần, cách trực tiếp là kiểm tra một số đã xuất hiện trong kết quả hay chưa. Nếu kiểm tra bằng duyệt tuyến tính, tổng chi phí có thể là `O(n²)`.

Những số bằng nhau sẽ ở cạnh nhau nếu dãy được sắp. Sau đó, chỉ cần so số đang xét với số cuối vừa giữ, thay vì tìm trong toàn bộ kết quả.

| Bước | Phần dữ liệu có ý nghĩa |
|---|---|
| Dữ liệu gốc | 4, 2, 4, 4, 1, 2 |
| Sắp tăng | 1, 2, 2, 4, 4, 4 |
| Gom trùng kề | 1, 2, 4; phía sau không dùng |
| Xóa phần đuôi | Dãy có đúng 3 phần tử: 1, 2, 4 |

Nếu gọi `unique` ngay trên dữ liệu gốc, chỉ cặp 4, 4 kề nhau được gom; các số 4 và 2 cách nhau vẫn có thể xuất hiện nhiều lần. Tên hàm không có nghĩa tự động tìm mọi giá trị trùng trên toàn dãy.

## Ranh giới mới không tự đổi kích thước

Đoạn mã dùng `<vector>` và `<algorithm>`.

```cpp
vector<int> a = {4, 2, 4, 4, 1, 2};
sort(a.begin(), a.end());
auto cuoi = unique(a.begin(), a.end());
a.erase(cuoi, a.end());
// a = {1, 2, 4}; a.size() = 3.
```

`unique` ghi những phần tử còn giữ vào đầu dãy, trả iterator ngay sau phần có ý nghĩa. Nó không giảm `size()`; các ô phía sau vẫn tồn tại nhưng giá trị không phải một kết quả cần dựa vào. `erase` xóa phần đuôi và hoàn tất việc đổi kích thước.

Có thể tự mô phỏng bước gom trùng: giữ phần tử đầu; mỗi số sau chỉ được giữ nếu khác phần tử cuối đã giữ. Vì các số bằng nhau đứng thành từng nhóm sau sắp xếp, mỗi nhóm được giữ đúng một đại diện. Không nhóm nào bị bỏ và cũng không nhóm nào cho hai đại diện.

## Khi phần tử là một cặp

Các điểm `(2, 3), (1, 4), (2, 3), (1, 2)` có thể lưu bằng `vector<pair<int, int>>`. Sắp mặc định xét tọa độ thứ nhất rồi thứ hai; sau `unique` và `erase`, dãy còn `(1, 2), (1, 4), (2, 3)`.

```cpp
vector<pair<int, int>> diem = {{2, 3}, {1, 4}, {2, 3}, {1, 2}};
sort(diem.begin(), diem.end());
diem.erase(unique(diem.begin(), diem.end()), diem.end());
```

Đoạn này dùng thêm `<utility>`. Hai điểm chỉ trùng khi **cả hai tọa độ** bằng nhau. Nếu chỉ muốn giữ một điểm cho mỗi hoành độ, yêu cầu đã khác: phải quy định điểm nào đại diện và cách nhóm theo hoành độ. Không được xóa tùy ý một bản ghi có thông tin thứ hai khác mà chưa xem mục tiêu bài toán.

## Chi phí và giới hạn

Sắp `n` số cần `O(n log n)` phép so sánh; gom trùng và xóa đuôi dùng `O(n)`. Tổng là `O(n log n)`, trong khi bước riêng `unique` chỉ tuyến tính. Dãy đã sắp từ trước không cần sắp lại nếu thứ tự đó phù hợp với quy tắc trùng.

Chuỗi thao tác này **đổi thứ tự gốc** và bỏ số lần xuất hiện của từng giá trị. Nếu cần số lượng, hãy đếm độ dài từng nhóm trước khi xóa; nếu cần giữ thứ tự xuất hiện đầu tiên, phải dùng mô hình khác. Loại trùng cũng không phù hợp khi từng lần xuất hiện mang ý nghĩa riêng, chẳng hạn mỗi bản ghi là một lượt tham gia.

Thử dãy rỗng, một phần tử, toàn phần tử giống nhau và không có phần tử trùng. Luôn dùng ranh giới do `unique` trả về, không đoán rằng nó nằm ở vị trí nào trước khi xử lý.

## Luyện tập

- Tạo danh sách các giá trị phân biệt theo thứ tự tăng.
- Loại điểm tọa độ trùng và đếm số điểm còn lại.
- Sắp danh sách giá trị kèm vị trí gốc; giải thích những thông tin nào vẫn còn và những thông tin nào bị mất khi loại trùng.

## Tự kiểm tra

> **Câu hỏi 1:** Sau khi gọi `unique`, vì sao vẫn phải xử lý phần đuôi?
>
> **Trả lời:** Hàm chỉ dồn kết quả hợp lệ vào đầu và trả ranh giới mới, không thay kích thước container. Phần đuôi còn tồn tại nhưng không thuộc kết quả; `erase` loại phần đó.

> **Câu hỏi 2:** `sort` rồi `unique` có giữ lần xuất hiện đầu tiên theo thứ tự nhập không?
>
> **Trả lời:** Không bảo đảm mục tiêu ấy. Sắp xếp đã đổi thứ tự, còn loại trùng chỉ giữ một đại diện trong nhóm theo thứ tự đã sắp; muốn bảo toàn thứ tự nhập cần một cách tổ chức riêng.

## Nguồn tham khảo thêm

- [Viblo Algorithm — STL và các tiện ích cơ bản](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-1-gioi-thieu-cac-thanh-phan-cua-stl-c-va-cac-tien-ich-co-ban-GrLZDr6n5k0)
- [USACO Guide — Introduction to Sorting](https://usaco.guide/bronze/intro-sorting)
- [cppreference — unique](https://en.cppreference.com/w/cpp/algorithm/unique.html)
