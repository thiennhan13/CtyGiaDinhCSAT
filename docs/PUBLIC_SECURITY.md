# Bảo vệ website

Phạm vi: bảo vệ HTTP, chống tự động hóa, dependency và giới hạn quyền. [SECURITY](../SECURITY.md) quy định secret/dữ liệu; [PROJECT_STATUS](PROJECT_STATUS.md) giữ bằng chứng triển khai và backlog.

## Các lớp bảo vệ hiện có

| Lớp | Cách hoạt động | Giới hạn |
|---|---|---|
| API | Origin, schema strict, giới hạn body; login tối đa 4 KiB | Không thay quyền nghiệp vụ/RPC |
| Đăng nhập | Turnstile trước rate limit/Auth/RPC; budget nguồn dùng chung trong DB | Chỉ hai API ứng dụng; không bảo vệ mọi đường gọi Supabase Auth trực tiếp |
| Đăng ký/tư vấn | Consent, honeypot, validation, request ID, giới hạn nguồn/số | Không CAPTCHA; email đơn mới chưa triển khai |
| Dữ liệu phụ huynh | Cookie HttpOnly/Secure/SameSite, token ngẫu nhiên lưu hash, phiên/link/published kiểm tại server; private/no-store | Số điện thoại không chứng minh danh tính |
| Secret | Service client có `server-only`, không truyền key/token vào client/log/URL | Guard không thay kiểm quyền khi dùng service role |
| HTTP | HTTPS/HSTS; nosniff, X-Frame-Options DENY, strict-origin-when-cross-origin | CSP đang Report-Only, chưa chặn tài nguyên |
| Bot | Vercel Bot Protection Log; DDoS mitigation nền tảng | Log không chặn; chưa Challenge, custom rate rule, Attack Mode hoặc BotID SDK |

CSP chỉ quan sát tại trình duyệt, không có collector lưu URL riêng tư. Không đổi route tĩnh thành dynamic chỉ để thêm nonce. Turnstile chỉ tải tại form đăng nhập đang hoạt động; cấu hình, fail-closed và nghiệm thu ở [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md).

## Giới hạn danh tính

Theo quyết định hiện hành, người biết đúng số phụ huynh có thể mở dữ liệu học tập/học phí liên kết. Rate limit, CAPTCHA, robots và WAF không xác minh sở hữu số. **SEC-02 vẫn mở**; không tự khôi phục mật khẩu/OTP/Auth hoặc gọi đây là lỗi đã được giải quyết.

Gia sư/admin giữ Supabase Auth. SEC-01 cần phương án thay mật khẩu khởi tạo bằng số điện thoại và xử lý tài khoản cũ, chưa reset hàng loạt.

## Dependency và giảm tải đã phát hành

- Bỏ shadcn CLI và chuỗi công cụ không phục vụ runtime. Giữ CSS nguyên bản tại `app/styles/ui-primitives.css`, kèm nguồn/giấy phép MIT.
- Sharp **0.35.5**; fixture xử lý ảnh đã kiểm chứng, Supabase Storage thật còn chờ.
- SheetJS **0.20.3** từ [CDN chính thức](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), khóa integrity. Bốn handler Excel dùng dynamic import khi bấm; giữ định dạng/dữ liệu, có kiểm thử round-trip workbook.
- Service Supabase có `server-only`; không tạo helper client vượt ranh giới quyền.
- Không dùng `audit fix --force` hoặc hạ phiên bản công cụ tự động chỉ để xóa advisory.

Lần audit ghi nhận trong PROJECT_STATUS: runtime 0 cảnh báo, dev/build còn 7 (5 high, 2 moderate), ở chuỗi braces/micromatch/fast-glob của ESLint Next và postcss-selector-parser của typography. Đây không phải chứng nhận không có lỗ hổng; audit registry không bao phủ đầy đủ package CDN. Tái kiểm advisory và đường sử dụng khi sửa dependency.

## Phần cần duyệt hoặc nghiệm thu tiếp

| Nhóm | Bước tiếp theo | Điều kiện |
|---|---|---|
| CAPTCHA | Login thật hai vai trò, token hết hạn/retry, lỗi dịch vụ | Không ghi credential/token vào log; widget callback thành công chưa chứng minh Siteverify toàn luồng |
| Bot/WAF | Quan sát path/method/lưu lượng trước khi chặn | Giữ người dùng hợp lệ, NAT/mobile, Googlebot và SEO; chưa đặt ngưỡng cứng |
| CSP | Quan sát vi phạm, kiểm tài nguyên Next/Supabase/Speed Insights/Cloudflare | Chỉ enforce sau kiểm thử; không dùng wildcard hoặc thu PII để giảm cảnh báo |
| Dữ liệu | Supabase staging, Storage và restore thật | Môi trường riêng, đúng quyền; không cache dữ liệu riêng tư công khai |
| Tài khoản vận hành | 2FA và quyền tối thiểu GitHub/Vercel/Supabase/Google | Chủ tài khoản tự cấu hình; không thay credential hoặc khóa người dùng ngoài phạm vi |

[Đối soát gói miễn phí và backup](FREE_TIER_OPERATIONS.md). Không tự nâng gói, đổi DNS hoặc thêm reverse proxy để chống bot.

Nguồn kỹ thuật: [Vercel DDoS](https://vercel.com/docs/vercel-firewall/ddos-mitigation), [Bot Protection](https://vercel.com/docs/bot-management), [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
