# Bảo vệ website và các quyết định cần chốt

## Bằng chứng hiện hành

Kiểm tra chỉ đọc production ngày **15/10/2026**: HTTPS/HSTS hoạt động; registry có migration27. RPC mở/kiểm tra phiên phụ huynh và lưu đơn chỉ cấp EXECUTE cho service role. RLS bật trên parent_accounts, parent_lookup_sessions, consultation_requests và auth_attempts. Không đọc hồ sơ hoặc thực hiện thao tác ghi để kiểm tra.

Trong mã: đăng nhập kiểm tra Origin và body tối đa 4 KiB; rate limit lưu DB, chung nguồn cho phụ huynh/gia sư. Form đăng ký có consent, honeypot, validation, giới hạn body, idempotency và giới hạn gửi theo nguồn/số. Cookie tra cứu HttpOnly/Secure/SameSite, token ngẫu nhiên chỉ lưu hash ở DB; dữ liệu phụ huynh private/no-store. Đây không phải chứng nhận đã kiểm toán toàn hệ thống.

Phản hồi production trước đợt vá chưa có các header bảo vệ tường minh dưới đây. Bản mã local bổ sung `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` và CSP **Report-Only** cho production build. CSP hiện chỉ quan sát qua trình duyệt, không chặn tài nguyên và không có endpoint thu thập URL riêng tư. Chưa deploy các header này.

**Quyết định hiện hành:** chủ trung tâm xác nhận Usage ổn và duyệt thực hiện các bước 2–5. Ngày **15/10/2026**, đã Publish Bot Protection **Log** trên project Vercel và xác nhận trạng thái; chưa bật Challenge/Attack Mode hoặc custom rate rule. DDoS mitigation có sẵn tiếp tục hoạt động; AI Bots giữ Allow. Chưa cài BotID SDK hay CAPTCHA. Không suy nút Basic trên dashboard thành đã tích hợp BotID trong ứng dụng.

Chủ trung tâm dùng hai gói miễn phí. [Đối soát Free](FREE_TIER_OPERATIONS.md) ghi giới hạn tính năng, backup, bằng chứng kiểm thử và phần chờ. Điều kiện Hobby phi thương mại vẫn cần chủ trung tâm làm rõ riêng; không tự nâng gói/đổi hosting. Mã vá dependency/header/Excel chưa commit, push hoặc deploy trong đợt này.

## Đề xuất chờ chốt

| Nhóm | Đề xuất | Điều kiện nghiệm thu |
|---|---|---|
| Bot và tải bất thường | Bot Protection Log đã bật; quan sát trước khi chặn hoặc dùng một custom rate rule gộp endpoint | Không chặn Googlebot đã xác minh, robots, sitemap, tệp xác minh; đánh giá mobile/NAT và request hợp lệ |
| CAPTCHA | Đã được duyệt chỉ cho đăng nhập phụ huynh/gia sư/admin; mã local có, chờ widget/key và phát hành | Không tải script trên mọi trang hoặc form đăng ký; kiểm tra hết hạn, retry, accessibility và xác minh Cloudflare thật |
| Header trình duyệt | Mã và kiểm thử HTTP đã có; CSP Report-Only vẫn cho inline Next/script/style | Trước enforce cần quan sát tài nguyên hợp lệ trên deployment, đặc biệt Supabase/Speed Insights; không đổi trang tĩnh sang dynamic để thêm nonce |
| Dữ liệu và secret | Đã thêm guard `server-only`; kiểm thử quyền/phiên và backup mới đã chạy | Không log body liên hệ/token/key; phục hồi Supabase thật, mã hóa/offsite và lịch backup còn chờ |
| Tài khoản vận hành | 2FA cho chủ GitHub/Vercel/Supabase/Google; xét lại mật khẩu khởi tạo gia sư | Chủ tài khoản tự thiết lập credential; không reset hàng loạt hoặc khóa người dùng ngoài phạm vi |

