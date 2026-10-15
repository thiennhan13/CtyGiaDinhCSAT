# CAPTCHA chỉ cho đăng nhập

## Phạm vi đã duyệt

Cloudflare Turnstile bảo vệ hai form ở `/login`: phụ huynh (`parent_login`) và gia sư/admin (`staff_login`). Một widget Cloudflare dùng chung, action khác nhau. Không thêm CAPTCHA vào đăng ký/tư vấn, trang công khai, tra cứu đang có phiên hoặc API nghiệp vụ khác. Không tạo bảng/migration. Phụ huynh vẫn tra cứu bằng số điện thoại; SEC-02 vẫn mở.

Đã phát hành trên production ngày 16/10/2026: gói 39fbb36 và bản vá c6fc0cc. Chủ trung tâm tự lưu biến; secret không đưa vào Git hoặc báo cáo. CI cả hai job đạt. Widget thật nhận kết quả xác minh tự động cho hai vai trò; request thiếu token bị từ chối 403, không có cookie. Đăng nhập tài khoản thật và Siteverify với token hợp lệ vẫn cần nghiệm thu. Bot Protection Log trên Vercel là lớp độc lập đã bật trước đó.

## Chủ tài khoản chuẩn bị

1. Cloudflare dashboard → **Turnstile → Add widget**.
2. Widget name: **CSAT Portal Login**.
3. Hostnames: **portal.csatoj.vn**, không kèm giao thức hoặc đường dẫn. Không thêm toàn bộ `vercel.app`, hostname preview ngẫu nhiên hay localhost vào widget production.
4. Mode: **Managed**. Pre-clearance: **No/Disabled**; không cần cookie `cf_clearance` cho ứng dụng này.
5. Tạo widget; giữ Site Key và Secret Key. Không cần đổi DNS/hosting, không cần Cloudflare API token hoặc cung cấp quyền tài khoản cho agent.
6. Vercel → project `cty-gia-dinh-csat` → Environment Variables → **Production**:

| Biến | Giá trị |
|---|---|
| `TURNSTILE_SITE_KEY` | Site Key của widget, được phép hiển thị trong trình duyệt |
| `TURNSTILE_SECRET_KEY` | Secret Key, chỉ server; nhập trực tiếp vào Vercel, không gửi chat/Git |
| `TURNSTILE_LOGIN_ENABLED` | `true` sau khi hai khóa trên đã lưu |
| `APP_ORIGIN` | Giữ `https://portal.csatoj.vn`; server dùng hostname này để đối chiếu kết quả xác minh |

Không thêm tiền tố `NEXT_PUBLIC_` cho secret. Site Key được truyền có chọn lọc từ server vào trang đăng nhập, không cần thêm một biến NEXT_PUBLIC khác. Cấu hình mới cần deployment mới; không chỉ redeploy bản mã cũ rồi coi CAPTCHA đã hoạt động. Chỉ phát hành đúng phạm vi được chủ trung tâm cho phép.

Preview/local dùng cấu hình riêng và [test keys chính thức](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), không dùng dữ liệu thật. Test keys chỉ được mã chấp nhận khi APP_ORIGIN là loopback và không phải Vercel Production; không có cờ bypass trong request. QA tự động dùng widget/API giả và chặn mạng ngoài, không giải CAPTCHA thật.

## Cách hoạt động và giới hạn

