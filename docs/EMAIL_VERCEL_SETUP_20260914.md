> Cập nhật 23/09/2026: cấu hình hiện hành và chuỗi migration đến 22 xem [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md); việc còn mở trước khi bật email/API xem [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md). Tài liệu bên dưới giữ bối cảnh của đợt cũ, không thay thế checklist hiện hành.

# Cài email CSAT trên Resend và Vercel

Cập nhật 14/09/2026. Mã nguồn đã bổ sung; chưa áp dụng migration production, chưa deploy, chưa gửi email thật. Trung tâm xác nhận chưa có tài khoản Resend. Các bước tài khoản/DNS bên dưới cần hoàn tất trước khi bật gửi.

## 1. Email sẽ đi như thế nào?

- Form tư vấn → lưu Portal → Resend gửi thông tin về **csattutor@gmail.com**. Nếu gửi lỗi, yêu cầu vẫn được giữ tại `/admin/consultations`.
- Ngày 28 → Vercel gọi API → Portal tạo danh sách tháng → Resend nhắc từng gia sư và gửi tổng hợp về Gmail trung tâm.
- Tên gửi: **CSAT <thongbao@notify.csatoj.vn>**. Phản hồi thư nhắc về **csattutor@gmail.com**. Với thư tư vấn, nút Reply dùng email người điền nếu có; đây là địa chỉ họ khai, chưa xác minh sở hữu.
- Gia sư hoàn thiện một nhận xét/học sinh/lớp/tháng, chọn tag có minh chứng khi sử dụng tag. Nhận xét chữ đã công bố vẫn hoàn thành. Cron không công bố nhận xét, gắn tag hay chốt sổ thay người dùng.
- Không cần mua hộp thư `thongbao@notify.csatoj.vn`, cài Gmail plugin, tạo App Password hoặc cấp quyền đọc Gmail cho Portal.

## 2. Tạo Resend và xác minh tên miền

