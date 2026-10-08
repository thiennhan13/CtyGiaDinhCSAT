Một bản ghi thường có nhiều thông tin liên quan: tên và điểm, thời điểm bắt đầu và kết thúc, giá trị và vị trí gốc. Khi lưu mỗi trường vào một mảng riêng, một thao tác sắp xếp sai có thể làm các thông tin mất liên hệ. `pair` và `struct` giúp giữ những trường ấy trong cùng một phần tử.

## Tư duy

- Nhận diện các trường cùng mô tả một đối tượng và cần đi cùng nhau.
- Phân biệt thứ tự của bản ghi với ý nghĩa của từng trường trong bản ghi.
- Dùng tên trường để làm rõ dữ liệu thay vì dựa vào các chỉ số khó nhớ.
- Giữ vị trí gốc khi biến đổi thứ tự của dãy dữ liệu.

## Nội dung học

- `pair`, hai trường `first`, `second` và khởi tạo cặp giá trị.
- `struct` với các trường có tên và kiểu dữ liệu riêng.
- Lưu dãy bản ghi trong `vector`, duyệt và truy cập trường.
- So sánh cặp theo thứ tự từ trường đầu đến trường sau; lưu thông tin phụ để truy vết.

## Một giá trị không đứng một mình

Cho dãy `9, 4, 9, 2`, cần sắp tăng các giá trị nhưng vẫn biết mỗi giá trị đến từ vị trí nào. Nếu chỉ sắp xếp dãy số, ta được `2, 4, 9, 9` và mất thông tin vị trí. Cách trực tiếp là tìm lại từng số trong dãy gốc, nhưng số trùng khiến việc ghép vị trí phức tạp và có thể phải duyệt lại nhiều lần.

Hãy ghép mỗi giá trị với vị trí ngay từ đầu:

| Bản ghi ban đầu `(giá trị, vị trí)` | Thứ tự sau sắp xếp |
|---|---|
| (9, 1) | (2, 4) |
| (4, 2) | (4, 2) |
| (9, 3) | (9, 1) |
| (2, 4) | (9, 3) |

Khi di chuyển một cặp, hai trường vẫn đi cùng nhau. Mỗi bản ghi sau sắp xếp vì thế giữ đúng nguồn gốc của giá trị, kể cả khi có nhiều giá trị bằng nhau.

Đoạn mã dùng `<vector>`, `<utility>`, `<algorithm>`, `<iostream>`; `a` là dãy đầu vào và số phần tử vừa miền `int`.

```cpp
vector<pair<int, int>> ds;
int n = a.size();
for (int i = 0; i < n; i++) ds.push_back({a[i], i + 1});

sort(ds.begin(), ds.end());
for (auto p : ds) cout << p.first << ' ' << p.second << '\n';
```

`pair` được so sánh theo thứ tự từ điển: xét `first` trước, nếu bằng nhau thì xét `second`. Ở ví dụ này, các số 9 bằng nhau được xếp theo vị trí tăng. Nếu yêu cầu thứ tự khác, cần comparator phù hợp, học ở B13.

## Khi tên trường làm bài toán dễ đọc hơn

Với một học sinh có tên, điểm và mã, cặp hai giá trị không đủ diễn đạt tự nhiên. `struct` cho phép đặt tên theo vai trò của từng trường. Đoạn dưới dùng `<string>` và `<vector>`.

```cpp
struct HocSinh {
    string ten;
    int diem;
    int ma;
};

vector<HocSinh> ds = {
    {"An", 8, 1},
    {"Binh", 9, 2},
    {"Chi", 8, 3}
};

int tong = 0;
for (const HocSinh& hs : ds) tong += hs.diem;
// tong = 25.
```

`hs.diem` nói rõ thông tin đang sử dụng. `const` bảo đảm vòng duyệt không sửa bản ghi; tham chiếu tránh sao chép tên học sinh ở mỗi lượt. Không cần tạo một kiểu dữ liệu phức tạp hơn mức bài toán yêu cầu: hai trường ngắn gọn có thể dùng `pair`, nhiều trường có ý nghĩa riêng nên ưu tiên `struct`.

## Chi phí và lỗi cần tránh

Truy cập trường của một bản ghi có thời gian `O(1)`. Lưu `n` bản ghi cần bộ nhớ theo số bản ghi và dữ liệu trong mỗi trường. Sắp xếp `n` cặp số dùng `O(n log n)` phép so sánh; nếu trường là xâu, chi phí so sánh còn phụ thuộc độ dài phần xâu cần đọc.

Tránh đổi nhầm ý nghĩa `first`, `second` giữa lúc nhập và lúc xử lý. Không sắp riêng một mảng điểm rồi để nguyên mảng tên. Không cho rằng thứ tự từ điển mặc định của `pair` luôn đúng với đề: xếp điểm giảm nhưng mã tăng là một quy tắc khác.

## Luyện tập

- Lưu tọa độ hai chiều và in các điểm có hoành độ dương.
- Ghép giá trị với chỉ số gốc để tìm hai phần tử có cùng giá trị.
- Dùng bản ghi tên–điểm–mã để xác định học sinh có điểm cao nhất, xử lý rõ trường hợp hòa điểm.

## Tự kiểm tra

> **Câu hỏi 1:** Ghép giá trị với vị trí gốc giải quyết vấn đề gì khi sắp xếp?
>
> **Trả lời:** Giá trị và nguồn gốc được di chuyển cùng một bản ghi. Sau khi đổi thứ tự, ta vẫn truy ra đúng vị trí ban đầu, kể cả khi các giá trị trùng nhau.

> **Câu hỏi 2:** Vì sao nên dùng `struct` cho bản ghi nhiều trường có ý nghĩa khác nhau?
>
> **Trả lời:** Tên trường thể hiện vai trò của dữ liệu và kiểu riêng của từng trường; việc đọc, sửa và kiểm tra thuật toán ít phụ thuộc vào những vị trí khó nhớ.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [USACO Guide — Introduction to Sorting](https://usaco.guide/bronze/intro-sorting)
- [Viblo Algorithm — STL và các tiện ích cơ bản](https://viblo.asia/p/bai-15-thu-vien-stl-c-phan-1-gioi-thieu-cac-thanh-phan-cua-stl-c-va-cac-tien-ich-co-ban-GrLZDr6n5k0)
