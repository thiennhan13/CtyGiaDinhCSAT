Khi nhiều câu hỏi cùng yêu cầu tính tổng những đoạn khác nhau của một dãy, cộng lại từng đoạn sẽ lặp nhiều công việc. Mảng cộng dồn tổ chức các kết quả đã tính thành một dãy phụ, để mỗi câu hỏi sau đó chỉ cần hai giá trị. Trọng tâm của bài học là nhận ra phần tính toán có thể chuẩn bị trước và giải thích đúng phần được giữ lại sau phép trừ.

## Tư duy

- Nhận ra sự lặp lại giữa các truy vấn trên cùng một dãy dữ liệu không thay đổi.
- Đánh đổi một lần tiền xử lý và bộ nhớ phụ để giảm chi phí của nhiều lần hỏi sau đó.
- Định nghĩa rõ ý nghĩa mỗi phần tử của mảng phụ trước khi suy ra công thức.
- Giải thích tổng một đoạn bằng tổng từ đầu đến cuối đoạn, trừ phần nằm trước đoạn; kiểm tra cận đầu bằng một trường hợp nhỏ.

## Nội dung học

- Tổng tiền tố `pref[i]`: tổng các phần tử từ vị trí 1 đến `i`; quy ước `pref[0] = 0`.
- Cách xây dựng bằng `pref[i] = pref[i - 1] + a[i]` với một lượt duyệt.
- Trả lời tổng đoạn đóng `[l, r]` bằng `pref[r] - pref[l - 1]`.
- Lựa chọn kiểu `long long`, kích thước mảng và kiểm tra chỉ số với đoạn một phần tử hoặc đoạn bắt đầu ở 1.
- Phân tích tiền xử lý `O(n)`, mỗi truy vấn `O(1)` và giới hạn khi dữ liệu gốc được cập nhật.

## Vì sao cần chuẩn bị trước?

Giả sử có dãy `3, -1, 4, 2, -2`. Ta cần hỏi tổng các đoạn `[2, 4]`, `[1, 5]` và `[3, 3]`.

Duyệt trực tiếp giải được cả ba câu hỏi, nhưng có những phần tử được cộng nhiều lần. Với dãy dài `n` và `q` câu hỏi, mỗi câu hỏi có thể phải duyệt gần hết dãy, dẫn đến chi phí `O(nq)` trong trường hợp xấu nhất. Điều đáng chú ý là dãy không đổi giữa các lần hỏi: kết quả của những đoạn tính từ đầu có thể được lưu và sử dụng lại.

Ta tạo mảng `pref`, trong đó vị trí `i` giữ tổng của **toàn bộ phần đầu kết thúc tại `i`**, không phải tổng riêng phần tử `i`.

| Vị trí | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|---:|
| Dữ liệu `a` | — | 3 | -1 | 4 | 2 | -2 |
| Tổng tiền tố `pref` | 0 | 3 | 2 | 6 | 8 | 6 |

Số âm không làm kỹ thuật này mất hiệu lực. Mảng cộng dồn có thể giảm, như từ 8 xuống 6; công thức tổng đoạn vẫn đúng vì chỉ dựa vào phép cộng và trừ. Không được suy ra rằng mảng cộng dồn luôn có thứ tự tăng để áp dụng tìm kiếm nhị phân.

## Xây dựng mảng và trả lời truy vấn

Đoạn C++ dưới đây dùng `<vector>` và `<iostream>`. Phần tử `a[0]` chỉ là ô đệm; dữ liệu cần tính nằm ở vị trí 1 đến 5.

```cpp
vector<long long> a = {0, 3, -1, 4, 2, -2};
int n = a.size() - 1;
vector<long long> pref(n + 1, 0);
for (int i = 1; i <= n; ++i) {
    pref[i] = pref[i - 1] + a[i];
}
int l = 2, r = 4;
cout << pref[r] - pref[l - 1] << '\n';
```

Kết quả in ra là 5. Mảng `pref` có `n + 1` ô, vì ngoài các tổng ở vị trí 1 đến `n`, ta còn cần tổng rỗng tại vị trí 0. Sự nhất quán giữa cách đánh số và cách cấp phát quan trọng hơn việc chọn đánh số từ 0 hay từ 1.

### Tại sao phải trừ `pref[l - 1]`?

`pref[r]` chứa mọi phần tử từ 1 đến `r`. Trong đó, các phần tử từ 1 đến `l - 1` nằm ngoài đoạn cần hỏi. Tổng của phần nằm ngoài chính là `pref[l - 1]`. Trừ phần ấy đi, ta giữ lại đúng các vị trí từ `l` đến `r`, bao gồm cả hai đầu.

Trong ví dụ, tổng `[2, 4]` là `pref[4] - pref[1] = 8 - 3 = 5`, tương ứng `-1 + 4 + 2`. Nếu trừ `pref[2]`, ta sẽ xóa luôn phần tử đầu đoạn là `-1`, thu được 6 và giải sai một đoạn khác.

