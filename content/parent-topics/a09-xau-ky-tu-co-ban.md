Tên, câu văn và dãy chữ số được lưu như những chuỗi ký tự, thường gọi là xâu. Chương trình cần biết đọc một từ hay cả dòng, duyệt từng ký tự và dùng các thao tác phù hợp để thay đổi văn bản. Bài này xét trước xâu chứa ký tự ASCII để làm rõ chỉ số, mã ký tự và các quy tắc xử lý đơn giản.

## Tư duy

- Phân biệt một ký tự với một xâu, và độ dài dữ liệu với ý nghĩa của nội dung.
- Chọn cách nhập theo yêu cầu giữ hay bỏ khoảng trắng.
- Nhận ra các ký tự cùng nhóm, như chữ số, để xử lý theo quy tắc thay vì liệt kê riêng từng giá trị.
- Kiểm tra chỉ số và phạm vi bảng mã trước khi dùng các phép toán trên ký tự.

## Nội dung học

- `char`, `string`, dấu nháy đơn/đôi và cách truy cập `s[i]`.
- `cin >> s` đọc một từ; `getline` đọc cả dòng và lưu ý khi chuyển từ đọc số sang đọc dòng.
- Bảng mã ASCII, thứ tự các chữ số và chuyển `'0'`–`'9'` thành giá trị 0–9.
- `size`, nối xâu, `substr`, `find` và nhận biết `string::npos`.
- Duyệt xâu, đếm ký tự theo điều kiện, xâu rỗng và khác biệt với văn bản Unicode.

## Một từ hay một dòng?

Với dòng `Hoc Tin vui`, `cin >> s` chỉ đọc `Hoc`, còn `getline(cin, s)` có thể đọc cả ba từ và hai dấu cách. Mỗi cách phù hợp một dạng đầu vào khác nhau; khoảng trắng không phải lúc nào cũng là dữ liệu được bỏ.

Khi đã dùng `cin >> n` để đọc số ở dòng trước, dấu xuống dòng có thể còn trong luồng. Nếu chuyển ngay sang `getline`, nó có thể đọc phần còn lại rỗng. Đoạn trong `main` sau cần `<iostream>`, `<string>` và `<limits>`:

```cpp
int n;
cin >> n;
cin.ignore(numeric_limits<streamsize>::max(), '\n');

string s;
getline(cin, s);
```

Đoạn này giả sử văn bản cần đọc nằm ở **dòng kế tiếp**. `ignore` bỏ phần còn lại đến hết dòng đang chứa `n`. Nếu văn bản cần đọc ở cùng dòng với số, không được bỏ cả phần ấy theo mẫu trên.

## Ký tự có giá trị số, nhưng không phải số đang viết

Ký tự `'7'` không phải số nguyên 7; nó có mã trong bảng ký tự. Trong ASCII, các chữ số `'0'` đến `'9'` nằm liên tiếp nên `ch - '0'` cho giá trị của một chữ số, sau khi đã kiểm tra nó thuộc nhóm này.

Xét `s = "a2b05"`:

| Chỉ số | Ký tự | Là chữ số? | Giá trị được cộng |
|---:|---|---|---:|
| 0 | `a` | Không | 0 |
| 1 | `2` | Có | 2 |
| 2 | `b` | Không | 0 |
| 3 | `0` | Có | 0 |
| 4 | `5` | Có | 5 |

Đếm được 3 chữ số, tổng các chữ số bằng 7. Phần mã trong `main` cần `<string>`:

```cpp
string s = "a2b05";
int so_chu_so = 0, tong_chu_so = 0;

for (char ch : s) {
    if (ch >= '0' && ch <= '9') {
        ++so_chu_so;
        tong_chu_so += ch - '0';
    }
}
```

Mỗi ký tự được xét một lần; chỉ những ký tự thuộc khoảng chữ số mới được chuyển thành giá trị. Đoạn này cộng từng chữ số, không phân tích cả cụm `05` thành một số. Đây là hai yêu cầu khác nhau.

