# Bàn giao ba luồng backend

Phạm vi mã hiện tại: tiếp nhận đăng ký public, phân loại chương trình lớp và tra cứu phụ huynh bằng số điện thoại. Bằng chứng local của bản cũ ở cuối tài liệu; trạng thái bản tra cứu mới ở PROJECT_STATUS; **chưa nghiệm thu end-to-end staging/production** vì chưa có project Supabase staging. Người dùng đã tự chạy SQL 18/24/25/26; theo ủy quyền tiếp theo đã cấp 44 Auth parent và đối soát production ngày 14/10/2026. Bản nâng cấp nhận đơn 661717f đã triển khai production ngày 14/10/2026; người dùng tự cấu hình cờ/khóa và endpoint xác nhận enabled. Chưa nghiệm thu gửi đơn hợp lệ và phiên admin thật; bằng chứng chi tiết ở PROJECT_STATUS.

## Hợp đồng đã triển khai trong mã

| Luồng | Hành vi và ranh giới |
|---|---|
| Đăng ký | `PublicConsultation` → `/api/consultations` → `submit_registration` (24). Schema v2 có consent, source path và lựa chọn khóa; validate phía API/RPC, giới hạn body, Origin, honeypot, rate limit và idempotency. Lưu `consultation_requests`; đơn mới không tạo outbox hoặc gửi email. Admin đọc đơn cũ/mới, đổi trạng thái bằng revision và `consultation_status_history`. Học liệu vẫn là luồng xem lại/sao chép/liên hệ hiện có. |
| Chương trình | `classes.program_code`: A/B/AB/C/E/PREVOI/K; AB hiển thị A+B. `program_revision`, RPC `admin_set_class_program` và `class_program_history` bảo vệ thay đổi admin. Mapping chỉ dựa loại lớp nhận diện rõ; trường chưa nhận diện giữ null để admin đối soát. Không đổi tên lớp, giáo án cũ, giá hoặc lịch sử. |
| Phụ huynh | Số điện thoại → phiên lookup 12 giờ; không Auth. API/RPC kiểm tra hồ sơ active, phiên, liên kết và bản công bố. Gia sư/admin giữ email/mật khẩu; giới hạn nguồn dùng chung trong DB. Xem PARENT_PHONE_ACCESS. |

A/B/AB dùng basic với phần tương ứng, C dùng advanced C+D; giữ C01–D07/scope CD. PREVOI (PreVOI/HSGQG/Ôn thi VOI) dùng chương trình `voi` và giáo án riêng, **không dùng E**. E và K dùng `custom`; chưa có giáo trình E hoặc cơ chế K phối nguồn chéo chương trình được duyệt. Đổi nhãn chương trình không thay nội dung giáo án đã công bố. Lớp mới tiếp tục theo luồng nháp/công bố của RPC, không tạo nội dung đào tạo giả.

## Tiếp nhận đăng ký và tư vấn

Hai luồng tiếp tục lưu chung `consultation_requests`, phân biệt nguồn gửi bằng `data.source_path`, không suy trạng thái đã nhập học từ nguồn form. `/admin/consultations` là mục menu riêng “Đăng ký & tư vấn”: tổng hợp ba trạng thái toàn danh sách, tìm tên/số điện thoại, lọc khóa/nguồn/ngày theo giờ Việt Nam, phân trang 50 đơn. Chi tiết mở trong dialog, có gọi điện/sao chép số và lịch sử xử lý. Khi xung đột revision phải tải lại trước khi ghi tiếp. Chỉ admin được đọc/cập nhật; lỗi truy vấn thống kê không bị hiển thị thành số 0.

Đợt hoàn thiện này không đổi schema, không tạo học sinh hoặc xếp lớp từ đơn, không thêm ghi chú nội bộ/phân công người xử lý. Email trung tâm bổ sung sau: đơn v2 chưa tạo outbox, nên không chỉ bật cờ email cũ. Lưu đơn độc lập với gửi thư.

## Liên hệ phụ huynh và chuyển đổi

**Quyết định hiện hành:** phụ huynh tra cứu chỉ bằng số điện thoại, không mật khẩu/OTP/Auth; gia sư/admin giữ Auth. Migration27 thay luồng của 26, dùng chung giới hạn thử đăng nhập lưu trong DB. Xem [tra cứu bằng số điện thoại](PARENT_PHONE_ACCESS.md) để chuyển đổi và hiểu giới hạn danh tính. Bằng chứng Auth/26 bên dưới là lịch sử, không phải hướng triển khai tiếp.

Quy trình hiện hành, migration27, verification và điều kiện phát hành nằm trong tài liệu trên. Không chạy lại 18/24/25/26 hoặc provisioning Auth. Hồ sơ còn thiếu liên hệ được admin bổ sung; không tự lấy số học sinh.

## Nghiệm thu còn chờ

| Môi trường | Bằng chứng/giới hạn |
|---|---|
| Local trước quyết định27 | Node24: guard 544 tệp, repo 11/11, database/API 256/256 không skip/cancel, typecheck/lint strict/build cuối/diff check đạt. Có PostgreSQL17 native/concurrency/backup-restore, pre/postflight cả hai thứ tự migration tùy chọn. Browser 32 nhóm/3.752 assertions, đăng ký public 2 nhóm/119 assertions; smoke build cuối Edge155 14 nhóm/167 assertions ở 375/768/1440 px đạt, không lỗi browser/request bất ngờ. Các luồng dùng fixture giả, không xác nhận Supabase Auth thật. |
| Staging | Chưa có Supabase thử; nghiệm thu tra cứu số điện thoại/RLS, chống spam chung, chuyển đổi27 và restore còn chờ. |
| Production | 14/10/2026: đã có 18/24/25/26; cấp mới 44 tài khoản và liên kết đúng, 0 lỗi/0 mồ côi; dry-run sau cấp còn 0 pending, 10 học sinh thiếu liên hệ. Digest 28 bảng nghiệp vụ (loại cột mới theo preflight) và 23 Auth user ngoài parent giữ nguyên. Bản Auth cũ đã phát hành nhưng Phone provider tắt; bản tra cứu mới27 chưa áp/deploy. Backup trước migration có archive/checksum hợp lệ nhưng chưa gồm tài khoản vừa cấp, chưa thử restore. |

Nguồn trạng thái/backlog: [PROJECT_STATUS](PROJECT_STATUS.md). Setup chung: [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md). Không coi tên tài liệu này là chứng nhận hoàn tất production.
