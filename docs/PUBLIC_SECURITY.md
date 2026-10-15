# Bảo vệ website và các quyết định cần chốt

## Bằng chứng hiện hành

Kiểm tra chỉ đọc production ngày **15/10/2026**: HTTPS/HSTS hoạt động; registry có migration27. RPC mở/kiểm tra phiên phụ huynh và lưu đơn chỉ cấp EXECUTE cho service role. RLS bật trên parent_accounts, parent_lookup_sessions, consultation_requests và auth_attempts. Không đọc hồ sơ hoặc thực hiện thao tác ghi để kiểm tra.

Trong mã: đăng nhập kiểm tra Origin và body tối đa 4 KiB; rate limit lưu DB, chung nguồn cho phụ huynh/gia sư. Form đăng ký có consent, honeypot, validation, giới hạn body, idempotency và giới hạn gửi theo nguồn/số. Cookie tra cứu HttpOnly/Secure/SameSite, token ngẫu nhiên chỉ lưu hash ở DB; dữ liệu phụ huynh private/no-store. Đây không phải chứng nhận đã kiểm toán toàn hệ thống.

Phản hồi trang chủ/login đã kiểm tra chưa có CSP, X-Frame-Options, X-Content-Type-Options hoặc Referrer-Policy tường minh. Chưa đọc cấu hình Firewall của project nên không khẳng định WAF/Bot Protection đã bật.

## Đề xuất chờ chốt

| Nhóm | Đề xuất | Điều kiện nghiệm thu |
|---|---|---|
| Bot và tải bất thường | Dùng Vercel Firewall, thử Bot Protection ở Log trước; áp dụng rate limit có chọn lọc tại endpoint đăng nhập/gửi đơn | Không chặn Googlebot đã xác minh, robots, sitemap, tệp xác minh; thử mobile/NAT, lỗi429 và request hợp lệ |
| CAPTCHA | Chỉ thêm khi dữ liệu cho thấy spam vượt lớp hiện có; xác minh token ở server | Không tải script CAPTCHA trên mọi trang; kiểm tra hết hạn, retry, accessibility và tác động form |
| Header trình duyệt | nosniff, chống nhúng iframe, Referrer-Policy phù hợp; CSP triển khai từng bước sau kiểm kê nguồn | Kiểm tra Next hydration, theme, Supabase, ảnh/video và Speed Insights; không áp script-src nghiêm ngặt khi chưa có nonce/hash phù hợp |
| Dữ liệu và secret | Giữ RLS/RPC, quyền tối thiểu, key server-only; thêm guard server-only cho module service, rà log/backup/Preview | Không log body liên hệ/token/key, Preview không dùng dữ liệu thật, backup có quyền truy cập và thử restore |
| Tài khoản vận hành | 2FA cho chủ GitHub/Vercel/Supabase/Google; xét lại mật khẩu khởi tạo gia sư | Chủ tài khoản tự thiết lập credential; không reset hàng loạt hoặc khóa người dùng ngoài phạm vi |

Vercel có [DDoS mitigation](https://vercel.com/docs/vercel-firewall/ddos-mitigation); [Bot Protection](https://vercel.com/docs/bot-management) là cấu hình riêng, mặc định Off và có chế độ Log/Challenge. Không suy trạng thái project từ khả năng nền tảng. Không chèn thêm reverse proxy chỉ vì muốn chống bot khi chưa đánh giá ảnh hưởng nhận diện nguồn và SEO.

## Giới hạn danh tính phụ huynh

Theo quyết định hiện hành, chỉ nhập số điện thoại để tra cứu. Người biết đúng số có thể mở thông tin học tập/học phí liên kết mà không cần dò hàng loạt. Rate limit, CAPTCHA, robots hoặc WAF không chứng minh người sở hữu số. **SEC-02 vẫn mở.** Giữ quyết định này cho đến khi chủ trung tâm duyệt thay đổi; nếu cần riêng tư cao hơn có thể cân nhắc mã truy cập riêng từng gia đình hoặc xác minh sở hữu số. Không tự thêm mật khẩu/OTP hoặc coi chống spam là đã giải quyết danh tính.

## Dependency cần xử lý riêng

`npm audit --omit=dev` ngày 15/10/2026 báo **24 package cảnh báo**: 1 critical, 16 high, 6 moderate, 1 low. Đây là số package bị gắn advisory, không phải 24 đường khai thác đã chứng minh trên website. Không chạy audit fix --force.

- Critical proxy-addr đi qua shadcn CLI → MCP SDK → Express. Không tìm thấy import shadcn trong app/components/features/lib. Đề xuất chuyển công cụ tạo UI khỏi dependency runtime và cập nhật toolchain; không gọi đây là lỗi critical đã chứng minh trong request Next. [Advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
- Sharp 0.34.5 có advisory ở các thư viện ảnh phụ thuộc; ứng dụng thực sự dùng để xử lý avatar. Mã hiện giới hạn định dạng JPG/PNG/WebP, dung lượng, pixel và số trang, nhưng các giới hạn đó không thay bản vá. Cần nâng phiên bản phù hợp và kiểm tra avatar/Next Image trước release riêng. [Advisory librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- XLSX 0.18.5 có advisory, npm không có bản sửa theo audit. Các call site hiện tìm thấy chỉ xuất Excel, không có XLSX.read/readFile trong mã ứng dụng; chưa chứng minh đường nhập file độc hại. Cần chọn nguồn/bộ thư viện thay thế còn được duy trì và kiểm tra định dạng báo cáo. [Advisory ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).

Báo cáo audit đầy đủ giữ ở scratch ngoài Git. Đợt phát hành tối ưu giao diện không thay package-lock, chính sách truy cập, Firewall hoặc secret; các mục trên là đề xuất riêng cần duyệt và kiểm chứng tương ứng.
