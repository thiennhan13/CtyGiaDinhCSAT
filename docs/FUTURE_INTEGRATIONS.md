# Công việc khi có email tên miền và API

Cập nhật 23/09/2026. Đây là backlog và điều kiện bật tính năng, chưa phải thay đổi đã triển khai. Setup hiện tại: [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md).

## 1. Phân biệt các tích hợp

| Thành phần | Vai trò | Trạng thái |
|---|---|---|
| Supabase URL + anon/service_role | Database, đăng nhập, API nội bộ, Storage | Cần ngay cho Portal; dùng đúng môi trường |
| Resend API key + domain verified | Gửi tư vấn, nhắc gia sư, tổng hợp admin | Mã đã có; chưa cấu hình/gửi thật |
| Hộp thư tên miền | Nhận và trả lời thư như một mailbox | Tùy chọn; không bắt buộc để Resend gửi |
| Gmail API hoặc App Password | Quyền thao tác Gmail/SMTP Gmail | Không cần trong giải pháp đã duyệt |
| API CSATOJ | Bài giải, tổng bài, ranking contest lớp | Chưa triển khai; hiện chỉ có vị trí hiển thị |

## 2. Những việc phải sửa trước khi bật email tháng

Hai mục dưới được đối chiếu trực tiếp với nhánh `claim` trong `database/migrations/20260922_21_parent_email_completion.sql`. Chúng chưa được sửa trong đợt tổng hợp tài liệu. Dùng migration mới sau 22 nếu chưa phát sinh migration khác; không sửa migration đã phát hành.

### MAIL-01 — không làm quá hạn bản tổng hợp admin vừa tạo

- Hiện tại: thư queued chưa từng thử bị chuyển kiểm tra thủ công khi `review_email_runs.created_at` quá 7 ngày, không phân biệt kind.
- Tình huống: đợt cũ còn việc cần xử lý; bản tổng hợp admin được tạo muộn rồi bị claim coi là quá hạn ngay dù bản thân thư mới tạo.
- Cần làm: tách điều kiện hết hạn thư gia sư và tổng hợp admin. Quy tắc tuổi thư admin phải tính theo vòng đời thư đó, không bị tuổi đợt cũ loại bỏ ngay; vẫn giữ snapshot, khóa chống trùng và giới hạn thử.
- Nghiệm thu: đợt hơn 7 ngày, tổng hợp admin mới tạo vẫn đủ điều kiện gửi; thử qua tháng, gọi trùng/đồng thời; không gửi lại thư đã accepted.

### MAIL-02 — giữ khoảng cách retry kể cả worker bị gián đoạn

- Hiện tại: lease hết sau 3 phút có thể được claim lại; nhánh reclaim không kiểm tra `next_attempt_at`. Mốc 5 phút chỉ được ghi ở `finish`, nên khi worker dừng trước finish có thể thử lại quá sớm.
- Cần làm: lưu mốc thử tiếp ngay lúc claim và áp dụng cho cả nhánh reclaim. Giữ tối đa 3 lần, cửa sổ 23 giờ, payload và idempotency key không đổi.
- Nghiệm thu: worker dừng trước finish; tại hơn 3 phút nhưng chưa đủ 5 phút không claim lại; đủ 5 phút mới được thử; worker cũ hoàn thành trễ không ghi đè lease mới; không xóa/reset job để gửi lại.

Sau hai sửa chữa: chạy kiểm thử database/API và concurrency, hồi quy email, TS/lint/build. Kết quả 253 test của bản trước không bao phủ đầy đủ hai tình huống này và không phải xác nhận hệ thống sẵn sàng bật gửi.

## 3. Khi sẵn sàng Resend/domain gửi

Chủ trung tâm thực hiện tài khoản/DNS và giữ secret; developer chuẩn bị bản phát hành/sửa lỗi; admin kiểm tra địa chỉ gia sư và vận hành hàng đợi.

