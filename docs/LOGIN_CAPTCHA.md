# CAPTCHA chỉ cho đăng nhập

## Phạm vi đã duyệt

Cloudflare Turnstile bảo vệ hai form ở `/login`: phụ huynh (`parent_login`) và gia sư/admin (`staff_login`). Một widget Cloudflare dùng chung, action khác nhau. Không thêm CAPTCHA vào đăng ký/tư vấn, trang công khai, tra cứu đang có phiên hoặc API nghiệp vụ khác. Không tạo bảng/migration. Mã local kiểm CAPTCHA trước khi bắt đầu Google OAuth; bước nhập số để liên kết không thêm CAPTCHA. SEC-02 vẫn mở vì Google không xác minh phone tự khai.

Đã phát hành; phạm vi bằng chứng và phần nghiệm thu còn chờ ở [PROJECT_STATUS](PROJECT_STATUS.md). Bot Protection Log là lớp độc lập.

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

### Mã hỗ trợ và log trình duyệt

Bản sửa local hiển thị mã dưới widget: `CF-200500` là ví dụ mã sáu chữ số Cloudflare thực trả về, không suy đoán mã từ ảnh. Lỗi ứng dụng dùng mã riêng: `CSAT-LOAD` (tải script/API không thành công), `CSAT-CONFIG` (thiếu cấu hình widget), `CSAT-RENDER` (khởi tạo widget lỗi), `CSAT-TIMEOUT` (hết thời gian tương tác), `CSAT-WIDGET` (callback không có mã Cloudflare hợp lệ).

Console trình duyệt ghi warning `[CSAT Turnstile]` với đúng `{code, action}`; một mã chỉ ghi một lần trong mỗi lần khởi tạo/thử lại. Không ghi token, site key, secret, URL, email, mật khẩu hoặc payload lỗi thô. Chỉ mã Cloudflare đúng sáu chữ số được đưa vào thông báo/log. Không thêm endpoint thu thập log hoặc gửi log trình duyệt lên Vercel. Khi hỗ trợ từ xa, lấy mã người dùng nhìn thấy hoặc warning này; `staff_login` là tên action cho gia sư/admin, không phải role tài khoản.

Lỗi xóa token, khóa nút đăng nhập; thử lại giữ trường nhập, xóa mã cũ và xác minh lại. Thành công tự động từ widget cũng xóa thông báo lỗi. Việc thêm mã giúp chẩn đoán, không tự khắc phục lỗi kết nối Cloudflare trên thiết bị. [Quy ước callback và mã lỗi](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/).

Bộ API kiểm cấu hình thiếu, props không có secret, hostname/action/thời hạn, network/JSON lỗi, test key trên hostname triển khai, replay và Origin sai. Runner `scripts/run-login-captcha-ui.cjs` kiểm hai vai trò, chỉ tải ở login, dữ liệu sau lỗi, reset/expiry/retry, no-JS và responsive bằng widget/API giả; chạy trong CI. Số liệu kiểm chứng tại PROJECT_STATUS.

Sau khi chủ tài khoản lưu cấu hình và phát hành mã mới: kiểm Managed widget thật trên tên miền, xác minh cho cả hai vai trò bằng tài khoản được phép; sai token/thiếu token phải bị chặn, lỗi mật khẩu/số liên hệ phải cho thử lại; theo dõi Turnstile Analytics theo action. Không dùng học sinh/học phí thật làm fixture hoặc ghi credential vào báo cáo.

Loader khởi tạo API sau sự kiện script load; không gọi `ready()` với script async/defer. Fixture kiểm riêng giới hạn này để ngăn lỗi khởi tạo widget tái diễn.

Nếu sự cố, ưu tiên sửa hostname/key, mạng/CSP và kiểm status dịch vụ. Việc tắt `TURNSTILE_LOGIN_ENABLED` trên production làm giảm bảo vệ, chỉ thực hiện khi chủ trung tâm duyệt; cần deployment mới. Dù tắt, Origin và rate limit DB vẫn giữ nguyên.

Nguồn: [tạo widget](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/), [render SPA](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).
