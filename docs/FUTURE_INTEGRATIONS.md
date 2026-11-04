# Hoàn thiện email tên miền và tích hợp API

**Cập nhật CSATOJ v2 (local):** đã có API/linking/UI mới; xem [CSATOJ_INTEGRATION](CSATOJ_INTEGRATION.md). Phần mô tả sync API VNOJ và “chưa có adapter” trong tài liệu này là đối chiếu trước v2, không phải hướng dẫn bật tính năng mới. Chưa triển khai hoặc xác nhận API production.

Đây là hợp đồng và điều kiện bật tính năng, chưa phải thay đổi đã triển khai. Trạng thái/backlog duy trì tại [PROJECT_STATUS](PROJECT_STATUS.md). Setup hiện tại: [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md).

## 1. Phân biệt các tích hợp

**Form website:** đăng ký đã nối intake v2 trong mã theo [catalog](PUBLIC_COURSE_CATALOG.md), có consent/idempotency/retry, kiểm tra Origin/rate limit và chỉ báo tiếp nhận sau khi API lưu. `submit_registration` không tạo outbox/email. Học liệu giữ sao chép/liên hệ. Production đã bật tiếp nhận; nghiệm thu đơn hợp lệ đến admin còn chờ. Giữ các cờ gửi tắt. Đọc [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md) và [runbook](BACKEND_COMPLETION.md); cấu hình key không thay nghiệm thu.

| Thành phần | Vai trò | Trạng thái |
|---|---|---|
| Supabase URL + anon/service_role | Database, đăng nhập, API nội bộ, Storage | Cần ngay cho Portal; dùng đúng môi trường |
| Resend API key + domain verified | Gửi tư vấn, nhắc gia sư, tổng hợp admin | Đã thêm domain `portal.csatoj.vn` theo chủ trung tâm; còn xác nhận nhà cung cấp, cấu hình và nghiệm thu gửi |
| Hộp thư tên miền | Nhận và trả lời thư như một mailbox | Tùy chọn; không bắt buộc để Resend gửi |
| Gmail API hoặc App Password | Quyền thao tác Gmail/SMTP Gmail | Không cần trong giải pháp đã duyệt |
| API CSATOJ | Bài giải, tổng bài, ranking contest lớp | Repo OJ đã có API sync contest; Portal chưa nối, hợp đồng còn cần hoàn thiện |

## 2. Những việc phải sửa trước khi bật email tháng

Hai mục dưới được đối chiếu trực tiếp với nhánh `claim` trong `database/migrations/20260922_21_parent_email_completion.sql`. Chúng chưa được sửa trong đợt tổng hợp tài liệu. Dùng migration mới sau số cuối thực tế trong repo; không sửa migration đã phát hành.

### MAIL-01 — không làm quá hạn bản tổng hợp admin vừa tạo

- Hiện tại: thư queued chưa từng thử bị chuyển kiểm tra thủ công khi `review_email_runs.created_at` quá 7 ngày, không phân biệt kind.
- Tình huống: đợt cũ còn việc cần xử lý; bản tổng hợp admin được tạo muộn rồi bị claim coi là quá hạn ngay dù bản thân thư mới tạo.
- Cần làm: tách điều kiện hết hạn thư gia sư và tổng hợp admin. Quy tắc tuổi thư admin phải tính theo vòng đời thư đó, không bị tuổi đợt cũ loại bỏ ngay; vẫn giữ snapshot, khóa chống trùng và giới hạn thử.
- Nghiệm thu: đợt hơn 7 ngày, tổng hợp admin mới tạo vẫn đủ điều kiện gửi; thử qua tháng, gọi trùng/đồng thời; không gửi lại thư đã accepted.

### MAIL-02 — giữ khoảng cách retry kể cả worker bị gián đoạn