1. Tạo tài khoản Resend của trung tâm bằng `csattutor@gmail.com`.
2. Domains → thêm `notify.csatoj.vn`; thêm đúng bản ghi DNS do Resend cấp tại nhà quản lý DNS có thẩm quyền. Giữ bản ghi website và MX hiện có; không tự đoán SPF/DKIM/MX hoặc tạo hai SPF trên cùng hostname.
3. Đợi domain verified và Sending enabled. Dùng sender `CSAT <thongbao@notify.csatoj.vn>`. Không cần mua mailbox cho địa chỉ gửi này; Gmail vẫn nhận phản hồi. [Resend Verified Domains](https://resend.com/docs/dashboard/domains/introduction).
4. Tạo API key **Sending access**, giới hạn domain nếu có lựa chọn. Lưu key vào Vercel Production; không cấp khóa production cho Preview/CI. [Resend API keys](https://resend.com/docs/api-reference/api-keys/create-api-key).
5. Điền `RESEND_API_KEY`, `CSAT_EMAIL_FROM`, `CSAT_EMAIL_REPLY_TO=csattutor@gmail.com`, kiểm tra `APP_ORIGIN`, `CRON_SECRET`. Giữ các công tắc gửi tắt và Redeploy.
6. Kiểm tra hạn mức gửi/ngày, tốc độ và giới hạn tài khoản thực. Số gia sư dưới 100 không đảm bảo mọi đợt luôn nằm trong hạn mức khi cộng thư tư vấn/tổng hợp/retry.
7. Sau khi được phép gửi thật, dùng `scripts/email-smoke.cjs`: mẫu giả, người nhận cố định Gmail trung tâm, không đọc học sinh hoặc xử lý toàn bộ hàng đợi. Xem trước bằng lệnh bên dưới; thêm `--send` mới gửi thật. Mỗi mẫu dùng một UUID-v4 mới; khi retry giữ UUID, kind và trạng thái trong `scratch/email-smoke`, không xóa để lách khóa chống trùng.

```sh
node scripts/email-smoke.cjs --id=<UUID-v4> --kind=reminder
```

Các kind: `consultation`, `reminder`, `digest`. Công cụ dùng biến môi trường của tiến trình, không tự nạp file `.env`; truyền secret bằng cơ chế quản lý secret, không ghi lên dòng lệnh. Công cụ gửi mẫu riêng không dựa vào công tắc email tháng; chỉ thêm `--send` sau khi được phép. Nếu đổi sender khác mẫu đã duyệt, cần sửa guard và test của công cụ trước, không bỏ guard tùy tiện.

8. Kiểm tra Resend tiếp nhận và Gmail thực nhận (cả Spam), tiếng Việt, link Portal, From/Reply-To; không coi accepted là đã tới Inbox.
9. Bật `CONSULTATIONS_ENABLED=true` nếu chưa nhận form; kiểm thử lưu Portal với email vẫn tắt. Sau đó bật `CONSULTATIONS_EMAIL_ENABLED=true` và Redeploy để nhận/gửi tư vấn mới. Đọc hàng chờ cũ trước khi dùng nút gửi lại; bật flag không phải worker tự gửi toàn bộ thư cũ.
10. Khi MAIL-01/02 đã sửa và nghiệm thu, điền người nhận tổng hợp trong `/admin/learning`, xem trước danh sách rồi bật email tháng. Bật lại Cron Jobs nếu trước đó đã Disable. Không cần redeploy riêng khi chỉ đổi checkbox lưu trong database.

Cron giữ lịch tháng hiện có; không thêm scheduler retry trong đợt này. Admin kiểm tra sau 09:00 ngày 28, xử lý hàng chờ theo quyền; form tư vấn kiểm tra đầu/cuối ngày. Cron không tự công bố nhận xét hoặc chốt sổ. Không bổ sung email báo cáo tự động cho phụ huynh.

Dừng gửi: tắt email tháng trong admin; tắt CONSULTATIONS_EMAIL_ENABLED và Redeploy; có thể Disable Cron Jobs để dừng lượt gọi mới. Không thu hồi được thư đã được nhà cung cấp tiếp nhận. Giữ hàng đợi/lịch sử để đối chiếu.

## 4. Nếu sau này chuyển nơi nhận sang mailbox tên miền

Đây là tùy chọn, không nằm trong điều kiện bắt buộc bật Resend. Chỉ làm khi trung tâm cung cấp địa chỉ mailbox thật đã nhận/gửi được.

| Chỗ cần đổi | Cách đổi |
|---|---|
| Reply-To nhắc/tổng hợp | `CSAT_EMAIL_REPLY_TO` trên Vercel, rồi Redeploy |
| Người nhận tổng hợp admin | Cấu hình `/admin/learning`, lưu database |
| Người nhận thông tin tư vấn | Hiện cố định `csattutor@gmail.com` trong `lib/consultation-email.ts`; cần sửa mã và kiểm thử hoặc bổ sung cấu hình người nhận có validation |
| Công cụ gửi mẫu | `scripts/email-smoke.cjs` đang cố định Gmail/sender; cập nhật guard và test nếu trung tâm muốn đổi |
| Nội dung công khai/hướng dẫn | Rà soát nơi hiển thị địa chỉ liên hệ, chỉ thay địa chỉ được xác nhận |

Không thay recipient/from/payload của job đã thử gửi vì có thể phá tính nhất quán khi retry. Những yêu cầu tư vấn đã lưu mang snapshot người nhận cũ; thay cấu hình/mã không tự đổi hàng cũ. Đối chiếu và xử lý riêng nếu cần, không reset outbox.

Nếu thêm gửi thư mời/khôi phục mật khẩu bằng Supabase Auth sau này: đó là cấu hình SMTP và luồng xác thực riêng, cần kiểm thử redirect/token/rate limit. Không mặc định RESEND_API_KEY của email nghiệp vụ đã cấu hình thay cho SMTP Auth.

## 5. Khi có API CSATOJ

### Thông tin cần nhận trước khi viết tích hợp

- Tài liệu API, base URL, version, môi trường thử và cơ chế xác thực; khóa chỉ lưu server.
- ID tài khoản học sinh bền vững và cách liên kết với `student_id`; không ghép bằng tên hoặc tự suy đoán username.
- Mapping lớp–contest; quy tắc chọn contest và trường hợp học sinh học nhiều lớp.
- Định nghĩa “bài đã giải”, phạm vi “tổng bài”, quy tắc ranking/đồng hạng và contest đang diễn ra/đã kết thúc.
- Phân trang, hạn mức, timeout, múi giờ, lịch cập nhật, quyền truy cập và dữ liệu tối thiểu được phép lấy.

### Thay đổi dự kiến — chưa có trong mã hiện tại

1. Viết adapter server gọi CSATOJ; chốt tên biến cấu hình sau khi có hợp đồng API. Chưa tạo biến CSATOJ giả trong Vercel.
2. Migration mới lưu mapping học sinh/lớp/contest và nguồn dữ liệu cần thiết; có quyền sửa mapping cho admin, audit và xử lý đổi tài khoản. Không làm thay đổi học phí/nhận xét/lộ trình đã công bố.
3. Chuẩn hóa dữ liệu theo khung `ParentOJMetrics` hiện có: `student_id`, `class_id`, `contest_id`, `as_of`, `solved`, `total`, `rank`. Thêm trạng thái chưa liên kết/đang cập nhật/lỗi/quá cũ khi thiết kế API nội bộ.
4. Chỉ trả chỉ số cho học sinh phụ huynh có quyền xem. Khóa nhà cung cấp không xuống trình duyệt. Không dùng API CSATOJ thay kiểm tra liên kết phụ huynh.
5. Thay các placeholder trong `ParentPortalView` bằng dữ liệu thật, hiển thị thời điểm cập nhật và phạm vi bài/contest. Dữ liệu thiếu là `null`/“chưa có dữ liệu”, không biến thành 0 bài hoặc hạng 0; không suy ra năng lực hay tự chuyển chặng từ ranking.
6. Chọn cache/cập nhật theo nhu cầu sau khi biết rate limit và độ trễ. Chỉ thêm lịch đồng bộ nếu có nhu cầu đã xác nhận; không dùng cron email cho đồng bộ CSATOJ.
7. Kiểm thử nhiều con/lớp, không có mapping, mapping sai, contest trống/đồng hạng, API lỗi/timeout/429, dữ liệu cũ và quyền chéo; nghiệm thu staging trước production.

Có API key mới chỉ hoàn thành điều kiện đầu vào; tính năng cần phát triển và nghiệm thu các bước trên. Trong thời gian chờ, tiếp tục hiển thị “Chưa kết nối dữ liệu”.

## 6. Bảng theo dõi để lần sau tiếp tục đúng chỗ

| Mã | Việc | Trạng thái 23/09/2026 | Điều kiện hoàn thành |
|---|---|---|---|
| SETUP-01 | Đối chiếu schema/dashboard thực và chuẩn bị backup | Chưa làm trong lần này | Ghi migration thực, đúng project, backup phục hồi được |
| SETUP-02 | Nghiệm thu Storage Supabase thật | Còn chờ môi trường thử/quyền | Upload/thay/gỡ/quyền và cleanup đạt |
| SETUP-03 | Chuẩn hóa Node CI/local/Vercel | Đề xuất, chưa sửa | Cùng phiên bản hỗ trợ, kiểm thử lại đạt |
| MAIL-01 | Hạn xử lý tổng hợp admin | Chưa sửa | Regression đợt cũ/tổng hợp mới đạt |
| MAIL-02 | Khoảng cách retry sau gián đoạn | Chưa sửa | Không thử lại trước 5 phút, concurrency đạt |
| MAIL-03 | Resend, DNS, API key | Chưa có theo thông tin trung tâm | Domain verified, cấu hình Production đầy đủ |
| MAIL-04 | Thư mẫu và bật từng luồng | Chưa gửi/chưa bật | Được phép, Gmail nhận mẫu, hàng đợi được kiểm chứng |
| MAIL-05 | Chuyển mailbox nhận thư tên miền | Tùy chọn | Có địa chỉ thật; đổi config/mã và xử lý snapshot đúng |
| OJ-01 | Hợp đồng API và mapping | Chưa có | Tài liệu/khóa thử/định nghĩa chỉ số đã thống nhất |
| OJ-02 | Tích hợp API, quyền và giao diện | Chưa triển khai | Dữ liệu thật đúng phạm vi, staging đạt |

Không đánh dấu hoàn thành chỉ vì đã có tài liệu hoặc build local thành công. Khi thực hiện cập nhật ngày, commit/migration, môi trường, bằng chứng kiểm tra và việc còn lại; tuyệt đối không ghi giá trị secret vào đây.
