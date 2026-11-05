# Bảo vệ website

Phạm vi: bảo vệ HTTP, chống tự động hóa, dependency và giới hạn quyền. [SECURITY](../SECURITY.md) quy định secret/dữ liệu; [PROJECT_STATUS](PROJECT_STATUS.md) giữ bằng chứng triển khai và backlog.

## Các lớp bảo vệ hiện có

| Lớp | Cách hoạt động | Giới hạn |
|---|---|---|
| API | Origin, schema strict, giới hạn body; login tối đa 4 KiB | Không thay quyền nghiệp vụ/RPC |
| Đăng nhập | Turnstile trước rate limit/Auth/RPC; budget nguồn dùng chung trong DB | Chỉ hai API ứng dụng; không bảo vệ mọi đường gọi Supabase Auth trực tiếp |
| Đăng ký/tư vấn | Consent, honeypot, validation, request ID, giới hạn nguồn/số | Không CAPTCHA; email đơn mới chưa triển khai |
| Dữ liệu phụ huynh | Google/Supabase Auth qua cookie SSR; phiên/link active/published kiểm tại server; private/no-store | Số điện thoại không chứng minh danh tính |
| Secret | Service client có `server-only`, không truyền key/token vào client/log/URL | Guard không thay kiểm quyền khi dùng service role |
| HTTP | HTTPS/HSTS; nosniff, X-Frame-Options DENY, strict-origin-when-cross-origin | CSP đang Report-Only, chưa chặn tài nguyên |
| Bot | Vercel Bot Protection Log; DDoS mitigation nền tảng | Log không chặn; chưa Challenge, custom rate rule, Attack Mode hoặc BotID SDK |

CSP chỉ quan sát tại trình duyệt, không có collector lưu URL riêng tư. Không đổi route tĩnh thành dynamic chỉ để thêm nonce. Turnstile chỉ tải tại form đăng nhập đang hoạt động; cấu hình, fail-closed và nghiệm thu ở [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md).

## Giới hạn danh tính

Theo quyết định hiện hành, tài khoản Google biết đúng số phụ huynh chưa được nhận liên kết có thể tự nhận quyền xem hồ sơ khi số khớp. Rate limit, CAPTCHA, robots và WAF không xác minh sở hữu số. **SEC-02 vẫn mở**; không tự khôi phục mật khẩu/OTP/Auth hoặc gọi đây là lỗi đã được giải quyết.

Gia sư/admin giữ Supabase Auth. SEC-01 cần phương án thay mật khẩu khởi tạo bằng số điện thoại và xử lý tài khoản cũ, chưa reset hàng loạt.

## Dependency và giảm tải đã phát hành

- Bỏ shadcn CLI và chuỗi công cụ không phục vụ runtime. Giữ CSS nguyên bản tại `app/styles/ui-primitives.css`, kèm nguồn/giấy phép MIT.
- Sharp **0.35.5**; fixture xử lý ảnh đã kiểm chứng, Supabase Storage thật còn chờ.
- SheetJS **0.20.3** từ [CDN chính thức](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), khóa integrity. Bốn handler Excel dùng dynamic import khi bấm; giữ định dạng/dữ liệu, có kiểm thử round-trip workbook.
- Service Supabase có `server-only`; không tạo helper client vượt ranh giới quyền.
- Không dùng `audit fix --force` hoặc hạ phiên bản công cụ tự động chỉ để xóa advisory.

Đợt phát hành2.1.0 đối chiếu Dependabot05/11/2026: cập nhật Next.js/eslint-config-next16.4.1, Zod4.6.6; override đúng dải minimatch bị ảnh hưởng lên11.0.1 và postcss-selector-parser lên6.1.5. Override minimatch không thay nhánh3.x của ESLint; bản11 được kiểm trên Node24 bằng lint/build/test. Không dùng audit fix --force. Nguồn advisory: [Next.js cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Next.js image](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), [selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

Sau cập nhật, npm audit trên Node24.22.1 báo0 vulnerability (cả runtime và dev). Build/typecheck/lint/repo đạt; GitHub và CI của commit phát hành được ghi ở PROJECT_STATUS/Release. Kết quả registry không bao phủ toàn bộ package CDN hoặc chứng minh ứng dụng không có lỗ hổng. GitHub secret scanning/push protection và báo cáo bảo mật riêng đã bật; không tự sửa lịch sử Git từ kết quả quét.

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
