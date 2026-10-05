# Catalog khóa học công khai và thiết kế tích hợp

Cập nhật **05/10/2026** theo xác nhận của trung tâm. Tài liệu này là nguồn thống nhất cho tên khóa, nội dung tuyển sinh và thiết kế dữ liệu tương lai. Nội dung A/B/C đọc từ [chương trình đào tạo đã duyệt](CHUONG_TRINH_DAO_TAO.md). Giao diện đã tích hợp Next.js; các hợp đồng dự kiến bên dưới **chưa được triển khai vào API/RPC hoặc database production**.

## Năm khóa học trên website

| Mã | Tên hiển thị | Nội dung, đối tượng đã có căn cứ | Thông tin công khai |
|---|---|---|---|
| A | Nhập môn lập trình | A01–A09: 9 chủ đề/3 chặng; học sinh lớp 5–7 làm quen C++ | 99.000đ/buổi; 90 phút; 5–8 học sinh; lịch theo đợt tuyển sinh |
| B | Lập trình thi đấu cơ bản | B01–B15: 15 chủ đề/4 chặng; học sinh lớp 7–9, định hướng HSG cấp Phường/Chuyên Tin theo poster | 99.000đ/buổi; 90 phút; 5–8 học sinh; trao đổi phạm vi luyện thi cụ thể |
| C | Lập trình thi đấu nâng cao | C01–C12 và D01–D07: 19 chủ đề/6 chặng; học sinh lớp 7–9 hướng HSG tỉnh/Chuyên Tin theo poster | 109.000đ/buổi; 90 phút; 5–8 học sinh; trao đổi nền tảng trước khi chọn lớp |
| E | Chủ lực | Thi tuyển đầu vào riêng từ lớp C; kiến thức khó hơn, hướng đến thứ hạng cao tại HSG Tỉnh và tuyển sinh chuyên Tin | 3–4 học sinh; 2 giờ/buổi; lịch theo thành viên lớp; học phí trao đổi cùng đội ngũ |
| K | Kèm riêng | Học 1–1 hoặc nhóm đăng ký riêng; chọn/phối nội dung từ các chương trình theo nhu cầu | Nội dung, lịch, thời lượng và học phí trao đổi trước khi bắt đầu |

**A+B là cách xem toàn bộ khung Cơ bản, không phải khóa tuyển sinh thứ sáu.** C vẫn dùng trọn C+D, không đổi thành giáo trình PreVOI. Quyết định 05/10 thay quyết định 04/10: E là Chủ lực theo ảnh trung tâm cung cấp, không phải PreVOI. Danh mục kiến thức và học phí E chưa được cung cấp; website không tạo giáo trình hoặc giá thay trung tâm.

Thông tin trên hỗ trợ tìm hiểu, không kết luận năng lực từ tuổi hoặc cấp học. Giá tuyển sinh không cập nhật đơn giá lớp đang học, không dùng để tính lại học phí lịch sử. Khung kiến thức không ấn định số buổi hoặc cam kết kết quả thi.

## Phân biệt catalog, chương trình và hình thức

| Khái niệm | Mã/giá trị hiện tại | Cách sử dụng |
|---|---|---|
| Khóa công khai | A, B, C, E, K | Người đọc tìm hiểu và đăng ký trao đổi; là catalog website, chưa phải enum loại lớp trong database |
| Chương trình kiến thức | `basic`, `advanced`, `voi`, `custom` | Mã ứng dụng/database hiện có; chỉ gán vào lớp qua thao tác có quyền |
| Hình thức học | `group`, `individual` | Học nhóm hoặc 1–1; độc lập với chương trình |
| Phạm vi Cơ bản | A, B hoặc A+B | Nội dung lớp mặc định A+B; việc xem phần B không xác nhận đã thành thạo A |
| Phiên bản giáo án | `template_id`, `version` | Xác định nội dung đã chọn; giữ nháp/công bố, revision và lịch sử |

Mapping thiết kế:

- A/B lấy nội dung từ `basic`, chọn phần tương ứng. Cơ bản vận hành vẫn mặc định A+B.
- C lấy nội dung `advanced` C+D hiện hành. Không tự sửa các lớp đang mang loại Nâng cao.
- E Chủ lực là khóa tuyển riêng từ C, độc lập với PreVOI. `voi` là mã quản lý hiện có, giữ nguyên ở phía gia sư. Không tự gán E vào `voi`, thay default hay chuyển lớp thật. Ý định quản lý PreVOI chỉ gồm các lớp loại này cần đợt đặc tả/mapping riêng có dữ liệu và quyền rõ ràng.
- K là nhu cầu học riêng với chương trình tùy chỉnh; không đồng nghĩa HSGQG. Một lớp 1–1 giữ nguyên khung đã có vẫn có thể dùng `basic`/`advanced` cùng `individual`. Khi cần chọn/phối chương trình riêng, dùng thiết kế K bên dưới sau khi triển khai đầy đủ.

Website có thể thay cách giới thiệu mà không thay loại lớp hoặc nội dung phụ huynh đang xem. Chuyển đổi lớp thật là nhiệm vụ riêng, cần đối chiếu dữ liệu, phạm vi được phép và kiểm chứng bảo toàn lịch sử.

## Chọn hướng học và tiếp nhận yêu cầu

Selector đã được tích hợp vào Next.js. Theo yêu cầu mới ngày 04/10, form chỉ chạy frontend: lựa chọn và ngữ cảnh được đưa vào bản tóm tắt để người dùng xem lại/sao chép; chưa tạo request API hoặc lưu database. Các trường riêng và mapping bên dưới là hợp đồng dự kiến cho lần kết nối sau.

### Selector

Ba đầu vào: cấp học, mục tiêu và nền tảng do người dùng tự mô tả. Nền tảng gồm chưa học; đang làm quen cú pháp; đã tự giải một số bài; chưa rõ/cần trao đổi. Đây không phải bài kiểm tra xếp lớp.

- Mục tiêu HSG Quốc gia: mời trao đổi riêng, không gợi ý E hoặc xác nhận đủ điều kiện. Các URL cũ `/lo-trinh/hsgqg`, `/lo-trinh/voi`, `/lo-trinh/prevoi` chuyển về tư vấn mục tiêu quốc gia, không coi là alias của E.
- Đại học với mục tiêu khác: tư vấn riêng. Không dùng cấp học để khẳng định phải theo một khóa cụ thể.
- Mới bắt đầu: ưu tiên tìm hiểu A; đang làm quen cú pháp: A/B; đã luyện bài: B/C; chưa rõ: xem các khóa và trao đổi.
- Người đọc luôn được xem khóa khác. K có đường tư vấn riêng; selector không tự chẩn đoán người dùng cần 1–1.
- URL chỉ giữ enum được phép, không chứa tên, số điện thoại, email hoặc mô tả tự do. `course=AB` là ngữ cảnh xem toàn khung Cơ bản, không tạo mã khóa tuyển sinh mới.

### Hợp đồng intake dự kiến

Mở rộng luồng tư vấn hiện có cùng lúc ở validation, API, RPC, admin và email. Các trường bổ sung tối thiểu:

| Trường dự kiến | Ý nghĩa và tương thích |
|---|---|
| `request_kind` | `consultation` hoặc `materials`; yêu cầu cũ thiếu trường là tư vấn |
| `course_interest` | A/B/C/E/K hoặc `null`; là lựa chọn chủ động của người gửi, không phải lớp được nhận |
| `background` | Mã tự mô tả `new`, `syntax`, `practice`, `unsure` hoặc `null`; thiếu ở dữ liệu cũ là chưa cung cấp, không suy ra chưa biết lập trình |
| `curriculum_scope` | A/B/AB/CD hoặc `null` khi cần giữ ngữ cảnh xem kiến thức; server đối chiếu với khóa đã chọn |
| `level` mở rộng | Bổ sung Tiểu học; giữ các giá trị THCS/THPT/Đại học/chưa rõ hiện có |
| `goal` mở rộng | Bổ sung mục tiêu bắt đầu học lập trình nếu UI dùng lựa chọn này; giữ các mục tiêu thi và chưa rõ hiện có |