| Đoạn được hỏi | Công thức | Kết quả | Kiểm tra trực tiếp |
|---|---|---:|---|
| `[2, 4]` | `8 - 3` | 5 | `-1 + 4 + 2` |
| `[1, 5]` | `6 - 0` | 6 | `3 - 1 + 4 + 2 - 2` |
| `[3, 3]` | `6 - 2` | 4 | Chỉ lấy phần tử ở vị trí 3 |

Quy ước `pref[0] = 0` làm truy vấn bắt đầu tại vị trí 1 dùng chung một công thức, không cần một nhánh xử lý riêng.

## Giải thích tính đúng

Khi xây dựng mảng, giả sử `pref[i - 1]` đã chứa đúng tổng từ 1 đến `i - 1`. Cộng thêm `a[i]` cho ta đúng tổng từ 1 đến `i`. Quy luật bắt đầu từ `pref[0] = 0`, nên mọi phần tử mảng phụ đều mang đúng ý nghĩa đã định nghĩa.

Ở bước truy vấn, hai tổng tiền tố chứa chung các phần tử trước `l`. Phép trừ loại bỏ phần chung đó, còn lại đúng đoạn cần tính. Hai bước có trách nhiệm riêng: xây dựng đúng các tổng đầu dãy, rồi kết hợp chúng đúng theo cận câu hỏi.

## Chi phí, giới hạn và lỗi thường gặp

Xây mảng cần `O(n)` thời gian và `O(n)` bộ nhớ phụ. Mỗi truy vấn dùng hai lần đọc mảng và một phép trừ, nên mất `O(1)`; `q` truy vấn có tổng chi phí `O(n + q)` sau khi tính cả tiền xử lý.

Kiểu dữ liệu phải chứa được **tổng**, không chỉ từng phần tử. Chẳng hạn, 200 000 phần tử có giá trị đến một tỷ có thể tạo tổng đến `2 × 10^14`, vượt `int` nhưng còn trong `long long`. Dù dùng `long long`, vẫn cần xét giới hạn đầu vào thay vì coi mọi phép cộng đều an toàn.

Công thức trên yêu cầu `1 ≤ l ≤ r ≤ n`. Dãy rỗng không có một đoạn hợp lệ để hỏi. Khi thay đổi `a[k]`, các tổng từ `pref[k]` trở đi có thể không còn đúng; không được tiếp tục dùng mảng cũ. Bài này giải quyết truy vấn trên dữ liệu cố định, còn những mô hình cập nhật cần phương pháp phù hợp khác.

Lỗi dễ gặp là trộn chỉ số 0/1, quên tổng rỗng hoặc viết `pref[r] - pref[l]`. Cách kiểm tra hiệu quả là so sánh mọi đoạn của một dãy nhỏ với phép cộng trực tiếp, thay vì chỉ thử một truy vấn dài.

## Thực hành

- Tính các đoạn `[1, 1]`, `[4, 5]`, `[1, 5]` của dãy ví dụ; đáp án tương ứng là 3, 0 và 6.
- Cho một dãy lượng tăng/giảm mỗi ngày, trả lời tổng biến động trong các khoảng ngày khác nhau; dữ liệu có thể âm.
- Biến mỗi phần tử thành 1 nếu thỏa một điều kiện, thành 0 nếu không; dùng cộng dồn để đếm số phần tử thỏa điều kiện trong một đoạn.

Dạng bài đếm ở ý cuối dùng cùng một kỹ thuật trên dãy đã biến đổi. Học sinh cần giải thích được vì sao tổng những số 0/1 chính là số lần điều kiện đúng.

## Minh họa bằng video

[USACO Guide — Introduction to Prefix Sums](https://www.youtube.com/watch?v=f0bfiuDjq9A).

Hãy đặt hai dải cạnh nhau: `pref[4]` chứa các vị trí `1, 2, 3, 4`, còn `pref[1]` chỉ chứa vị trí `1`. Gạch phần chung đi sẽ còn đúng `2, 3, 4`. Bảng trong bài chính là các giá trị của hai dải ấy, nên có thể đối chiếu trực quan trước khi xem cách cài đặt.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao tính tổng `[l, r]` phải trừ `pref[l - 1]` thay vì `pref[l]`?
>
> **Trả lời:** Chỉ cần bỏ các phần tử đứng trước `l`. Trừ `pref[l]` sẽ bỏ luôn phần tử đầu đoạn cần tính, làm kết quả thiếu `a[l]`.

> **Câu hỏi 2:** Có thể tìm kiếm nhị phân trên mọi mảng cộng dồn không?
>
> **Trả lời:** Không. Dữ liệu có số âm có thể làm tổng tiền tố giảm, nên mảng phụ không nhất thiết có thứ tự. Công thức tổng đoạn vẫn đúng nhưng điều kiện tìm kiếm nhị phân không tự được bảo đảm.

## Nguồn tham khảo thêm

- [VNOI — Mảng cộng dồn và mảng hiệu](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/data-structures/prefix-sum-and-difference-array.md)
- [USACO Guide — Introduction to Prefix Sums](https://usaco.guide/silver/prefix-sums)
- [Viblo Algorithm — Mảng tổng tiền tố và mảng hiệu](https://viblo.asia/p/quy-hoach-dong-55-mang-tong-tien-to-va-mang-hieu-phan-1-r1QLx6104Aw)