- Trang đăng nhập đọc cấu hình phía server; chỉ truyền `{enabled, siteKey}`. Bật nhưng thiếu/sai cấu hình thì không cho đăng nhập, không âm thầm bỏ qua CAPTCHA. Tắt rõ bằng `false` hoặc chưa cấu hình thì giữ luồng trước đó.
- Script chính thức tải theo nhu cầu khi form đăng nhập đang hoạt động. Chuyển vai trò gỡ widget cũ, giữ trường nhập và bỏ token cũ. Compact khi form hẹp, flexible khi đủ chỗ; đổi kích thước qua ngưỡng tạo lại xác minh.
- Token được gửi riêng trong `captchaToken`. API kiểm Origin/body/schema trước; sau đó Siteverify, `success`, đúng hostname và action, thời gian phát hành hợp lệ. Timeout 5 giây/lỗi dịch vụ trả 503; token thiếu/sai/replay trả lỗi xác minh. Không tạo phiên/cookie hoặc gọi nghiệp vụ đăng nhập trước khi xác minh đạt.
- Chỉ secret và token được gửi đến Siteverify; không gửi email, mật khẩu, số điện thoại hay hồ sơ học sinh, không ghi token vào log/database/URL. Script Cloudflare vẫn xử lý tín hiệu trình duyệt theo chính sách riêng của dịch vụ.
- Xác minh đạt mới đi tiếp rate limit/Auth/RPC hiện có. Giữ body limit 4 KiB, cookie riêng tư và budget đăng nhập chung. Token chỉ dùng một lần; mọi lần gửi xong đều reset để lần thử lại có token mới. Trường nhập được giữ. Lỗi tải có nút thử lại và liên hệ CSAT; không JS dùng liên hệ, không có luồng đăng nhập bỏ CAPTCHA.
- CSP Report-Only thêm đúng origin `https://challenges.cloudflare.com` cho script/frame, không wildcard. Chưa enforce CSP.
- Bảo vệ ở hai API ứng dụng, không thay cấu hình CAPTCHA của Supabase Auth hay khả năng gọi Auth trực tiếp bằng SDK. Không bật thêm Supabase CAPTCHA cho cùng token đã được Siteverify tiêu thụ; tích hợp CAPTCHA cấp Auth cần thiết kế và nghiệm thu riêng. RLS/quyền/hồ sơ hoạt động vẫn là ranh giới dữ liệu.
- CAPTCHA giảm tự động hóa, không xác minh sở hữu số điện thoại. Không thay DDoS protection/rate limit và không đảm bảo loại bỏ mọi bot.

## Kiểm chứng và phát hành

Node24: build, typecheck, lint strict, guard, database/API **270/270**, repo **20/20** đạt; kiểm thử API thêm cấu hình thiếu, secret không xuất ra props, hostname/action/thời hạn, network/JSON lỗi, test key trên hostname triển khai, replay và Origin sai. Edge fixture đạt **30 assertions** ở 320/375/768/1440: hai vai trò, chỉ tải ở login, giữ dữ liệu sau lỗi, reset token, đổi vai trò, hết hạn, retry tải script, không JS và không tràn ngang. Đã xem ảnh mobile; đây là widget giả, không chứng minh Cloudflare thật hoạt động. Khi CAPTCHA tắt, HTTP SEO/header (15 URL) và hai nhóm Edge đăng nhập/hiệu ứng chữ (33 assertions) cũng đạt.

Sau khi chủ tài khoản lưu cấu hình và phát hành mã mới: kiểm Managed widget thật trên tên miền, xác minh cho cả hai vai trò bằng tài khoản được phép; sai token/thiếu token phải bị chặn, lỗi mật khẩu/số liên hệ phải cho thử lại; theo dõi Turnstile Analytics theo action. Không dùng học sinh/học phí thật làm fixture hoặc ghi credential vào báo cáo. Đã kiểm widget thật và từ chối request thiếu token; chưa gửi thông tin tài khoản thật. Bản vá c6fc0cc khởi tạo API sau sự kiện script load, bỏ ready() không tương thích async/defer; fixture tái hiện giới hạn này và bộ 30 assertions được chạy trong CI.

Nếu sự cố, ưu tiên sửa hostname/key, mạng/CSP và kiểm status dịch vụ. Việc tắt `TURNSTILE_LOGIN_ENABLED` trên production làm giảm bảo vệ, chỉ thực hiện khi chủ trung tâm duyệt; cần deployment mới. Dù tắt, Origin và rate limit DB vẫn giữ nguyên.

Nguồn: [tạo widget](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/), [render SPA](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).
