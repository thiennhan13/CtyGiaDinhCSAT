Phân tích một số thành tích các số nguyên tố làm lộ ra cấu trúc chia hết của nó. Thay vì nhìn 360 như một giá trị duy nhất, ta có thể viết `360 = 2³ × 3² × 5` và biết mỗi nguyên tố xuất hiện bao nhiêu lần. Bài học xây dựng cách lấy hết từng thừa số nhỏ, giải thích phần còn lại và liên hệ với số lượng ước.

## Tư duy

- Tách một số thành các thừa số nguyên tố, phân biệt số nguyên tố khác nhau với tổng số lần xuất hiện.
- Chia hết một thừa số trước khi chuyển sang ứng viên khác, giữ số mũ tương ứng.
- Theo dõi phần chưa phân tích và giải thích vì sao nó có thể là một nguyên tố lớn còn lại.
- Dùng kết quả phân tích để suy ra tính chất số học, không cần nhân lại một giá trị lớn nếu không cần thiết.

## Nội dung học

- Biểu diễn `n = p1^e1 × p2^e2 × …`, các `p` là nguyên tố và `e` là số mũ.
- Thử ước tăng dần, dùng `while` để chia nhiều lần cùng một thừa số.
- Dừng khi ứng viên vượt căn của phần còn lại, bổ sung phần còn lại lớn hơn 1.
- Số 1 có phân tích rỗng; không áp dụng cùng thuật toán cho 0.
- Công thức đếm ước từ các số mũ và chi phí thử chia `O(√n)`.

## Tách 360 qua từng bước

360 chia được cho 2 ba lần: `360 → 180 → 90 → 45`. Ta ghi số mũ của 2 là 3. Phần 45 chia cho 3 hai lần: `45 → 15 → 5`, nên số mũ của 3 là 2. Phần còn lại 5 là nguyên tố.

| Ứng viên | Các lần chia | Số mũ ghi nhận | Phần còn lại |
|---:|---|---:|---:|
| 2 | 360 → 180 → 90 → 45 | 3 | 45 |
| 3 | 45 → 15 → 5 | 2 | 5 |
| Phần còn lại | Ghi nhận 5 | 1 | 1 sau khi biểu diễn |

Kết quả có ba nguyên tố phân biệt 2, 3, 5 nhưng tổng số thừa số tính lặp là `3 + 2 + 1 = 6`. Hai cách đếm phản ánh hai câu hỏi khác nhau.

## Mã phân tích và xuất từng cặp

Hàm đặt ngoài `main`, dùng `<iostream>`, đầu vào `n ≥ 1`. Mỗi dòng xuất một thừa số nguyên tố và số mũ của nó:

```cpp
void phan_tich(long long n) {
    for (long long p = 2; p <= n / p; ++p) {
        int so_mu = 0;
        while (n % p == 0) {
            n /= p;
            ++so_mu;
        }
        if (so_mu > 0) cout << p << ' ' << so_mu << '\n';
    }
    if (n > 1) cout << n << " 1\n";
}
```

Gọi `phan_tich(360)` in `2 3`, `3 2`, `5 1` trên ba dòng. Điều kiện ngoài thay đổi theo **phần còn lại** `n`, không bắt buộc giữ căn của số ban đầu. Dùng `p <= n/p` tránh tính `p*p` có thể vượt giới hạn.

Mặc dù vòng ngoài thử cả một số hợp số, nó chỉ ghi các nguyên tố. Khi đến một hợp số `p`, các ước nguyên tố nhỏ của `p` đã được lấy hết khỏi phần còn lại; vì vậy phần còn lại không thể tiếp tục chia hết cho hợp số đó. Cách này dễ hiểu; việc chỉ thử danh sách nguyên tố có thể giảm công việc nhưng cần bước chuẩn bị riêng.

## Tại sao phần còn lại là nguyên tố?

Khi vòng ngoài dừng và `n > 1`, không còn ước nhỏ chưa thử có thể chia `n`. Nếu phần này là hợp số, nó phải có một ước nguyên tố không vượt căn; ước ấy hoặc đã được thử và lấy hết, hoặc làm điều kiện vòng ngoài chưa thể dừng. Mâu thuẫn đó cho thấy phần còn lại là nguyên tố.

