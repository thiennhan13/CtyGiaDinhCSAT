Một dãy dài có thể khó sắp xếp trực tiếp, nhưng ghép hai dãy đã sắp xếp lại khá đơn giản. Merge sort khai thác đúng sự khác biệt ấy: chia dãy thành các phần nhỏ, giải từng phần, rồi ghép lời giải. Qua bài này, học sinh phân biệt chia để trị với đệ quy có nhớ và biết phân tích tổng công việc qua các tầng.

## Tư duy

- Tìm cách chia bài toán sao cho lời giải của các phần nhỏ có thể kết hợp được.
- Thiết kế bước ghép trước, rồi xác định thông tin mỗi bài toán con phải cung cấp.
- Theo dõi khoảng chỉ số nhất quán để không bỏ hoặc xử lý hai lần một phần tử.
- Phân tích chi phí của cả bước chia, giải và ghép; không đánh đồng mọi đệ quy với cấp số nhân.

## Nội dung học

- Chia để trị: chia nhỏ, giải độc lập và tổng hợp kết quả.
- Merge sort trên khoảng nửa mở `[l, r)` và trường hợp đoạn có dưới hai phần tử.
- Hai con trỏ để trộn dãy đã tăng dần; xử lý phần còn dư.
- Tính ổn định, bộ nhớ phụ và độ phức tạp `O(n log n)`.

## Từ ghép hai dãy đến sắp xếp cả dãy

Cho hai dãy tăng `1, 5, 8` và `2, 3, 9`. Ta không cần thử mọi thứ tự: phần tử nhỏ nhất chưa lấy chắc chắn đứng đầu một trong hai dãy. Lấy phần tử nhỏ hơn, dịch con trỏ tương ứng và lặp lại. Kết quả lần lượt là `1, 2, 3, 5, 8, 9`.

Với dãy chưa sắp xếp `8, 1, 5, 3, 9, 2`, quá trình có thể biểu diễn:

```diagram
[8, 1, 5, 3, 9, 2]
        chia
[8, 1, 5]      [3, 9, 2]
    giải từng nửa
[1, 5, 8]      [2, 3, 9]
        trộn
[1, 2, 3, 5, 8, 9]
```

Dãy một phần tử đã được sắp xếp; đó là điểm dừng. Phép chia chỉ hữu ích vì ta có bước trộn tuyến tính, không phải vì việc gọi hàm nhìn gọn hơn.

## Cài đặt bằng một vùng đệm dùng chung

Mã nhận vector a và vùng đệm tmp cùng kích thước. Gọi `mergeSort(a, tmp, 0, a.size())`; kích thước phải vừa `int`. Khoảng `[l, r)` gồm l nhưng không gồm r.

```cpp
#include <vector>

void mergeSort(vector<int>& a, vector<int>& tmp, int l, int r) {
    if (r - l < 2) {
        return;
    }

    int mid = l + (r - l) / 2;
    mergeSort(a, tmp, l, mid);
    mergeSort(a, tmp, mid, r);

    int i = l, j = mid, k = l;
    while (i < mid && j < r) {
        if (a[i] <= a[j]) {
            tmp[k++] = a[i++];
        } else {
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) tmp[k++] = a[i++];
    while (j < r) tmp[k++] = a[j++];

    for (int p = l; p < r; p++) {
        a[p] = tmp[p];
    }
}
```

Hai vòng cuối cần thiết: một dãy hết phần tử không có nghĩa dãy kia cũng hết. Chỉ sao chép tmp về a sau khi trộn xong, tránh ghi đè những phần tử chưa đọc.

## Lập luận bằng phần tử nhỏ nhất còn lại

Trước mỗi lượt trộn, tmp đã chứa các phần tử nhỏ nhất theo thứ tự. Do hai nửa tăng dần, mọi phần tử còn lại trong mỗi nửa không nhỏ hơn phần tử ở đầu nửa đó. Chọn đầu nhỏ hơn vì thế vẫn duy trì thứ tự. Khi một nửa hết, phần còn lại của nửa kia đã tăng, nên nối vào được. Kết hợp với việc hai bài toán con được giải đúng, cả đoạn được sắp xếp đúng.

Nếu hai giá trị bằng nhau, mã chọn bên trái trước. Điều này giữ thứ tự tương đối của các phần tử bằng nhau, gọi là tính ổn định; khi sắp xếp bản ghi nhiều trường, đặc tính ấy có thể quan trọng.

## Đếm chi phí theo tầng

Mỗi tầng trộn tổng cộng O(n) phần tử. Số tầng chia khoảng O(log n), nên thời gian O(n log n), kể cả dãy đã sắp xếp. Vùng đệm O(n); ngăn xếp O(log n). Không cấp phát vector n phần tử tại từng lời gọi, vì đó là công việc thừa so với vùng đệm dùng chung.

Merge sort chia các đoạn không giao nhau. Fibonacci đệ quy lại gặp nhiều trạng thái trùng; đó là lí do một bên cần bước ghép, một bên hưởng lợi rõ từ bảng nhớ.

## Luyện tập

- Trộn `1, 4, 4` với `2, 4`, ghi con trỏ sau mỗi lượt.
- Kiểm tra dãy rỗng, dãy một phần tử, dãy đảo thứ tự và dãy toàn giá trị bằng nhau.
- Mở rộng bước trộn để đếm cặp nghịch thế; giải thích số phần tử còn lại bên trái khi lấy bên phải.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao merge sort không cần thử mọi hoán vị của dãy?
>
> **Trả lời:** Sau khi hai nửa đã sắp xếp, phần tử nhỏ nhất còn lại nằm ở đầu một trong hai nửa. Mỗi bước ghép có thể quyết định trực tiếp.

> **Câu hỏi 2:** Bộ nhớ phụ của cài đặt dùng vùng đệm chung là bao nhiêu?
>
> **Trả lời:** O(n) cho vùng đệm và O(log n) cho ngăn xếp, nên tổng bộ nhớ phụ O(n).

## Nguồn tham khảo thêm

- [VNOI — Sắp xếp](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/sorting-new.md)
- [VNOI — Đệ quy và thuật toán quay lui](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/backtracking.md)
