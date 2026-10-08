Trong chặt nhị phân trên đáp án, hàm `check` quyết định một nửa miền tìm kiếm bị bỏ đi. Chỉ một điều kiện sai trong hàm ấy có thể khiến vòng tìm kiếm hội tụ rất nhanh tới đáp án sai. Bài này đi sâu vào việc viết hợp đồng kiểm tra, dựng cận và kiểm chứng hai phía của ranh giới.

## Tư duy

- Nêu chính xác true nghĩa là gì trước khi viết vòng chặt nhị phân.
- Dựng một phương án khả thi để chứng minh cận trên, thay vì chọn số lớn tùy ý.
- Phân biệt sai vì tìm kiếm cập nhật cận với sai vì mô hình kiểm tra.
- Dùng giá trị đáp án và giá trị sát bên để kiểm chứng ranh giới cuối cùng.

## Nội dung học

- Tìm thời gian nhỏ nhất để các máy độc lập sản xuất đủ một số sản phẩm.
- Phép chia lấy phần nguyên và cộng số sản phẩm của các máy.
- Dừng sớm khi đã đủ mục tiêu để tránh tổng vượt kiểu dữ liệu.
- Cận khả thi, midpoint an toàn và số nguyên lớn.

## Mỗi máy đóng góp bao nhiêu?

Một máy mất t đơn vị thời gian cho mỗi sản phẩm, bắt đầu cùng lúc ở thời điểm 0 và không có sản phẩm sẵn. Trong thời gian T, máy hoàn thành `T / t` sản phẩm lấy phần nguyên. Các máy chạy độc lập nên tổng số sản phẩm là tổng những thương đó.

Hai máy có thời gian `[3, 5]`, cần 5 sản phẩm:

| T | Máy 3 | Máy 5 | Tổng | Đủ 5? |
|---|---:|---:|---:|---|
| 8 | 2 | 1 | 3 | Không |
| 9 | 3 | 1 | 4 | Không |
| 10 | 3 | 2 | 5 | Có |
| 11 | 3 | 2 | 5 | Có |

Thời gian tăng không làm máy mất một sản phẩm đã hoàn thành, nên `check(T)` đơn điệu. Lưu ý ở T bằng 9, máy đầu hoàn thành đúng sản phẩm thứ ba; không dùng phép so sánh thời gian nghiêm ngặt để bỏ trường hợp bằng.

## Kiểm tra bằng số còn thiếu

Đầu vào có ít nhất một máy, mỗi thời gian nguyên dương. Ví dụ giới hạn `need <= 10^9` và `t[i] <= 10^9` cho cận trên không quá `10^18`, vừa `long long`. `need = 0` trả về 0.

```cpp
#include <algorithm>
#include <vector>

bool enough(long long time, const vector<long long>& machines,
            long long need) {
    long long made = 0;
    for (long long t : machines) {
        long long add = time / t;
        if (add >= need - made) return true;
        made += add;
    }
    return made >= need;
}

long long firstTime(const vector<long long>& machines, long long need) {
    if (need == 0) return 0;
    long long fastest = *min_element(machines.begin(), machines.end());
    long long low = 0, high = fastest * need;

    while (low < high) {
        long long mid = low + (high - low) / 2;
        if (enough(mid, machines, need)) high = mid;
        else low = mid + 1;
    }
    return low;
}
```

Trong `enough`, trước mỗi phép cộng, made còn nhỏ hơn need. Nếu đóng góp tiếp theo đủ phần còn thiếu, trả về true ngay; không cần tính một tổng khổng lồ. Đây là cách giữ số trong miền cần thiết, thay vì chỉ đổi mọi biến sang kiểu lớn rồi hi vọng không tràn.

## Cận và bất biến của vòng tìm kiếm

Cận trên `fastest * need` có chứng minh: một mình máy nhanh nhất đã hoàn thành đủ số sản phẩm trong thời gian đó. Mọi ứng viên nhỏ hơn 0 không có ý nghĩa, nên cận dưới là 0. Khi mid khả thi, đáp án nhỏ nhất không lớn hơn mid; khi mid không khả thi, mọi giá trị không lớn hơn mid đều bị loại nhờ đơn điệu.

Khoảng nguyên thu nhỏ sau mỗi lượt. Kết thúc ở `answer`, cần kiểm tra `enough(answer)` là true; nếu answer lớn hơn 0 thì `enough(answer - 1)` phải false. Hai kiểm tra này không thay chứng minh, nhưng rất hữu ích để tìm lỗi lệch một đơn vị.

Có m máy, độ rộng thời gian R: O(m log R) thời gian và O(1) bộ nhớ phụ. Hàm không áp dụng trực tiếp nếu các máy phải chia sẻ nguyên liệu giới hạn, thời gian khởi động khác nhau hoặc số sản phẩm thay đổi theo lịch nghỉ; khi ấy phải viết lại mô hình đếm.

## Luyện tập

- Tìm thời gian cho một máy duy nhất và giải thích đáp án bằng phép nhân.
- Thử hai máy cùng tốc độ, mục tiêu lẻ và thời gian ngay trước một lần hoàn thành sản phẩm.
- Bổ sung thời gian khởi động, viết lại đóng góp một máy trước khi dùng lại vòng nhị phân.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao có thể dừng cộng ngay khi đạt mục tiêu?
>
> **Trả lời:** check chỉ cần biết đủ hay chưa. Các máy còn lại chỉ tăng tổng, nên kết quả true không thay đổi và không cần tính tổng chính xác.

> **Câu hỏi 2:** Dùng cận trên 10^18 cho mọi bài có đủ bảo đảm đúng không?
>
> **Trả lời:** Không. Cận phải chứa một phương án khả thi và vừa kiểu dữ liệu; cần dựng hoặc chứng minh cận từ điều kiện cụ thể của đề.

## Nguồn tham khảo thêm

- [USACO Guide — Binary Search](https://usaco.guide/silver/binary-search)
- [VNOI — Tìm kiếm nhị phân](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/basic/binary-search.md)