- Hiện tại: lease hết sau 3 phút có thể được claim lại; nhánh reclaim không kiểm tra `next_attempt_at`. Mốc 5 phút chỉ được ghi ở `finish`, nên khi worker dừng trước finish có thể thử lại quá sớm.
- Cần làm: lưu mốc thử tiếp ngay lúc claim và áp dụng cho cả nhánh reclaim. Giữ tối đa 3 lần, cửa sổ 23 giờ, payload và idempotency key không đổi.
- Nghiệm thu: worker dừng trước finish; tại hơn 3 phút nhưng chưa đủ 5 phút không claim lại; đủ 5 phút mới được thử; worker cũ hoàn thành trễ không ghi đè lease mới; không xóa/reset job để gửi lại.

Sau hai sửa chữa: chạy kiểm thử database/API và concurrency, hồi quy email, TS/lint/build. Kiểm thử cũ không thay nghiệm thu hai lỗi này hoặc xác nhận hệ thống sẵn sàng bật gửi.

## Hợp đồng hàng đợi cần giữ

- Payload và idempotency key ổn định qua retry; From/recipient theo snapshot, không sửa job đã thử gửi.
- Lease 3 phút, retry cách ít nhất 5 phút, tối đa 3 lần và cửa sổ tự động dưới 23 giờ; MAIL-02 còn phải sửa để reclaim cũng tuân thủ.
- `accepted` chỉ là nhà cung cấp tiếp nhận. Không tự retry accepted; hết cửa sổ/số lần hoặc kết quả chưa rõ chuyển kiểm tra thủ công.
- Worker chỉ ghi finish nếu đúng lease, kiểm kết quả `updated`; dành thời gian cho ghi kết quả, không reset/xóa job để gửi lại.
- Đợt tháng duy nhất từ ngày 28 theo giờ Việt Nam, một thư/gia sư. Phạm vi lấy từ roster và phân công hiện hành, không đồng nhất với học sinh đã điểm danh có mặt.
- Khôi phục đợt bị bỏ lỡ trong tháng từ ngày 28 hoặc tháng liền trước ngày 1–7; ghi snapshot lúc khôi phục, không giả thời điểm cũ.
- Tổng hợp admin giữ số liệu tại lúc lập đợt và liên kết Portal để xem hiện tại. Không suy “xử lý hết” thành “gửi thành công hết”.
- Tuổi thư chưa từng gửi cần phân biệt loại thư theo MAIL-01; giữ lịch sử/hàng chờ cũ và đối soát riêng.

## 3. Khi sẵn sàng Resend/domain gửi

Chủ trung tâm thực hiện tài khoản/DNS và giữ secret; developer chuẩn bị bản phát hành/sửa lỗi; admin kiểm tra địa chỉ gia sư và vận hành hàng đợi.

