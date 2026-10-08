Một xâu có thể chứa khoảng trắng thừa, nhiều từ hoặc những đoạn đối xứng. Cùng là xử lý ký tự, nhưng mỗi yêu cầu cần một cách nhìn khác: tách và chuẩn hóa dựa vào ranh giới từ; kiểm tra đối xứng dựa vào các cặp vị trí; tìm và đếm đoạn đối xứng dựa vào tâm. Bài này làm rõ các mô hình ấy trước khi chọn câu lệnh.

## Tư duy

- Xác định quy ước về khoảng trắng, chữ hoa và ký tự được phép trước khi chuẩn hóa.
- Phân biệt đối xứng của cả xâu với đối xứng của một đoạn liên tiếp.
- Tìm đặc điểm chung của mọi đoạn đối xứng để tránh kiểm tra lại từng đoạn từ đầu.
- Giải thích việc dừng mở rộng bằng một cặp ký tự không còn phù hợp.

## Nội dung học

- Tách từ bằng `stringstream` và ghép lại với một khoảng trắng.
- Chuyển chữ hoa ASCII thành chữ thường theo quy tắc rõ ràng.
- Kiểm tra palindrome bằng hai vị trí từ hai đầu vào giữa.
- Mở rộng quanh tâm lẻ hoặc tâm chẵn để đếm và tìm đoạn palindrome dài nhất.

## Chuẩn hóa phải có một quy ước

Với đầu vào `"  An   BINH  Chi "`, yêu cầu bỏ khoảng trắng dư và chuyển chữ Latin về thường cho kết quả `"an binh chi"`. Có thể duyệt từng ký tự và theo dõi mình đang ở trong hay ngoài một từ. Khi chỉ cần tách theo khoảng trắng, `stringstream` giúp diễn đạt công việc ngắn gọn hơn.

Đoạn mã dùng `<sstream>` và `<string>`; `s` là một dòng đã đọc bằng `getline`.

```cpp
stringstream ss(s);
string tu, ket_qua;
while (ss >> tu) {
    for (char& c : tu) {
        if ('A' <= c && c <= 'Z') c += 'a' - 'A';
    }
    if (!ket_qua.empty()) ket_qua += ' ';
    ket_qua += tu;
}
```

Mỗi lần đọc cho một từ không có khoảng trắng ở đầu hoặc cuối; trước các từ sau từ đầu tiên, ta thêm đúng một dấu cách. Vì vậy, chuỗi kết quả không có khoảng trắng thừa. Đoạn này chỉ đổi A–Z, không xử lý hoa/thường của Unicode tiếng Việt. Dấu câu vẫn đi cùng từ; bài muốn bỏ dấu câu phải nêu thêm quy tắc.

## Đối xứng là một quan hệ giữa hai vị trí

Xâu `abba` đọc từ hai phía giống nhau. Ta chỉ cần so `s[0]` với `s[3]`, rồi `s[1]` với `s[2]`. Nếu có một cặp khác nhau, toàn xâu không đối xứng; nếu mọi cặp đều bằng nhau, nó là palindrome.

```cpp
bool doi_xung(const string& s) {
    int n = s.size();
    int l = 0, r = n - 1;
    while (l < r) {
        if (s[l] != s[r]) return false;
        l++;
        r--;
    }
    return true;
}
```

Hàm nhận độ dài vừa miền `int`, dùng `O(n)` thời gian và `O(1)` bộ nhớ phụ. Xâu rỗng và xâu một ký tự được coi là đối xứng theo quy ước này; nếu đề chỉ chấp nhận xâu không rỗng, kiểm tra thêm độ dài.

## Tìm và đếm các đoạn đối xứng

Cách trực tiếp xét mọi đoạn `[l, r]` rồi kiểm tra từng cặp bên trong có thể tốn `O(n³)`. Nhận xét quan trọng: mỗi palindrome có một tâm duy nhất. Tâm là một ký tự nếu độ dài lẻ, hoặc khe giữa hai ký tự nếu độ dài chẵn.

Với `abba`, các tâm tạo ra:

| Tâm | Những đoạn đối xứng tìm được |
|---|---|
| Ký tự a đầu | `a` |
| Ký tự b thứ nhất | `b` |
| Khe giữa hai b | `bb`, `abba` |
| Ký tự b thứ hai | `b` |
| Ký tự a cuối | `a` |

Có 6 đoạn tính theo **vị trí**, dù chỉ có 4 nội dung khác nhau. “Đếm đoạn” và “đếm xâu phân biệt” là hai yêu cầu khác; mã dưới giải quyết yêu cầu thứ nhất.

```cpp
long long dem_palindrome(const string& s) {
    int n = s.size();
    long long dem = 0;
    for (int tam = 0; tam < n; tam++) {
        for (int k = 0; k < 2; k++) {
            int l = tam, r = tam + k;
            while (l >= 0 && r < n && s[l] == s[r]) {
                dem++;
                l--;
                r++;
            }
        }
    }
    return dem;
}
```

Mỗi lần mở rộng giữ phần trong đã đối xứng và thêm hai ký tự bằng nhau, nên tạo đúng một palindrome mới. Ngược lại, mọi palindrome có tâm lẻ hoặc chẵn và sẽ được gặp khi mở rộng tâm đó; không đoạn nào bị đếm ở hai tâm khác nhau.

Muốn tìm đoạn dài nhất, tại cùng vị trí thành công cập nhật độ dài `r - l + 1` và đầu trái `l`. Với nhiều đoạn dài nhất, cần quy định lấy đoạn xuất hiện đầu, cuối hay tất cả. Mở rộng quanh tâm tốn `O(n²)` thời gian trong trường hợp xâu toàn ký tự giống nhau, bộ nhớ phụ `O(1)` nếu chỉ lưu số đếm hoặc một đáp án.

## Luyện tập

- Chuẩn hóa một dòng toàn khoảng trắng, một từ và nhiều từ; giải thích vì sao không có dấu cách ở đầu.
- Đếm palindrome của `abba`, `abc` và `aaaa`: số đoạn lần lượt 6, 3, 10.
- Tìm đoạn palindrome dài nhất và nêu quy tắc chọn khi hòa độ dài.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao chỉ xét tâm nằm tại ký tự sẽ bỏ sót một số palindrome?
>
> **Trả lời:** Palindrome có độ dài chẵn đặt tâm giữa hai ký tự, như `bb` hoặc `abba`. Cần xét cả khe giữa ký tự để bao phủ chúng.

> **Câu hỏi 2:** Có 10 đoạn palindrome trong `aaaa`; có phải 10 nội dung xâu khác nhau không?
>
> **Trả lời:** Không. Đếm theo vị trí cho 4 đoạn dài 1, 3 đoạn dài 2, 2 đoạn dài 3 và 1 đoạn dài 4. Nội dung phân biệt chỉ là `a`, `aa`, `aaa`, `aaaa`.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [VNOI — Palindrome và cách nhìn qua tâm](https://raw.githubusercontent.com/VNOI-Admin/vnoi_wiki/master/algo/string/manacher.md)
- [Viblo — Stack và queue trong cấu trúc dữ liệu](https://viblo.asia/p/stack-va-queue-trong-cau-truc-du-lieu-RQqKLv8Nl7z)