Vercel có [DDoS mitigation](https://vercel.com/docs/vercel-firewall/ddos-mitigation); [Bot Protection](https://vercel.com/docs/bot-management) là cấu hình riêng, mặc định Off và có chế độ Log/Challenge. Không suy trạng thái project từ khả năng nền tảng. Không chèn thêm reverse proxy chỉ vì muốn chống bot khi chưa đánh giá ảnh hưởng nhận diện nguồn và SEO.

## Giới hạn danh tính phụ huynh

Theo quyết định hiện hành, chỉ nhập số điện thoại để tra cứu. Người biết đúng số có thể mở thông tin học tập/học phí liên kết mà không cần dò hàng loạt. Rate limit, CAPTCHA, robots hoặc WAF không chứng minh người sở hữu số. **SEC-02 vẫn mở.** Giữ quyết định này cho đến khi chủ trung tâm duyệt thay đổi; nếu cần riêng tư cao hơn có thể cân nhắc mã truy cập riêng từng gia đình hoặc xác minh sở hữu số. Không tự thêm mật khẩu/OTP hoặc coi chống spam là đã giải quyết danh tính.

## Dependency và giảm tải đã chuẩn bị local

`npm audit --omit=dev` ngày **15/10/2026** giảm từ **24 package cảnh báo xuống 0** sau cập nhật. Đây là kết quả danh mục advisory tại thời điểm kiểm tra, không chứng nhận không có lỗ hổng. Nguồn CDN không được registry audit bao phủ như package registry; SheetJS được đối chiếu nguồn phát hành chính thức và lockfile có integrity.

- Loại shadcn CLI khỏi dependency runtime cùng chuỗi MCP/Express không phục vụ request. Có import **CSS** trong globals: giữ nguyên nội dung stylesheet tại `app/styles/ui-primitives.css`, kèm nguồn và giấy phép MIT; không xóa style UI đang sử dụng.
- Sharp lên **0.35.5**; các kiểm thử định dạng, pixel, ảnh lỗi và metadata đạt. Chưa nghiệm thu upload qua Supabase Storage thử thật.
- XLSX lên **SheetJS 0.20.3** từ [CDN chính thức](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). Bốn nơi xuất Excel chuyển sang `import()` lúc bấm; chưa dùng thư viện để nhập file người dùng. Kiểm thử handler thật với fixture và đọc lại bytes workbook xác nhận tiếng Việt, kiểu số, khoản điều chỉnh/công nợ, tổng lương và tên sheet trùng.
- `lib/supabase/service.ts` có guard `server-only`; build sẽ từ chối import vào client. Không thay kiểm quyền API/RPC bằng guard này.
- Cập nhật transitive tương thích sau xem dry-run; không dùng `audit fix --force`.

Audit toàn bộ còn **7 cảnh báo dev/build (5 high, 2 moderate)**: chuỗi braces/micromatch/fast-glob của ESLint Next và postcss-selector-parser của typography. Chưa thấy đường nhận glob/selector tùy ý từ người truy cập web trong các công cụ này; vẫn phải theo dõi bản vá upstream. Đề xuất tự động downgrade Next ESLint/typography không được áp dụng; không gọi audit toàn bộ đã sạch.

Báo cáo audit/QA ở scratch ngoài Git. Không thay schema, quyền, cách tra cứu, dữ liệu lịch sử hoặc secret. Query hiện có tiếp tục giữ phân trang; chưa có bằng chứng cần thêm cache/index/cron hoặc xóa dữ liệu. Tối ưu ảnh responsive và JS công khai của release trước được giữ nguyên.

## CAPTCHA đăng nhập đã duyệt

Chủ trung tâm đã duyệt Cloudflare Turnstile Free **chỉ cho trang đăng nhập**, thay cho đề xuất chờ spam trước đó. Mã local có widget theo vai trò và Siteverify ở server; giữ Origin/body/rate limit, không thêm vào đăng ký/tư vấn. Token dùng một lần, hết hạn sau năm phút; reset sau gửi/đổi vai trò, giữ nội dung nhập khi thử lại. Không JS có liên hệ trực tiếp. CSP thêm đúng origin script/frame. Chưa tạo widget, lưu secret thật, deploy hoặc nghiệm thu Cloudflare thật. Hướng dẫn tạo widget Managed, ba biến Vercel và ma trận kiểm chứng tại [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md).

Nguồn: [gói Turnstile](https://developers.cloudflare.com/turnstile/plans/), [xác minh phía máy chủ](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