1. Dùng tài khoản Resend hiện có của trung tâm; không tạo lại tài khoản/domain vì hướng dẫn cũ.
2. Domains → kiểm tra domain đã thêm là `portal.csatoj.vn`, đối chiếu đúng bản ghi DNS do tài khoản Resend cấp với Cloudflare. Giữ bản ghi website và MX hiện có; không tự đoán SPF/DKIM/MX, thay CNAME return-path đang có bằng mẫu trên mạng hoặc tạo hai SPF trên cùng hostname. [Hướng dẫn Cloudflare của Resend](https://resend.com/docs/guides/dns/cloudflare).
3. Xác nhận domain verified và Sending enabled. Chốt địa chỉ From thuộc `portal.csatoj.vn`; đề xuất `CSAT <thongbao@portal.csatoj.vn>`, chưa coi là địa chỉ đã duyệt/cấu hình. Hướng dẫn cũ dùng `notify.csatoj.vn`, còn guard trong `scripts/email-smoke.cjs` chỉ chấp nhận sender cũ: phải cập nhật guard và test cùng lựa chọn mới trước gửi mẫu. Không cần mua mailbox cho địa chỉ gửi này; Gmail vẫn nhận phản hồi. [Resend Verified Domains](https://resend.com/docs/dashboard/domains/introduction). Rà soát DMARC và chọn chính sách phù hợp; không tự áp reject khi chưa đối soát các nguồn gửi.
4. Tạo API key **Sending access**, giới hạn domain nếu có lựa chọn. Lưu key vào Vercel Production; không cấp khóa production cho Preview/CI. [Resend API keys](https://resend.com/docs/api-reference/api-keys/create-api-key).
5. Điền `RESEND_API_KEY`, `CSAT_EMAIL_FROM`, `CSAT_EMAIL_REPLY_TO=csattutor@gmail.com`, kiểm tra `APP_ORIGIN`, `CRON_SECRET`. Giữ các công tắc gửi tắt và Redeploy.
6. Kiểm tra hạn mức gửi/ngày, tốc độ và giới hạn tài khoản thực. Số gia sư dưới 100 không đảm bảo mọi đợt luôn nằm trong hạn mức khi cộng thư tư vấn/tổng hợp/retry.
7. Sau khi được phép gửi thật, dùng `scripts/email-smoke.cjs`: mẫu giả, người nhận cố định Gmail trung tâm, không đọc học sinh hoặc xử lý toàn bộ hàng đợi. Xem trước bằng lệnh bên dưới; thêm `--send` mới gửi thật. Mỗi mẫu dùng một UUID-v4 mới; khi retry giữ UUID, kind và trạng thái trong `scratch/email-smoke`, không xóa để lách khóa chống trùng.

```sh
node scripts/email-smoke.cjs --id=<UUID-v4> --kind=reminder
```

Các kind: `consultation`, `reminder`, `digest`. Công cụ dùng biến môi trường của tiến trình, không tự nạp file `.env`; truyền secret bằng cơ chế quản lý secret, không ghi lên dòng lệnh. Công cụ gửi mẫu riêng không dựa vào công tắc email tháng; chỉ thêm `--send` sau khi được phép. Nếu đổi sender khác mẫu đã duyệt, cần sửa guard và test của công cụ trước, không bỏ guard tùy tiện.

8. Kiểm tra Resend tiếp nhận và Gmail thực nhận (cả Spam), tiếng Việt, link Portal, From/Reply-To; không coi accepted là đã tới Inbox.
9. Tiếp nhận đơn và gửi thư là hai luồng độc lập. Intake v2 hiện không tạo outbox: cần duyệt và triển khai hợp đồng thông báo cho đơn mới, kiểm thử chống trùng/lỗi gửi rồi mới bật gửi. Không chỉ bật `CONSULTATIONS_EMAIL_ENABLED=true` vì cờ cũ không nối mail cho đơn v2. Đối soát hàng chờ cũ riêng; không tự gửi lại.
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

## 5. Tích hợp API CSATOJ

### Hợp đồng nguồn hiện có và khoảng trống cần xử lý

Mã nguồn tham chiếu do chủ trung tâm cung cấp: `D:\Cty_gia_đình_CSAT\csat-oj`. Đây là repo Django/VNOJ riêng, không phải dependency runtime của Portal. Đọc `dmoj/urls.py`, `judge/views/api/api_v2.py`, `judge/tests/test_api_sync.py`; trạng thái kiểm chứng/commit ở PROJECT_STATUS.

Các route chỉ được đăng ký khi `VNOJ_ENABLE_SYNC_API=True`; cấu hình mặc định trong nguồn là False. API yêu cầu `GLOBAL_API_KEY` qua `X-Global-API-Key`, hiện cũng chấp nhận query `global_api_key`. Không nhầm với token Bearer cá nhân của OJ.

| Route dưới `/api/v2/sync/contest/{contest_code}` | Dữ liệu hiện trả | Điều cần chốt/bổ sung trước Portal |
|---|---|---|
| Route gốc | code, start_time, end_time, frozen_at | Base URL/môi trường thực, quyền contest, thời điểm cập nhật |
| `/problems` | Danh sách mã bài và contest | Phạm vi total và quyền bài ẩn; hiện chưa phân trang |
| `/participants` | Username, contest, rank; chỉ LIVE, loại disqualified; dùng điểm frozen khi contest đang frozen | ID người dùng bền vững, chính sách đổi username; xác nhận đồng hạng theo score/cumtime/tiebreaker và LIVE/virtual |
| `/submissions?from_timestamp=...` | ID, submittedAt/judgedAt, author username, trạng thái, contest/bài; tối đa 2.000 dòng | Cursor ổn định, định nghĩa solved/rejudge, quyền dữ liệu và freeze; chưa có metrics tổng hợp theo học sinh |

Các điểm cần xử lý ở hợp đồng/API nguồn:

- **Định danh và phạm vi:** API trả username, chưa trả ID người dùng ổn định. Global key hiện mở các contest truy vấn được mà không có allowlist riêng cho Portal trong view. Cần credential/phạm vi chỉ đọc phù hợp, mapping được admin xác nhận và audit; không ghép tên học sinh.
- **Bảo vệ khóa:** dùng header từ máy chủ Portal, không dùng query string; lập kế hoạch bỏ hỗ trợ key trong URL sau đối soát caller cũ, tránh khóa đi vào access log. Chưa thấy rate limit trong view sync; phải kiểm chứng cả lớp reverse proxy/Cloudflare trước kết luận hệ thống không có giới hạn.
- **Đồng bộ đủ dữ liệu:** lọc `judged_date >= from_timestamp`, sắp `(judged_date, id)` rồi cắt limit, chưa có next cursor/has_more. Nếu hơn 2.000 bản ghi cùng timestamp, giữ timestamp sẽ lặp trang, tăng timestamp sẽ bỏ sót. Cần cursor cặp timestamp/ID hoặc hợp đồng phân trang tương đương; xử lý rejudge và chống trùng theo submission ID.
- **Freeze và quyền:** participants dùng frozen score, nhưng nhánh submissions chưa lọc tại mốc frozen và problems chưa lọc bài ẩn theo người xem. Chốt quyền của dịch vụ/Portal và cách ẩn hoặc trì hoãn số liệu để không suy ra kết quả chưa được công bố.
- **Ý nghĩa metrics:** chưa có endpoint solved/total theo học sinh. Chốt AC hay điểm tối đa, tổng bài trong contest/lớp/toàn hệ thống, nhiều lần nộp/rejudge và virtual. API hiện có chỉ đủ làm nền cho metrics theo contest sau khi hoàn thiện hợp đồng, chưa đủ chứng minh thống kê toàn OJ.
- **Nghiệm thu nguồn:** mở rộng test đồng hạng/freeze/quyền, sai key, cursor trên 2.000 dòng và rejudge; chạy trên Django/MySQL thử. Test nguồn đã có không thay nghiệm thu hosted hoặc kiểm thử tích hợp Portal.

### Thông tin còn cần xác nhận trước khi viết tích hợp

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

## 6. Theo dõi tiến độ

Trạng thái, bằng chứng và backlog chỉ duy trì trong [PROJECT_STATUS](PROJECT_STATUS.md): DB-01/PROFILE-01 cho schema/Storage, OPS-01 cho vận hành/khôi phục, MAIL-01/02/03 cho email, OJ-01 cho CSATOJ. Không giữ bảng trạng thái trùng ở tài liệu tích hợp.

Bật từng luồng sau nghiệm thu và quyền phù hợp; thư mẫu phải thực nhận, không chỉ accepted. Đổi mailbox là lựa chọn riêng cần địa chỉ được xác nhận và xử lý snapshot hàng đợi. Không ghi secret vào Markdown, không đánh dấu hoàn thành từ build local.