Với `n = 14`, thử 2 lấy ra một lần và còn 7; cận đã cho phép dừng trước khi thử tới 7. Nếu quên lệnh ghi phần còn lại, kết quả sẽ thiếu thừa số lớn. Với `n = 13` nguyên tố, vòng không tìm được thừa số nhỏ và ghi chính 13 ở cuối.

Thuật toán bảo toàn quan hệ: số ban đầu bằng tích các thừa số đã lấy nhân phần còn lại. Mỗi lần chia rút đúng một thừa số, nên biểu diễn cuối không mất hay thêm một nhân tử.

## Từ số mũ đến số lượng ước

Một ước của `360 = 2³ × 3² × 5` có thể chọn số mũ của 2 từ 0 đến 3, của 3 từ 0 đến 2, của 5 từ 0 đến 1. Các lựa chọn độc lập tạo `4 × 3 × 2 = 24` ước dương khác nhau.

Đây là lý do công thức số ước nhân các giá trị `e + 1`, không cộng chúng. Số mũ 0 cần được tính vì một ước có thể không chứa nguyên tố đó; chọn mọi số mũ bằng 0 tạo ước 1.

Nếu mọi số mũ trong phân tích của một số dương đều chẵn, nó là chính phương: chia đôi từng số mũ để tạo căn nguyên. Chỉ cần một số mũ lẻ là không thỏa. Nhận xét này nối với B03 nhưng không có nghĩa luôn phải phân tích để kiểm tra chính phương.

## Chi phí và các trường hợp đặc biệt

Thử chia có thời gian `O(√N)` trong trường hợp xấu nhất với `N` là số ban đầu; vòng chia bên trong rút nhanh phần còn lại. Bộ nhớ phụ là `O(1)` khi xuất trực tiếp; lưu danh sách sẽ cần bộ nhớ cho kết quả. Với nhiều số trong miền nhỏ, sàng có thể hỗ trợ bước chuẩn bị chung.

Số 1 không có thừa số nguyên tố nên hàm không in cặp nào. Số 0 không phù hợp: có thể chia cho 2 mãi mà vẫn bằng 0. Với dữ liệu lớn, thuật toán đúng về mặt logic nhưng có thể quá chậm; các phương pháp phân tích chuyên sâu nằm ngoài bài hiện tại.

## Luyện tập

- Phân tích 72: `2³ × 3²`; có 12 ước, hai nguyên tố phân biệt và năm thừa số tính lặp.
- Phân tích 49, 13 và 1; giải thích khi nào phần còn lại được ghi ở cuối.
- Dùng số mũ để kiểm tra 144 là chính phương, còn 72 không phải.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao chia `n` cho `p` một lần rồi chuyển ngay sang số tiếp theo có thể sai?
>
> **Trả lời:** Một nguyên tố có thể xuất hiện nhiều lần. Với 8, số 2 phải được lấy ba lần. Vòng `while` lấy hết thừa số hiện tại và ghi đúng số mũ; một lệnh `if` chỉ lấy một lần sẽ bỏ sót cấu trúc của số.

> **Câu hỏi 2:** Vì sao `2³ × 3² × 5` có `4 × 3 × 2` ước, không phải `3 + 2 + 1`?
>
> **Trả lời:** Mỗi ước chọn một số mũ cho từng nguyên tố, gồm cả 0. Có 4, 3, 2 lựa chọn độc lập nên dùng quy tắc nhân. Tổng số mũ chỉ đếm số thừa số nguyên tố có lặp trong số ban đầu, là một đại lượng khác.

## Nguồn tham khảo thêm

- [USACO Guide — Divisibility](https://usaco.guide/gold/divisibility)
- [VNOI — Kiểm tra số nguyên tố](https://github.com/VNOI-Admin/vnoi_wiki/blob/master/algo/algebra/primality_check.md)
- [VNOI — Số các ước và tổng các ước](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/math/divisors.md)
- [Viblo Algorithm — Số nguyên tố và các vấn đề liên quan](https://viblo.asia/p/so-nguyen-to-va-cac-van-de-lien-quan-ORNZqnx8l0n)
