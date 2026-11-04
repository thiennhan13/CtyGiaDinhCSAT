# Kế hoạch hoàn thiện email CSAT Portal

Phương án đã chọn: Resend gửi bằng tên miền được xác minh; Gmail trung tâm nhận và phản hồi. Không dùng Gmail SMTP/OAuth, không bắt buộc mua mailbox tên miền.

Kế hoạch này dành cho backend Portal; chưa phải thay đổi mã hoặc quyền bật gửi. CSATOJ là hệ thống bên ngoài: chỉ dùng API khi cần, yêu cầu chủ trung tâm xử lý thay đổi bên OJ. Email không phụ thuộc CSATOJ.

## Phạm vi và thứ tự phát hành

- Nhắc nhận xét/tag tháng cho gia sư, gộp một thư/gia sư; tổng hợp cho admin.
- Cron tháng hiện có, xử lý ngoại lệ qua admin; chưa thêm scheduler retry.
- Không tự công bố nhận xét, chốt sổ hoặc gửi báo cáo phụ huynh.
- Đợt 1: hoàn thiện nhắc nhận xét/tag tháng và tổng hợp admin đang có.
- Đợt 2: thông báo đơn đăng ký/tư vấn intake v2 tới trung tâm. Hợp đồng đề xuất bên dưới cần được chốt trước triển khai; không gửi thư xác nhận cho phụ huynh trong đợt này.
- Giữ snapshot/payload/idempotency/lease; không reset job để thử lại. Provider accepted không đồng nghĩa Gmail đã nhận hoặc người dùng đã đọc.

## 1. Chốt cấu hình và chuẩn bị môi trường

| Hạng mục | Cách thực hiện | Điều kiện xong |
|---|---|---|
| Domain và sender | Dùng domain Resend hiện có `portal.csatoj.vn`; đề xuất From `CSAT <thongbao@portal.csatoj.vn>`, Reply-To `csattutor@gmail.com` | Chủ trung tâm chốt From; Resend báo Verified/Sending enabled; đối chiếu DNS và DMARC |
| Khóa/cấu hình | Sending access giới hạn domain; kiểm `RESEND_API_KEY`, `CSAT_EMAIL_FROM`, `CSAT_EMAIL_REPLY_TO`, `APP_ORIGIN`, `CRON_SECRET` bằng trạng thái, không xuất giá trị secret | Đúng môi trường, secret chỉ server; công tắc gửi vẫn tắt |
| Gửi mẫu | Cập nhật allowlist sender và test của `scripts/email-smoke.cjs`; giữ recipient Gmail trung tâm, dữ liệu giả, mặc định dry-run | Sender mới được chấp nhận, sender khác bị chặn; retry giữ UUID/payload; không gửi lại mẫu accepted |
| Database | Đối soát registry và cấu trúc thực trước chọn chain; nền email 19 → 21, kiểm tương thích với schema hiện có đến 27 | Có môi trường Supabase thử tách biệt, fixture giả, kế hoạch backup/restore; không mặc định production đã có 19/21 |

Nguồn trạng thái/DNS là [PROJECT_STATUS](PROJECT_STATUS.md). Không tạo lại domain hoặc thay bản ghi theo mẫu nếu cấu hình nhà cung cấp hiện tại khác mẫu. SMTP cho thư mời/khôi phục Supabase Auth thuộc SEC-01, là luồng riêng; key email nghiệp vụ không tự cấu hình SMTP Auth.

## 2. Sửa hàng đợi email tháng

Viết test tái hiện trước rồi bổ sung migration mới sau số cuối thực tế trong repo (hiện là 27). Giữ nguyên migration đã phát hành; không gộp migration hồ sơ/avatar vào chỉ để gửi email.

| Công việc | Thay đổi dự kiến | Tiêu chí nghiệm thu |
|---|---|---|
| MAIL-01 | Phân biệt tuổi thư gia sư và thư tổng hợp; tuổi tổng hợp tính từ lúc tạo thư | Đợt hơn 7 ngày vẫn gửi được tổng hợp vừa tạo; thư thực sự quá hạn được xử lý đúng; qua tháng không sinh bản trùng |
| MAIL-02 | Ghi `next_attempt_at` ngay lúc claim và kiểm nó khi reclaim lease | Worker chết: hơn 3 phút nhưng chưa đủ 5 phút không claim; đủ 5 phút được claim; finish lease cũ không ghi đè lease mới |
| Chống trùng | Giữ snapshot/payload và idempotency key sau lần gửi đầu | Provider accepted nhưng ghi DB lỗi/timeout vẫn chỉ retry cùng key/payload trong cửa sổ cho phép |
| Quyền | Giữ admin/cron authorization và RPC grants đúng vai trò | Anonymous/gia sư không chuẩn bị, drain hoặc đối soát hàng đợi; request khác Origin bị từ chối |
| Tương thích | Kiểm cả migration nền và migration sửa trên schema kết hợp với 27 | Không đổi projection/quyền tra cứu phụ huynh, nhận xét đã công bố hoặc lịch sử học phí |