1. Mở [trang đăng ký Resend](https://resend.com/signup) và đăng ký tài khoản thuộc trung tâm bằng `csattutor@gmail.com`. Hoàn tất xác minh tài khoản theo hướng dẫn trên màn hình.
2. Mở **Domains → Add domain**, nhập `notify.csatoj.vn`. Chọn vùng gửi trong các vùng Resend cung cấp; dùng nhất quán các bản ghi của vùng đã chọn.
3. Resend hiển thị bảng DNS. Mở trang quản lý DNS có thẩm quyền của `csatoj.vn` — nơi quản lý nameserver thực tế, không mặc định là Vercel hay nơi mua tên miền.
4. Thêm từng bản ghi đúng **Type, Name/Host, Value, Priority** do Resend cung cấp. Nếu DNS tự nối `csatoj.vn`, nhập phần tên tương đối theo giao diện để tránh lặp tên miền. Dùng TTL mặc định nếu không có yêu cầu riêng. Không tự đoán giá trị DKIM/SPF/MX, không thay MX hoặc A/CNAME hiện có của tên miền gốc/website. Không tạo thêm một SPF thứ hai trên cùng hostname.
5. Quay lại Resend và yêu cầu kiểm tra bản ghi; đợi domain có trạng thái **Verified** và gửi thư được bật. Chỉ thiết lập gửi; chưa cần Receiving/inbound.
6. Mở **API Keys → Create API key**, đặt tên ví dụ `CSAT Portal Production`, quyền **Sending access**, giới hạn domain `notify.csatoj.vn`. Lưu khóa vào kho mật khẩu trung tâm và Vercel ở bước tiếp theo. Không đưa vào chat, ảnh chụp, Git hoặc biến `NEXT_PUBLIC_*`.

Nguồn: [Xác minh domain](https://resend.com/docs/dashboard/domains/introduction), [quyền API key](https://resend.com/docs/api-reference/api-keys/create-api-key).

## 3. Cài biến môi trường trên Vercel

Mở đúng project đang phục vụ `portal.csatoj.vn` → **Settings → Environment Variables**. Chọn phạm vi **Production**. Nhập giá trị trực tiếp, không thêm dấu ngoặc kép bao quanh. Biến bí mật phải được đánh dấu Sensitive nếu giao diện hỗ trợ.

| Tên biến | Giá trị cần nhập | Khi chuẩn bị |
|---|---|---|
| `APP_ORIGIN` | `https://portal.csatoj.vn` | Không có dấu `/` cuối |
| `CSAT_EMAIL_FROM` | `CSAT <thongbao@notify.csatoj.vn>` | Chỉ dùng domain đã Verified |
| `CSAT_EMAIL_REPLY_TO` | `csattutor@gmail.com` | Đã có code hỗ trợ |
| `RESEND_API_KEY` | API key vừa tạo trong Resend | Bí mật, phía server |
| `CRON_SECRET` | Chuỗi ngẫu nhiên mạnh, ít nhất 32 ký tự | Dùng trình quản lý mật khẩu để tạo; không dùng chuỗi mẫu |
| `CONSULTATIONS_HASH_KEY` | Chuỗi ngẫu nhiên khác, ít nhất 32 ký tự | Giữ ổn định giữa các deployment; không dùng chung CRON_SECRET |
| `CONSULTATIONS_ENABLED` | `false` | Sau migration và kiểm tra: đổi `true` để nhận form |
| `CONSULTATIONS_EMAIL_ENABLED` | `false` | Sau xác minh/gửi thử: đổi `true` để gửi thư tư vấn |

Giữ các biến Supabase hiện có trỏ đúng môi trường: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Service role chỉ được dùng phía server. Không thay bằng cấu hình giả dùng cho kiểm thử local.

`VERCEL_ENV` do Vercel thiết lập; **không tự tạo hoặc sửa**. Development/Preview luôn chặn gửi thật ở tầng code. Không chọn Preview cho các khóa Production. Không phải cài thêm package cron, Gmail hay Resend trong Vercel: code dùng HTTP API, lịch nằm trong repository.

Thay đổi biến chỉ áp dụng cho deployment mới: sau khi lưu cấu hình cần phát hành mã tương ứng hoặc Redeploy. Nguồn: [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## 4. Migration và phát hành mã nguồn

Các bước này do người vận hành/developer thực hiện với quyền production đã xác nhận. Chưa thực hiện trong đợt sửa local này.

1. Xác định đúng Supabase project và Vercel project/production branch. Kiểm tra deployment đang phục vụ tên miền, không dựa vào trạng thái local.
2. Xác nhận bản sao lưu có thể phục hồi và đọc `csat_internal.schema_migrations`. Migration trong repository không chứng minh production đã áp dụng.
3. Giữ `parent_portal_settings.email_enabled=false` và hai công tắc tư vấn ở Vercel `false` trong lúc chuẩn bị. Nếu môi trường thực tế đang bật, điều phối thời gian tạm dừng với người vận hành trước khi phát hành.
4. Nếu thiếu, áp dụng **20260913_18_consultations.sql** trước, rồi **20260914_19_email_operations.sql**. Migration 19 phụ thuộc luồng học tập/email trước đó và migration 18. Chỉ áp dụng phiên bản chưa có; không chạy lại, không sửa migration đã áp dụng.
5. Chạy `database/verification/20260914_email_operations.sql`. Đối chiếu với kết quả trước phát hành; giữ lịch sử nhận xét/kỳ đã chốt và các hàng email cũ.
6. Phát hành commit chứa đầy đủ phần public site/tư vấn đã duyệt và thay đổi email liên quan. Không đẩy riêng một file API khi schema hoặc component phụ thuộc chưa có. Repository hiện có thay đổi local từ đợt trang chủ trước; cần review tập file phát hành.
7. Kiểm tra deployment **Ready**, mở `/admin/consultations`, `/admin/learning`; cấu hình email không báo thiếu sau khi đã điền đủ.
8. Tại `/admin/learning`, nhập `csattutor@gmail.com` vào người nhận tổng hợp; giữ checkbox email tháng **tắt**. Nút “Lưu cấu hình” lưu trong Supabase, khác các biến ở Vercel.

Không rollback bằng xóa bảng hoặc reset outbox. Nếu phát hành lỗi, giữ dữ liệu, tắt công tắc gửi và rollback mã tương thích với schema bổ sung.

## 5. Xác nhận cron trên Vercel

Repository đã có:

```json
{
  "crons": [
    { "path": "/api/cron/monthly-reviews", "schedule": "0 1 28 * *" }
  ]
}
```

- Sau deployment production, vào **Settings → Cron Jobs**. Kiểm tra đúng đường dẫn, lịch và trạng thái enabled. Không cần nhập secret vào URL: Vercel tự gửi `Authorization: Bearer <CRON_SECRET>`.
- Lịch UTC tương ứng từ 08:00 ngày 28 tại Việt Nam. Hobby có thể chạy trong khung **08:00–08:59**; admin kiểm tra sau **09:00**. Pro có độ chính xác lịch cao hơn; không tự mua/nâng gói.
- Mở đường dẫn cron trực tiếp bằng thanh địa chỉ sẽ trả **401** do thiếu Bearer — đây là bảo vệ đúng, không phải lý do bỏ xác thực.
- Không dùng nút **Run** để thử Gmail: khi các công tắc đã bật, nó có thể gửi cả hàng đợi đủ điều kiện, kể cả đợt có sẵn. Lịch chạy tự động chỉ tạo đợt mới đúng ngày 28 từ 08:00; thao tác Run ngày khác không phải công cụ tạo mẫu nhắc.
- Vercel không tự retry một cron thất bại. Xem Logs của route và trạng thái Portal để quyết định xử lý tiếp. Số `accepted` nghĩa Resend tiếp nhận, chưa chứng minh đến Inbox.

Nguồn: [Quản lý cron và CRON_SECRET](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [giới hạn lịch](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Hobby đủ tần suất kỹ thuật cho lịch này, nhưng [điều kiện Hobby](https://vercel.com/docs/plans/hobby) giới hạn cá nhân phi thương mại. Cần chọn gói hosting phù hợp cho hoạt động trung tâm; đổi sang Supabase Cron không thay đổi điều kiện hosting Vercel. Chưa có thao tác mua gói trong đợt này.

## 6. Bật từng luồng và vận hành

### Luồng tư vấn

1. Sau migration và deployment hoạt động, bật `CONSULTATIONS_ENABLED=true`, giữ `CONSULTATIONS_EMAIL_ENABLED=false`, Redeploy. Gửi một yêu cầu bằng thông tin thử do trung tâm quản lý; kiểm tra xuất hiện trong admin. Không dùng thông tin học sinh thật để thử.
2. Khi đã sẵn sàng gửi thật, bật `CONSULTATIONS_EMAIL_ENABLED=true` rồi Redeploy. Kiểm tra những yêu cầu chờ trước đó. Công tắc này cho phép cả yêu cầu mới hợp lệ gửi về Gmail, không phải chế độ chỉ gửi thử.
3. Với một yêu cầu thử đã chọn trong admin, chọn “Thử gửi email”; kiểm tra Resend và Gmail (cả Spam), tên CSAT, tiếng Việt, đường dẫn quản trị và Reply-To.
4. Mở form cho sử dụng bình thường. Admin kiểm tra số yêu cầu **chưa liên hệ** đầu và cuối ngày làm việc. Email hỏng không làm mất dữ liệu form; có thể liên hệ trực tiếp từ Portal.

### Nhắc gia sư và tổng hợp

1. Đối chiếu email gia sư, người nhận admin và bản xem trước nội dung. Không tạo đợt tháng giả trong production để thử. Gửi mẫu nhắc riêng vào Gmail trung tâm chỉ sau khi đã xác nhận thao tác gửi thử, không gọi toàn bộ cron.
2. Bật checkbox email ngày 28 trong `/admin/learning`, lưu. Công tắc có hiệu lực trong database, không cần Redeploy riêng cho checkbox này.
3. Sau 09:00 ngày 28, xem **Đợt nhắc và nhật ký email**. Nếu có thư còn chờ, chọn “Xử lý thư đang chờ”. Mỗi lượt xử lý có giới hạn thời gian và tối đa 35 thư; có thể cần nhiều lượt.
4. Nếu chưa có đợt: chọn tháng → “Xem trước đợt nhắc” → đọc danh sách → “Xác nhận tạo đợt” → “Xử lý thư đang chờ”. Tạo đợt và gửi là hai thao tác riêng. Danh sách thay đổi sẽ buộc xem trước lại.
5. Phục hồi cho tháng hiện tại từ 08:00 ngày 28 đến cuối tháng, hoặc tháng liền trước trong ngày 1–7. Ngoài khoảng này không tạo đợt lịch sử. Đợt đã tồn tại chỉ xử lý tiếp, không ghi đè snapshot.
6. Thư lỗi chờ ít nhất 5 phút trước lần thử tiếp. Hết 3 lần hoặc quá 23 giờ từ lần thử đầu chuyển **Cần kiểm tra**; thư chưa từng gửi quá 7 ngày từ lúc lập đợt cũng chuyển kiểm tra.
7. Đối chiếu Portal và Resend rồi ghi chú. “Đã xử lý qua kênh khác” / “Đã xác nhận thư trên Resend” dừng thử gửi tiếp nhưng giữ nguyên lịch sử và trạng thái nhà cung cấp. “Đã kiểm tra, tiếp tục theo dõi” không dừng retry. Không sửa ID hoặc reset outbox để cố gửi lại.

Bản tổng hợp ghi thời điểm lập danh sách và thời điểm tổng hợp email. Xem Portal để biết tiến độ mới nhất; không hiểu số liệu trong email là cập nhật trực tiếp.

### Xử lý lỗi thường gặp

| Hiện tượng | Xử lý |
|---|---|
| Cron 401 | Kiểm tra CRON_SECRET trên Production và deployment đã lấy biến mới; không công khai secret để thử |
| Không có cron trong Settings | Kiểm tra production deployment có đúng vercel.json và route; Redeploy bản đúng |
| `disabled` / không gửi | Kiểm tra đúng công tắc: tư vấn dùng env; nhắc tháng dùng checkbox lưu DB |
| `unconfigured` / admin báo thiếu | Điền đúng biến phía server, kiểm tra domain verified, Redeploy |
| `provider_http_401/403` | Kiểm tra API key, quyền gửi/domain và địa chỉ From trên Resend |
| `provider_http_429` | Kiểm tra hạn mức/tần suất Resend; đợi rồi xử lý thư đủ điều kiện |
| `transport_uncertain` / lỗi ghi kết quả | Có thể nhà cung cấp đã nhận. Tải lại trạng thái; retry cùng job trong cửa sổ cho phép, không tạo job mới |
| `assignment_changed` | Đối chiếu phân công hiện tại; không tự gửi thông tin lớp cho gia sư cũ |
| `already_completed` | Thư được bỏ qua vì các nhận xét đã hoàn tất; không yêu cầu gia sư nhập lại |
| `manual_review` | Kiểm tra nhà cung cấp và ghi đối chiếu; không tự động gửi lại |

Dừng khẩn cấp: tắt checkbox email tháng; tắt `CONSULTATIONS_EMAIL_ENABLED` rồi Redeploy. Có thể Disable Cron Jobs trên Vercel để dừng lượt cron tương lai. Các thư đã được Resend tiếp nhận hoặc đang xử lý không thể thu hồi bằng công tắc. Giữ nhận form nếu database hoạt động và admin vẫn xử lý được.

## 7. Kết quả kiểm thử local

- 225 kiểm thử tự động qua, bao gồm PostgreSQL 17 chạy hai kết nối đồng thời và phục hồi backup tách biệt.
- Next.js production build, TypeScript và lint phần sửa qua.
- Giao diện qua 8 tổ hợp trang/sáng-tối/mobile-desktop; kiểm tra xem trước, tạo đợt không tự gửi, xử lý hàng đợi, bộ lọc và ghi đối chiếu; không tràn ngang hoặc lỗi JavaScript.
- Toàn bộ thử gửi dùng nhà cung cấp giả; không có bằng chứng email đã tới Gmail thật trước khi hoàn tất bước cấu hình/gửi thử.


## Bản phát hành kết hợp 22/09/2026

Đợt kết hợp bổ sung migration 21 và kiểm thử chuỗi 18–21. Xem [Hướng dẫn phát hành và nghiệm thu](RELEASE_PARENT_EMAIL_20260922.md) để dùng thứ tự migration mới, công cụ thư mẫu cố định người nhận, dữ liệu phí từng buổi và trạng thái production mới nhất. Các thao tác production/gửi thật vẫn cần được cho phép.
