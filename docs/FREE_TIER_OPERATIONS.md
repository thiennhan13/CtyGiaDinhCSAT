# Vận hành với ngân sách miễn phí

Chủ trung tâm chọn Vercel/Supabase miễn phí và xác nhận usage ổn. Gói dependency/header/Excel, Turnstile đăng nhập và Bot Protection Log đã phát hành. Không tự nâng gói, đổi hosting/DNS hoặc mở rộng cơ chế chặn. [Bằng chứng triển khai](PROJECT_STATUS.md) · [Bảo vệ website](PUBLIC_SECURITY.md).

## Điều kiện nền tảng

Tải thấp không tự chứng minh phù hợp điều kiện gói. Lần đối chiếu nguồn nhà cung cấp 15/10/2026 ghi nhận Vercel Hobby giới hạn mục đích cá nhân phi thương mại; website tuyển sinh cần chủ trung tâm làm rõ điều kiện sử dụng/ngoại lệ. Đây là việc còn mở, chưa có quyết định chuyển nhà cung cấp.

Không duy trì bản sao bảng giá/quota dễ lỗi thời trong repo. Khi có thay đổi vận hành, đọc Usage cùng kỳ và đối chiếu [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines), [Supabase pricing](https://supabase.com/pricing) và [billing](https://supabase.com/docs/guides/platform/billing-on-supabase). Ghi rõ phạm vi team/project/organization.

| Nhóm cần theo dõi | Điều cần đối soát |
|---|---|
| Vercel | Transfer/origin transfer, CDN requests, Function invocations/CPU/memory, Image transformations/cache, Speed Insights |
| Supabase | Database, Storage, egress/cached egress, project hoạt động/pause, log retention |
| Cron | Tần suất/độ chính xác gói; cron tháng hiện tại không thay worker retry |
| Backup | Khả năng export/restore thực, Auth, Storage object; không mặc định Free có phục hồi như gói trả phí |
| Bảo vệ | Bot Log/Challenge, số rule và phạm vi rate limit; không suy dashboard Basic là đã tích hợp BotID |

Không thêm query/index/cron hoặc xóa lịch sử để tiết kiệm khi chưa có bằng chứng. RPC hiện dọn bộ đếm/phiên hết hạn khi có request tiếp theo; danh sách nghiệp vụ có phân trang.

## Backup và phục hồi

Bản được kiểm chứng gần nhất và đường dẫn cụ thể ở PROJECT_STATUS; kho chủ trung tâm là `F:\csat_backup`. Bản đó gồm Auth/public/csat_internal và metadata Storage; manifest ghi 0 object tại lúc sao lưu. Archive/checksum đã kiểm, **chưa restore thật**.

Quy trình cho lần tiếp theo:

1. Xác định đúng database và phạm vi được phép. Backup trước migration có tác động; giữ manifest, checksum và thời điểm.
2. Sao lưu Storage object riêng khi có: database dump không chứa bytes ảnh.
3. Kiểm archive có thể đọc; phục hồi vào môi trường riêng được phép chứa dữ liệu thật, kiểm schema/RPC/quyền/liên kết và số liệu tổng hợp.
4. Thống nhất mã hóa, bản ngoài máy, lịch và thời hạn lưu/xóa với chủ trung tâm. Checksum không thay mã hóa.
5. Chỉ ghi báo cáo đã lược vào Git; không đưa dump, hồ sơ, khóa giải mã vào repo/CI artifact.

Chưa có staging Supabase. Project thử dùng fixture không mặc nhiên được phép chứa dump production; môi trường diễn tập restore phải được cho phép riêng. Không restore đè production hoặc tự xóa backup cũ.

## Theo dõi và xử lý

- Đọc dashboard cùng kỳ; lưu tổng hợp đã lược PII, không chụp trang secret. Ảnh trong repo tiêu băng thông hosting, không phải Supabase Storage.
- Ngưỡng 70% để điều tra, 85% để thống nhất giảm tải là **đề xuất**, chưa có alert tự động. Không tự ngắt login/nhận đơn hoặc xóa lịch sử.
- Duyệt lịch backup theo tốc độ thay đổi dữ liệu và thời gian mất dữ liệu chấp nhận được; chưa có lịch tự động.
- Bot Protection giữ Log cho đến khi có lưu lượng đại diện. Rule/ngưỡng chặn phải được duyệt sau khi đánh giá người dùng hợp lệ/NAT/SEO; không thêm bypass rộng.
- Khi sự cố, lưu sớm request ID, thời gian, path và lỗi đã lược vì log gói miễn phí ngắn. Không lưu body liên hệ, số điện thoại, cookie/token.
- Đối chiếu dependency advisory khi nâng phiên bản; kiểm quyền/phiên bằng fixture và staging, không dùng audit làm chứng nhận an toàn.

## Việc còn chờ

Supabase staging/Storage; môi trường restore thật; mã hóa/bản ngoài máy/lịch lưu backup; nghiệm thu login có CAPTCHA và đơn hợp lệ đến admin; advisory dev/build; điều kiện hosting. Cấu hình chặn bot/CSP mạnh hơn cần quyết định riêng. Tiêu chí đóng từng việc ở PROJECT_STATUS.