Giữ lease 3 phút, retry ít nhất 5 phút, tối đa 3 lần, cửa sổ tự động dưới 23 giờ. Hết hạn hoặc kết quả chưa rõ chuyển kiểm tra thủ công; không reset/xóa job để lách giới hạn. Chi tiết hợp đồng ở [FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md).

## 3. Hoàn thiện vận hành và nội dung thư

- Rà nội dung tiếng Việt, tiêu đề, From/Reply-To, link đúng Portal và snapshot thời điểm lập thư. Nhắc gia sư chỉ gồm việc cần làm; tổng hợp admin dẫn về dữ liệu hiện tại. Không ghi payload, danh sách người nhận hay secret vào log.
- Giữ cron `0 1 28 * *` = 08:00 ngày 28 theo giờ Việt Nam; không thêm scheduler retry. Worker hiện giới hạn 35 thư/lượt và ngân sách thời gian, nên không cam kết một lượt xử lý hết.
- Admin có thể xem hàng đợi, chuẩn bị đợt hợp lệ bị bỏ lỡ, xử lý tiếp các job đủ điều kiện và ghi nhận đối soát. Rà API/UI hiện có trước bổ sung; hiển thị rõ queued/sending/accepted/failed/manual_review/skipped và lý do có thể hành động.
- Sau 09:00 ngày 28, admin kiểm số còn chờ/lỗi và xử lý tiếp; thử trường hợp trên 35 job, thiếu email, đổi phân công, không còn nhận xét cần nhắc và đợt qua tháng. Nếu không có người vận hành, phải chốt lại mô hình retry trước bật, không âm thầm thêm cron.
- `accepted` chỉ là Resend tiếp nhận. Đợt đầu đối chiếu Resend và hộp thư người nhận thủ công. Webhook delivered/bounced/complained chưa phải điều kiện triển khai đợt 1; nếu cần theo dõi tự động sẽ có phạm vi riêng với xác minh chữ ký, chống lặp và quyền dữ liệu.

## 4. Thông báo đăng ký/tư vấn intake v2 — đợt 2

### Hợp đồng đề xuất để chốt

- Một thông báo tới `csattutor@gmail.com` cho mỗi đơn mới sau thời điểm bật; không gửi hàng loạt các đơn cũ.
- Thư nêu mã đơn, thời điểm, nguồn và khóa quan tâm, dẫn tới admin để xem thông tin liên hệ/nội dung đầy đủ. Không đưa toàn bộ thông tin cá nhân vào email nếu không cần; không đặt email người gửi chưa xác minh làm From.
- Lưu đơn thành công là điều kiện báo tiếp nhận. Resend lỗi hoặc chậm không làm API báo mất đơn, không yêu cầu người dùng nộp lại.
- Retry cùng request ID không tạo thêm đơn/thông báo. Giữ hàng chờ và snapshot luồng tư vấn cũ, không chuyển đổi hoặc gửi lại ngầm.

### Cách triển khai dự kiến

1. Rà khả năng dùng outbox hiện có và hợp đồng reconciliation; dùng migration mới nối intake v2, không gọi template cũ vốn dùng trường `program/level` khác catalog v2.
2. Lưu đơn và ý định thông báo tối thiểu trong cùng transaction khi bật tính năng, với khóa duy nhất theo request ID. Chưa gọi provider trong transaction; thiếu key, template hoặc provider lỗi không được làm thất bại việc lưu đơn. Trước mốc bật không tạo job gửi; đơn cũ không được backfill chỉ do retry.
3. Sau xác nhận lưu, API có thể thử gửi trong ngân sách thời gian còn lại; khi không đủ thời gian hoặc lỗi, job còn bền vững để admin xử lý. Không dùng promise chạy nền không được quản lý hoặc tạo hai bước lưu có khoảng trống làm mất thông báo khi tiến trình chết.
4. Chuẩn bị payload trước lần gửi đầu, đóng băng payload/idempotency khi bắt đầu thử; claim/finish có lease. Lỗi không rõ kết quả được đối soát theo cùng nguyên tắc hàng đợi tháng.
5. Bổ sung hoặc hoàn thiện API/admin để đọc trạng thái, xử lý job đủ điều kiện và đối soát; không phụ thuộc cron tháng để thông báo đơn mới. Giữ quyền admin, Origin và audit.
6. Kiểm thử đồng thời/trùng ID, cùng ID khác nội dung, tắt cờ, worker chết sau lưu, timeout/429, lưu kết quả lỗi và tách đơn v1/v2. Admin kiểm hàng chờ đầu/cuối ngày theo workflow hiện hành.