`program` hiện tại là mã gợi ý công khai (`co-ban`, `nang-cao`, `hsgqg`, `consultation`), không phải enum chương trình database. Khi triển khai hợp đồng mở rộng, server cần tính/kiểm chứng lại từ catalog: A/B → `co-ban`; C → `nang-cao`; E → yêu cầu tư vấn Chủ lực (cần hợp đồng mới, không map vào `hsgqg`); K → `consultation`. Mục tiêu người gửi vẫn được lưu độc lập. Nếu chưa chọn khóa, dùng gợi ý mục tiêu tương thích hiện tại. Không tin giá trị `program` do client tự gửi.

Luồng cũ cần tiếp tục hợp lệ; không sửa payload thư đã xếp hàng. Khi đổi hợp đồng, xem lại fingerprint/idempotency để cùng mã yêu cầu không ghi hai nội dung khác nhau. Form thật chỉ bật khi schema, cấu hình và admin tiếp nhận đã được kiểm chứng. Gửi email lỗi không làm mất yêu cầu đã lưu; thành công chỉ thông báo đã tiếp nhận, không nói tài liệu đã gửi hoặc tài khoản CSATOJ đã được tạo.

**Ràng buộc mã hiện tại:** `lib/consultations.ts` đang strict schema và chưa nhận các trường mới. `app/api/consultations/route.ts` kiểm tra `program` bằng hàm gợi ý từ cấp học/mục tiêu; chọn C với mục tiêu Chuyên Tin có thể bị từ chối nếu chỉ sửa cách tính ở UI. Form frontend chưa gọi API; khi nối cần adapter hoặc triển khai đồng bộ hợp đồng mới.

## K tùy chỉnh — thiết kế nguồn, phiên bản và lịch sử

Chương trình K có thể chọn/phối nội dung từ các khung được trung tâm duyệt. Phiên bản đầu của cơ chế này cần:

1. Gia sư/admin có quyền chọn một hoặc nhiều phiên bản nguồn đã được duyệt/công bố, cùng các chủ đề cần dùng. Chỉ lấy danh mục kiến thức, không sao chép nhận xét hoặc thông tin riêng của học sinh/lớp nguồn.
2. Tạo **bản nháp riêng cho lớp K** bằng nội dung tại thời điểm chọn. Lưu nguồn cho từng phần: ID/phiên bản template, mã chặng/chủ đề gốc, thời điểm và người thực hiện; định danh của bản đích không đè mã nguồn hoặc trùng khi phối nhiều bản.
3. Người phụ trách chỉnh mục tiêu, thứ tự và nội dung phù hợp rồi chủ động công bố. Kiểm tra revision khi ghi, lưu audit và giữ nguyên bản đã công bố đến khi lần mới thành công.
4. Chương trình nguồn cập nhật không tự đổi lớp K. Nếu muốn nhận phiên bản mới, xem thay đổi, chọn nhập vào bản nháp mới và công bố riêng. Có thể truy lại bản nguồn đã dùng trước đó.
5. Nội dung PreVOI chỉ trở thành nguồn khi giáo trình được cung cấp và duyệt; không tự sáng tác phần chưa có hoặc đổi K thành HSGQG.

Đây là **thiết kế chưa triển khai**. Hiện UI chỉ liệt kê template cùng `program`; RPC `save_learning_record` cũng buộc chương trình template trùng chương trình lớp. Validation TypeScript và trigger migration 20 không cho template có mã A/B/CD thuộc `custom`. Cần migration mới và thay đổi validation/RPC/UI có kiểm thử trước khi K dùng nguồn chéo chương trình. Không lách bằng việc bỏ mã hoặc đổi `program` của template nguồn.

