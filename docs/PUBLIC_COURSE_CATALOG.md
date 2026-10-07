# Catalog khóa học công khai

Nguồn chuẩn cho tên lớp/dữ kiện tuyển sinh và hợp đồng tích hợp tương lai. Nội dung học ở [chương trình](CHUONG_TRINH_DAO_TAO.md); UI ở [website](PUBLIC_WEBSITE.md). Các hợp đồng intake/K bên dưới **chưa triển khai vào API/RPC/database**.

## Quyết định hiện hành

- Năm lớp công khai A/B/C/E/K. A/B tách riêng; A+B chỉ gộp tạm trong quản lý, không trang/tư vấn/tuyển sinh công khai.
- **C — Lập trình thi đấu nâng cao** là tên chung hai phần C/D và các lớp nâng cao tương lai. Giữ 19 chủ đề/6 chặng, C01–C12/D01–D07, scope CD; chưa đổi admin/gia sư/enum/template/lớp cũ.
- **E — Chủ lực** chọn lọc từ C khi đủ năng lực và đạt bài thi tuyển riêng; không bắt buộc hoàn thành toàn bộ C. Hướng chuẩn chuyên Tin/thứ hạng cao trong lập trình thi đấu; không phải PreVOI, không tự gán voi.
- **K — Kèm riêng** học 1–1/nhóm riêng với phạm vi từ khung đã duyệt; không đồng nghĩa HSGQG.
- Đội ngũ cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu; thông điệp tập thể không sửa hồ sơ cá nhân.
- Giá tuyển sinh không đổi đơn giá lớp đang vận hành hoặc học phí lịch sử. Khung không ấn định số buổi/đảm bảo kết quả thi.

## Dữ kiện lớp

| Mã | Tên | Phạm vi/đối tượng | Giá và tổ chức |
|---|---|---|---|
| A | Nhập môn lập trình | A01–A09, 9 chủ đề/3 chặng; lớp 5–7 làm quen C++ | 99.000đ/buổi; 90 phút; 5–8 học sinh |
| B | Lập trình thi đấu cơ bản | B01–B15, 15 chủ đề/4 chặng; lớp 7–9, HSG cấp Phường hoặc chuyên Tin tỉnh không quá cạnh tranh | 99.000đ/buổi; 90 phút; 5–8 học sinh |
| C | Lập trình thi đấu nâng cao | C01–D07, 19 chủ đề/6 chặng; lớp 7–9, HSG cấp Tỉnh hoặc chuyên Tin tỉnh mạnh/cạnh tranh | 109.000đ/buổi; 90 phút; 5–8 học sinh |
| E | Chủ lực | Chọn lọc từ C; thuật toán, tư duy toán học và giải quyết vấn đề | 3–4 học sinh; 2 giờ/buổi; lịch theo thành viên; học phí trao đổi |
| K | Kèm riêng | 1–1/nhóm đăng ký riêng, nội dung tùy nhu cầu | Phạm vi/lịch/thời lượng/học phí thống nhất trước học |

Đối tượng A/B/C bám nội dung nguồn poster đã đối chiếu, không thay bằng mô tả quảng cáo hoặc kết luận năng lực theo tuổi.

E có ba trọng tâm đã duyệt:
1. Tri thức và liên hệ phương pháp: đào sâu nền C, phát triển thuật toán/tư duy toán học/lập luận và giải quyết vấn đề.
2. Gia sư từ giải Nhất cấp Tỉnh đến HSG Quốc gia; nhóm chọn lọc chung định hướng/quyết tâm, kinh nghiệm đàn anh/đàn chị tạo môi trường và động lực.
3. Bài tập chuyên sâu từ đề thi thật/đề luyện thi, ưu tiên sớm contest CSAT và cơ hội giao lưu/cọ xát.

CSATOJ luyện/chấm bài; CSAT Portal theo dõi quá trình. Không tự tạo danh mục giáo trình/học phí E, tiêu chí thi tuyển, lịch contest, chỉ số API hoặc cam kết thành tích.

## Catalog khác chương trình và hình thức

| Khái niệm | Giá trị | Quy tắc |
|---|---|---|
| Khóa công khai | A/B/C/E/K | Lựa chọn tìm hiểu, chưa là enum loại lớp database |
| Chương trình quản lý | basic/advanced/voi/custom | Gán qua thao tác có quyền, không tự map mã public |
| Hình thức | group/individual | Độc lập với chương trình |
| Scope Cơ bản hiện hành | A/B/A+B, mặc định A+B | Không tự suy học sinh đã thành thạo A khi chọn B |
| Phiên bản giáo án | template_id/version | Nháp/công bố, revision và lịch sử |

