# Backend: tiếp nhận đơn, chương trình và phụ huynh

Tài liệu giữ hợp đồng ba luồng đã duyệt và tiêu chí nghiệm thu. Bản triển khai, registry và kết quả kiểm chứng ở [PROJECT_STATUS](PROJECT_STATUS.md); không coi tên tài liệu là chứng nhận backend đã hoàn tất.

## Tiếp nhận đăng ký và tư vấn

`PublicConsultation` → `/api/consultations` → `submit_registration` (migration 24, cần 18).

- Hai form lưu chung `consultation_requests`, phân biệt nguồn bằng `data.source_path`. Schema v2 có consent, source path và khóa quan tâm; API/RPC kiểm tra dữ liệu, Origin/body, honeypot, rate limit và request ID chống trùng.
- Nút **Đăng kí ngay** gửi trực tiếp, không bước xem lại; lỗi giữ dữ liệu để thử lại. Chỉ thông báo tiếp nhận khi database xác nhận lưu thành công.
- `/admin/consultations` là mục “Đăng ký & tư vấn”: tổng hợp ba trạng thái, tìm tên/số, lọc khóa/nguồn/ngày theo giờ Việt Nam, phân trang 50 đơn. Dialog có liên hệ, sao chép số và lịch sử.
- Admin đổi Mới → Đã liên hệ → Đã hoàn tất bằng revision và `consultation_status_history`; conflict buộc tải lại. Lỗi truy vấn không hiển thị thành số 0.
- Đơn mới không tạo outbox/email, học sinh hoặc xếp lớp. Chưa có ghi chú nội bộ/phân công người xử lý. Học liệu giữ xem lại/sao chép/liên hệ.

Email trung tâm là phần bổ sung sau: phải nối hợp đồng thông báo cho intake v2, không chỉ bật cờ gửi của luồng cũ. Lưu đơn độc lập gửi thư.

## Phân loại chương trình

`classes.program_code`: A/B/AB/C/E/PREVOI/K; AB hiển thị A+B. `program_revision`, RPC `admin_set_class_program` và `class_program_history` bảo vệ thay đổi admin có xác nhận.

| Mã | Mặc định giáo án |
|---|---|
| A/B/AB | Phần tương ứng khung basic; Cơ bản mặc định AB |
| C | advanced, giữ đầy đủ C01–D07/scope CD |
| PREVOI | voi và giáo án riêng; không dùng E |
| E/K | custom; chưa tự tạo giáo trình chuẩn mới |

Migration 25 đối soát loại lớp đã nhận diện để bổ sung mã, trường chưa rõ giữ null cho admin xác nhận. Quản lý hiện hành dùng mã, không tiếp tục suy từ tên. Đổi mã không đổi tên/ID lớp, giáo án đã công bố, giá hoặc lịch sử; không tách lớp Cơ bản thành hai lớp vật lý. K phối nguồn chéo chương trình vẫn là đề xuất chờ duyệt.

## Truy cập phụ huynh

Số điện thoại đã liên kết → Turnstile → phiên lookup 12 giờ. Không mật khẩu/OTP/Supabase Auth phụ huynh. API/RPC kiểm hồ sơ active, phiên còn hiệu lực, liên kết học sinh–lớp và bản công bố. Gia sư/admin giữ Auth; hai luồng dùng chung giới hạn nguồn trong DB.

Migration 27 thay luồng Auth của 26, thu hồi phiên/RPC cũ nhưng giữ dữ liệu và Auth users lịch sử. Không cấp/reset thêm Auth phụ huynh; công cụ provisioning hiện chỉ đối soát và từ chối `--apply`. Admin bổ sung liên hệ thiếu, không tự lấy số học sinh.

[Runbook số điện thoại](PARENT_PHONE_ACCESS.md) · [CAPTCHA](LOGIN_CAPTCHA.md). Người biết số có thể đọc dữ liệu liên kết; SEC-02 vẫn mở.

## Phụ thuộc và nghiệm thu

Ba chuỗi: **18 → 24**, **23 → 25**, **23 → 26 → 27**; không kéo 19/21/22 vào chỉ để vận hành ba luồng này. Không chạy lại migration đã có. Xem [database README](../database/README.md) và [setup](SETUP_VERCEL_SUPABASE.md).

| Luồng | Tiêu chí nghiệm thu còn cần trên môi trường thật được phép |
|---|---|
| Đơn đăng ký | Gửi hợp lệ đến admin; retry/đồng thời không trùng; lỗi giữ bản nhập; quyền đọc và conflict revision đúng; không mail/outbox |
| Chương trình | A/B/AB/C và PreVOI/K đúng; đổi mã giữ giáo án nháp/công bố, C/D, học phí và lịch sử |
| Phụ huynh | CAPTCHA và login hai vai trò; phiên hết hạn/thu hồi, hồ sơ khóa, nhiều con/lớp, bài ngoài quyền bị từ chối |
| Vận hành | Staging, kiểm chuỗi đầy đủ/tối thiểu, backup và phục hồi; fixture không thay Supabase thật |

Mọi kết quả mới cập nhật vào PROJECT_STATUS, không nối biên bản triển khai lặp trong tài liệu này.