Đợt UI này không thay schema, default, curriculum JSON, template hoặc lớp thật; không chạy lại migration 20.

## Giới thiệu trung tâm và nguồn nội dung

Cách giới thiệu được chủ trung tâm cập nhật khi duyệt bản production: **CSAT — Gia sư chuyên Phan**, với đội ngũ gia sư cựu học sinh chuyên Tin Trường THPT Chuyên Phan Bội Châu. Trọng tâm là lập trình thi đấu và tư duy thuật toán. Không thêm học hàm, kinh nghiệm hoặc thành tích chưa có nguồn.

Câu giới thiệu chung không ghi đè hồ sơ từng gia sư. Mặc định hồ sơ hiện có “Cựu học sinh…” và ngoại lệ do admin quản lý vẫn là luồng riêng.

| Nguồn | Phạm vi được sử dụng |
|---|---|
| Danh sách kiến thức, tiếp nhận 22/09/2026 | A01–A09, B01–B15, C01–C12, D01–D07; giữ 24+19 chủ đề |
| Xác nhận 23/09, mốc áp dụng 24/09/2026 | Cơ bản mặc định A+B, Nâng cao C+D; chỉ là mốc lịch sử đã ghi nhận, không phải lần đọc production mới |
| Poster tuyển sinh được cung cấp 03/10/2026 | Tên, giá, đối tượng và hình thức A/B/C; tham chiếu lịch sử cho E/K |
| Xác nhận ngày 04/10, được thay ngày 05/10/2026 | Quyết định cũ E PreVOI đã hết hiệu lực; K tùy chỉnh và đội ngũ chuyên Phan vẫn giữ |
| Ảnh và xác nhận trực tiếp ngày 05/10/2026 | E Chủ lực: tuyển riêng từ C, HSG Tỉnh/tuyển sinh chuyên Tin, 3–4 học sinh, 2 giờ/buổi; lịch theo thành viên lớp; PreVOI giữ riêng trong quản lý |
| Poster Trần Hải Đăng được cung cấp và cho phép sử dụng | Thủ khoa khóa 52; Giải Nhất HSGQG 2025–2026, hạng 3 toàn quốc; Giải Nhì và Giải Ba HSGQG 2023–2025 |

Thành tích Hải Đăng chỉ gắn với cá nhân này. Không diễn giải “Thủ khoa khóa 52” thành một kỳ thi cụ thể, không suy rộng thành thành tích toàn trung tâm hoặc cam kết kết quả cho học viên. Thành tích học viên chờ nguồn được cung cấp.

Poster và tài liệu nguồn nội bộ không đưa vào Git. Ảnh/asset công khai cần nguồn và quyền sử dụng; không diễn đạt ảnh minh họa là ảnh lớp học thật của CSAT. Bản website không hiện chú thích biên tập.

## Kiểm chứng hiện tại và khi mở rộng

- Catalog có đúng năm mã; A+B chỉ là cách xem; đủ 9/15/19 chủ đề từ nguồn, không sao chép C+D thành PreVOI.
- E dùng tên Chủ lực và điều kiện/sĩ số/thời lượng mới được duyệt; mục tiêu quốc gia không gắn E. Giáo trình và học phí chưa duyệt nằm trong tài liệu, không bịa nội dung lên website.
- No-JS vẫn đọc được E/K và liên hệ qua Zalo/Facebook; form chỉ xuất hiện khi đã bật tiếp nhận. Query không nhận/lan truyền dữ liệu tự do.
- Intake kiểm tra dữ liệu cũ/mới, khóa–phạm vi không khớp, thiếu cờ bật, gửi trùng và email lỗi sau khi lưu thành công.
- K kiểm tra quyền, source/version, trùng chủ đề, chỉnh đồng thời, nháp/công bố và nguồn đổi phiên bản không làm thay nội dung lớp đã công bố.
- Ghi riêng kết quả prototype, test môi trường thử và production; không gọi hợp đồng dự kiến là chức năng đang vận hành.