A/B lấy phần tương ứng basic; C lấy advanced C+D; PreVOI/voi quản lý giữ riêng E. Một lớp 1–1 vẫn có thể dùng basic/advanced với individual; custom chỉ khi có chương trình tùy chỉnh đúng hợp đồng. Tách lớp tương lai/chuyển lớp thật cần đặc tả và quyền riêng.

## Selector, tag và đăng ký

Selector hỏi cấp học, mục tiêu, nền tảng tự mô tả, không phải bài kiểm tra. Mới bắt đầu → A; làm quen cú pháp → A/B; đã luyện bài → B/C; chưa rõ → xem lớp và trao đổi. Người đọc được chọn lớp khác; không tự chẩn đoán cần K hoặc đủ điều kiện E.

Form chỉ vai trò Phụ huynh/Học sinh; cấp học Tiểu học/THCS/THPT. Bỏ Sinh viên, Đại học, cấp học Trao đổi thêm, mục tiêu HSG Quốc gia. URL chỉ enum whitelist, không liên hệ/free text, không nhận course=AB. Alias basic/co-ban về tổng quan, hsgqg/voi/prevoi về đăng ký chung, không gán E.

Hashtag tổng quan:
- A: #NhậpMônC++ · #Lớp5Đến7 · #NềnTảngChuyênTin.
- B: #ThiĐấuCơBản · #SốHọcVàTìmKiếm · #HSGCấpPhường.
- C: #ThuậtToánNângCao · #HSGCấpTỉnh · #ChuyênTin.
- E/K không hashtag. Đây là nhãn định hướng, không thêm giáo trình/cam kết.

Đăng ký dùng mẫu 3 thẻ, facts ngay dưới tên và tag kiến thức; E/K chỉ tag định hướng đã duyệt. CTA lớp X → /dang-ky-hoc?course=X#thong-tin; server/form mặc định X, route lớp thắng query khác. Người dùng có thể đổi lựa chọn. PublicConsultation chỉ nhập/validate/xem lại/sao chép/liên hệ, không API/database.

## Hợp đồng intake dự kiến

**Đề xuất kỹ thuật chờ duyệt:** các trường và mapping bên dưới chưa phải quyết định triển khai của chủ trung tâm. Định hướng form công khai đã duyệt không đồng nghĩa với duyệt schema này; cần chốt hợp đồng trước khi nối API.

Mở rộng luồng tư vấn hiện có cùng lúc ở validation, API, RPC, admin và email. Các trường bổ sung tối thiểu:

| Trường dự kiến | Ý nghĩa và tương thích |
|---|---|
| `request_kind` | `consultation` hoặc `materials`; yêu cầu cũ thiếu trường là tư vấn |
| `course_interest` | A/B/C/E/K hoặc `null`; là lựa chọn chủ động của người gửi, không phải lớp được nhận |
| `background` | Mã tự mô tả `new`, `syntax`, `practice`, `unsure` hoặc `null`; thiếu ở dữ liệu cũ là chưa cung cấp, không suy ra chưa biết lập trình |
| `curriculum_scope` | A/B/C hoặc `null` theo tên công khai mới; hợp đồng tương lai cần đối chiếu C với scope nội bộ CD hiện có, không tự sửa payload/schema đang strict. AB chỉ giữ trong quản lý |
| `level` mở rộng | Bổ sung Tiểu học; giữ các giá trị THCS/THPT/Đại học/chưa rõ hiện có |
| `goal` mở rộng | Bổ sung mục tiêu bắt đầu học lập trình nếu UI dùng lựa chọn này; giữ các mục tiêu thi và chưa rõ hiện có |

`program` hiện tại là mã gợi ý công khai (`co-ban`, `nang-cao`, `hsgqg`, `consultation`), không phải enum chương trình database. Khi triển khai hợp đồng mở rộng, server cần tính/kiểm chứng lại từ catalog: A/B → `co-ban`; C → `nang-cao`; E → yêu cầu tư vấn Chủ lực (cần hợp đồng mới, không map vào `hsgqg`); K → `consultation`. Mục tiêu người gửi vẫn được lưu độc lập. Nếu chưa chọn khóa, dùng gợi ý mục tiêu tương thích hiện tại. Không tin giá trị `program` do client tự gửi.

Luồng cũ cần tiếp tục hợp lệ; không sửa payload thư đã xếp hàng. Khi đổi hợp đồng, xem lại fingerprint/idempotency để cùng mã yêu cầu không ghi hai nội dung khác nhau. Form thật chỉ bật khi schema, cấu hình và admin tiếp nhận đã được kiểm chứng. Gửi email lỗi không làm mất yêu cầu đã lưu; thành công chỉ thông báo đã tiếp nhận, không nói tài liệu đã gửi hoặc tài khoản CSATOJ đã được tạo.