Việc nối thông báo intake là thay đổi có chủ ý so với hợp đồng hiện tại “không outbox”. Khi triển khai phải cập nhật DECISIONS/BACKEND_COMPLETION/ARCHITECTURE và test tương ứng; không chỉ bật `CONSULTATIONS_EMAIL_ENABLED`.

## 5. Kiểm thử và phát hành từng đợt

1. **Local với Node.js 24:** chạy test nghiệp vụ/migration/concurrency liên quan, dùng provider mock; sau đó đủ `check:repo`, `test:repo`, `test:db`, `typecheck`, `lint:strict`, `build`. Ghi rõ ca bị chặn/skipped; không thay kết quả thiếu bằng build xanh.
2. **Supabase thử:** xác minh migration chain, quyền, preservation và tranh chấp worker với fixture giả; thử restore trong môi trường được phép. Nếu đổi admin UI, thực hiện browser QA. Không sao chép hồ sơ production làm fixture.
3. **Preview:** kiểm UI/API và việc chặn gửi thật. Gửi thật ở Preview/local vẫn bị chặn; không giả `VERCEL_ENV` để thử provider.
4. **Gói phát hành:** chuẩn bị diff, SQL mới, verification, cấu hình cần thay, danh sách người nhận xem trước và cách dừng gửi. Hoàn thành phần local trước khi xin quyền migration/deploy/gửi thật theo đúng phạm vi.
5. **Mẫu thật được phép:** dùng công cụ smoke với người nhận cố định Gmail trung tâm, dữ liệu giả và state bền vững. Kiểm Resend, Inbox/Spam, tiếng Việt, link, From/Reply-To; mẫu consultation phải phản ánh template intake v2 khi nghiệm thu đợt 2.
6. **Bật từng luồng:** email tháng trước; intake sau khi nghiệm thu hợp đồng v2. Trước mỗi lần bật, xem trước recipient/job đủ điều kiện và đối soát hàng cũ để tránh gửi bất ngờ; theo dõi lượt đầu và ghi bằng chứng tổng hợp vào PROJECT_STATUS.

Mẫu thật đạt chỉ chứng minh đường gửi. Cần nghiệm thu cả luồng nghiệp vụ → outbox → worker → kết quả bằng phạm vi người nhận đã được phép trước khi tuyên bố tính năng hoàn tất.

**Dừng gửi:** tắt cấu hình email tháng; tắt công tắc email intake và phát hành cấu hình tương ứng; tắt cron nếu cần ngừng lượt gọi mới. Thư đã được nhà cung cấp tiếp nhận không thu hồi được. Giữ outbox/audit, dùng app tương thích schema và migration bù khi cần, không restore đè làm mất đơn/lịch sử mới.

## Điều kiện chốt trước khi triển khai/bật

- Địa chỉ From: đề xuất `CSAT <thongbao@portal.csatoj.vn>`; người nhận/phản hồi tiếp tục Gmail trung tâm.
- Phạm vi thông báo intake v2 và nội dung tối thiểu ở bước 4.
- Project Supabase thử và người phụ trách kiểm hàng đợi/thư mẫu.

Các nội dung này không cản trở việc chuẩn bị test tái hiện và bản sửa MAIL-01/02 khi được giao triển khai. Kế hoạch hiện tại chưa cấp quyền thao tác production hoặc gửi thư thật.

## Nguồn thực hiện

[FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md) sở hữu MAIL-01/02, hợp đồng hàng đợi, thiết lập nhà cung cấp, gửi mẫu và tiêu chí nghiệm thu. [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md) sở hữu môi trường và phụ thuộc schema. [PROJECT_STATUS](PROJECT_STATUS.md) sở hữu trạng thái triển khai.

Giữ tên file để liên kết cũ còn hoạt động. Kế hoạch này sở hữu thứ tự triển khai; PROJECT_STATUS sở hữu bằng chứng và trạng thái, không sao chép nhật ký kiểm thử vào đây.