## Một số thao tác trên xâu

Với `s = "laptrinh"`, `s.size()` bằng 8, `s.substr(0, 3)` là `"lap"`; vị trí đầu đánh số từ 0. Tham số thứ hai của `substr` là **số ký tự cần lấy**, không phải chỉ số kết thúc. `s + "!"` tạo xâu nối thêm dấu chấm than.

`s.find("tin")` không tìm thấy vì `"tin"` không xuất hiện liên tiếp trong `"laptrinh"`. Kết quả khi không có là `string::npos`, không nên tự coi là một chỉ số hợp lệ rồi truy cập `s` ở đó. Xâu chứa các ký tự đúng nhưng không đúng thứ tự/liên tiếp vẫn không phải một lần xuất hiện.

Với xâu độ dài `n`, truy cập phần tử để đọc/sửa trong bài học dùng các vị trí từ 0 đến `n - 1`. Xâu rỗng không có phần tử để đọc; `size()` vẫn hợp lệ và trả 0. Thao tác tạo một xâu con cần sao chép dữ liệu tương ứng, nên không phải mọi hàm xâu đều có chi phí hằng số.

## Phạm vi và chi phí

Đếm chữ số có thời gian `O(n)` và bộ nhớ phụ `O(1)`, ngoài xâu đã lưu. Lấy hoặc nối `k` ký tự thường cần công việc tỷ lệ với số ký tự được tạo; việc tìm kiếm còn phụ thuộc thuật toán và độ dài mẫu. Không suy chi phí chỉ từ độ dài tên hàm.

ASCII là bảng mã 128 giá trị; các ví dụ đơn giản ở đây dùng chữ Latin không dấu, chữ số và dấu thông dụng. Văn bản tiếng Việt lưu bằng UTF-8 có thể dùng nhiều byte cho một ký tự nhìn thấy. Khi đó `string::size()` đếm byte, không tự đếm số chữ; phép đổi chữ dựa vào cộng/trừ mã ASCII không giải được Unicode. Cần giữ giả thiết này rõ khi thử dữ liệu có dấu.

## Luyện tập

- Đếm dấu cách trong một dòng, giữ nguyên các dấu cách đầu/cuối khi đề yêu cầu.
- Với xâu chỉ có chữ số, tính tổng chữ số và phân biệt với giá trị của cả số.
- Lấy ba ký tự đầu của một xâu đủ dài, rồi thử xâu ngắn và xâu rỗng để kiểm tra điều kiện truy cập.

## Tự kiểm tra

> **Câu hỏi 1:** Vì sao `cin >> s` không phù hợp nếu cần giữ cả dòng có dấu cách?
>
> **Trả lời:** Phép đọc này bỏ khoảng trắng đầu và dừng ở khoảng trắng sau một từ. `getline` đọc đến dấu xuống dòng nên có thể giữ dấu cách trong dòng. Khi chuyển từ đọc số, cần xử lý phần còn lại của dòng theo đúng định dạng đầu vào.

> **Câu hỏi 2:** `s.size()` có luôn là số chữ nhìn thấy trên màn hình không?
>
> **Trả lời:** Không. Với xâu ASCII trong bài, mỗi ký tự dùng một byte nên hai số trùng nhau. Với UTF-8, một ký tự có thể dùng nhiều byte; `string::size()` đếm byte và không tự xử lý các quy tắc ký tự Unicode.

## Nguồn tham khảo thêm

- [USACO Guide — Introduction to Data Structures](https://usaco.guide/bronze/intro-ds)
- [Harvard CS50 — Lecture 2](https://cs50.harvard.edu/x/notes/2/)
- [Microsoft Learn — basic_string](https://learn.microsoft.com/en-us/cpp/standard-library/basic-string-class?view=msvc-170)