**Ràng buộc mã hiện tại:** `lib/consultations.ts` đang strict schema và chưa nhận các trường mới. `app/api/consultations/route.ts` kiểm tra `program` bằng hàm gợi ý từ cấp học/mục tiêu; chọn C với mục tiêu Chuyên Tin có thể bị từ chối nếu chỉ sửa cách tính ở UI. Form frontend chưa gọi API; khi nối cần adapter hoặc triển khai đồng bộ hợp đồng mới.

## K tùy chỉnh — thiết kế nguồn, phiên bản và lịch sử

**Đề xuất kỹ thuật chờ duyệt:** cơ chế sao chép, phối nguồn và cập nhật phiên bản bên dưới chưa được duyệt để triển khai. Quyết định hiện hành chỉ xác nhận K học theo nhu cầu với nội dung trung tâm đã duyệt; không tự coi đó là phê duyệt toàn bộ cơ chế dữ liệu này.

Chương trình K có thể chọn/phối nội dung từ các khung được trung tâm duyệt. Phiên bản đầu của cơ chế này cần:

1. Gia sư/admin có quyền chọn một hoặc nhiều phiên bản nguồn đã được duyệt/công bố, cùng các chủ đề cần dùng. Chỉ lấy danh mục kiến thức, không sao chép nhận xét hoặc thông tin riêng của học sinh/lớp nguồn.
2. Tạo **bản nháp riêng cho lớp K** bằng nội dung tại thời điểm chọn. Lưu nguồn cho từng phần: ID/phiên bản template, mã chặng/chủ đề gốc, thời điểm và người thực hiện; định danh của bản đích không đè mã nguồn hoặc trùng khi phối nhiều bản.
3. Người phụ trách chỉnh mục tiêu, thứ tự và nội dung phù hợp rồi chủ động công bố. Kiểm tra revision khi ghi, lưu audit và giữ nguyên bản đã công bố đến khi lần mới thành công.
4. Chương trình nguồn cập nhật không tự đổi lớp K. Nếu muốn nhận phiên bản mới, xem thay đổi, chọn nhập vào bản nháp mới và công bố riêng. Có thể truy lại bản nguồn đã dùng trước đó.
5. Nội dung PreVOI chỉ trở thành nguồn khi giáo trình được cung cấp và duyệt; không tự sáng tác phần chưa có hoặc đổi K thành HSGQG.

Đây là **thiết kế chưa triển khai**. Hiện UI chỉ liệt kê template cùng `program`; RPC `save_learning_record` cũng buộc chương trình template trùng chương trình lớp. Validation TypeScript và trigger migration 20 không cho template có mã A/B/CD thuộc `custom`. Cần migration mới và thay đổi validation/RPC/UI có kiểm thử trước khi K dùng nguồn chéo chương trình. Không lách bằng việc bỏ mã hoặc đổi `program` của template nguồn.

Các thay đổi public không thay schema, default, curriculum JSON, template hoặc lớp thật; không chạy lại migration 20.

## Nguồn và kiểm chứng

Nguồn nội dung: chương trình trung tâm/JSON chuẩn, poster đã đối chiếu, quyết định trực tiếp chủ trung tâm. Dữ kiện và định hướng hiện hành bên trên thay phương án cũ E PreVOI; không dùng poster cũ để phục hồi tên/giá/giáo trình hết hiệu lực.

Thành tích gia sư gắn đúng cá nhân trong component đã duyệt, không suy rộng thành kết quả học viên. Thành tích học sinh theo [danh mục riêng](PUBLIC_ACHIEVEMENTS.md). Poster/Excel nguồn giữ nội bộ; chỉ asset tối ưu có quyền vào runtime.

Kiểm chứng catalog đúng năm mã, A9/B15/C19 và thứ tự; C công khai nhưng CD nội bộ nguyên vẹn; E tuyển riêng, không mục tiêu quốc gia tự gán. Query/alias/default course phải tương thích. No-JS có nội dung/liên hệ; form không báo gửi giả.

Khi nối intake, thử dữ liệu cũ/mới, mismatch khóa/scope, idempotency, cờ tắt và email lỗi sau lưu thành công. Khi triển khai K, thử quyền/source/version/trùng chủ đề/concurrency và nguồn cập nhật không đổi bản đã công bố. Trạng thái ghi [PROJECT_STATUS](PROJECT_STATUS.md), không gọi hợp đồng dự kiến là đã vận hành.
