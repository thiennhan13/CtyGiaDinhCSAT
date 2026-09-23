> Cập nhật 23/09/2026: cấu hình hiện hành và chuỗi migration đến 22 xem [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md); việc còn mở trước khi bật email/API xem [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md). Tài liệu bên dưới giữ bối cảnh của đợt cũ, không thay thế checklist hiện hành.

# Hoàn thiện cổng phụ huynh và email — 22/09/2026

## Trạng thái và phạm vi

Đã triển khai mã nguồn local; chưa áp dụng migration production, chưa deploy, chưa gửi thư thật. API CSATOJ để lại ngoài phạm vi. Prototype và Excel nguồn không đưa lên Git.

Kiểm tra production chỉ đọc ngày 22/09/2026 qua TLS xác minh bằng CA Supabase: schema đến 17; 25 lộ trình lớp đã công bố, không có bản nháp khác bản công bố; Cơ bản 12 lớp, Nâng cao 13, Luyện thi 4; 49 liên kết phụ huynh/học sinh; 146 bản ghi học phí. Chưa có nhận xét hoặc job email; email tháng tắt và chưa cấu hình người nhận admin. Đây là snapshot kiểm tra, cần chạy lại trước phát hành.

## Các thay đổi bổ sung

- Migration 21 yêu cầu 19 và 20, có transaction, timeout và chặn chạy lại. Không cập nhật bản ghi nghiệp vụ khi áp dụng.
- Trước lần gửi đầu: kiểm tra quyền/phân công, chỉ giữ các nhận xét missing/draft trong danh sách ban đầu. Không bổ sung học sinh mới phát sinh vào đợt cũ. Nếu tất cả đã hoàn thành thì bỏ qua thư. Lưu payload và targets cùng transaction claim; retry giữ nguyên payload/from/recipient/reply-to và ID. Snapshot đợt vẫn nguyên vẹn.
- RPC phụ huynh giữ nguyên chữ ký, mở rộng attendance với tuition_amount (number|null), billing_period (string|null), fee_adjusted (boolean). Dùng effective_attendance gồm snapshot và điều chỉnh được ghi nhận; không dùng giá lớp hiện tại. Vắng = 0, có mặt nhưng thiếu phí/điểm danh = null, buổi hủy = null. Bản ghi cũ vẫn được bảo toàn.
- Giao diện đọc được schema cũ: trường bổ sung thiếu thì hiển thị chưa có dữ liệu/trạng thái; không suy ra chưa chốt. Chi tiết và bản in có giờ học, nội dung, học tiếp và phí. Tổng quan không có kỳ nào thì hiển thị chưa đủ dữ liệu thay vì bốn số 0.
- Câu nhận xét trống phản ánh đúng thao tác gia sư gửi nhận xét; không mô tả thành một bước admin duyệt bắt buộc.

## Quy trình phát hành cụ thể

1. Rà soát toàn bộ tập thay đổi local liên quan: public/tư vấn, email, chương trình và phụ huynh. Không chỉ phát hành API hoặc UI riêng lẻ. Kiểm tra không có prototype, Excel, .env, dữ liệu thử hoặc scratch trong commit.
2. Xác nhận đúng Supabase/Vercel project, production branch và cấu hình triển khai; chưa tự mua/nâng gói hosting. Tạo backup production và xác nhận cách phục hồi; việc phục hồi PostgreSQL cục bộ đã thử không thay cho backup production.
3. Giữ email tháng tắt; hai công tắc CONSULTATIONS_ENABLED và CONSULTATIONS_EMAIL_ENABLED ở false. Preview không có khóa gửi Production; VERCEL_ENV do nền tảng quản lý.
4. Sau khi được phép ghi database: chỉ áp dụng các migration còn thiếu, thứ tự 18 → 19 → 20 → 21. Không chạy lại toàn thư mục. Sau mỗi migration chạy SQL verification tương ứng, đối chiếu số lượng/lịch sử/kỳ đã chốt với trước phát hành.
5. Deploy bản ứng dụng đã nghiệm thu với email vẫn tắt. Kiểm tra tài khoản phụ huynh được phép, đổi học sinh, học phí, chương trình; kiểm tra admin quản lý tư vấn và email. Xác nhận cron /api/cron/monthly-reviews lịch 0 1 28 * *.
6. Hoàn tất Resend/DNS/Vercel theo EMAIL_VERCEL_SETUP_20260914.md. Điền người nhận admin csattutor@gmail.com. Công cụ thư mẫu bên dưới chỉ chạy sau khi được phép gửi thật.
7. Bật nhận form trước, thử lưu bằng dữ liệu do trung tâm kiểm soát; bật thư tư vấn và đối chiếu Resend/Gmail. Cuối cùng bật email tháng trong admin, sau khi kiểm tra địa chỉ gia sư và bản xem trước.
8. Ngày 28 kiểm tra sau 09:00 Việt Nam, xử lý hàng đợi còn chờ/khôi phục đợt thiếu. Hằng ngày kiểm tra yêu cầu tư vấn đầu và cuối ngày. Không có worker retry tự động ở phiên bản này.

Nếu chưa hoàn tất Resend, vẫn có thể phát hành giao diện/database với gửi email tắt. Không đánh dấu email đã vận hành thật trước khi thử được nhà cung cấp và Gmail.

## Công cụ vận hành

### Kiểm tra database chỉ đọc

Chạy từ root: `node scripts/audit-release.cjs`. Cần DATABASE_URL và CA chính thức qua CSAT_DB_CA_FILE (mặc định scratch/supabase-prod-ca.crt đã có trên máy này). Công cụ dùng BEGIN READ ONLY, chỉ xuất tổng hợp và quyền; không claim/prepare job. Không tắt xác minh TLS khi lỗi chứng chỉ.

### Thư mẫu chỉ đến Gmail trung tâm

`node scripts/email-smoke.cjs --id=<UUID-v4-moi> --kind=reminder` chỉ hiển thị mẫu, không gửi, không ghi database. Có ba mẫu: consultation, reminder, digest. Tạo UUID bằng trình quản lý/công cụ có sẵn; không dùng chuỗi mẫu làm UUID thật.

Sau khi được phép gửi thử, nạp RESEND_API_KEY từ kho bí mật vào môi trường tiến trình; CSAT_EMAIL_FROM phải là `CSAT <thongbao@notify.csatoj.vn>`. Thêm `--send` vào đúng lệnh đã xem trước. Script này là công cụ vận hành có chủ đích, tách biệt luồng web vốn chặn gửi trên local/Preview; không giả mạo VERCEL_ENV.

Người nhận và Reply-To khóa về csattutor@gmail.com; nội dung hoàn toàn giả, không đọc database. Mỗi mẫu dùng UUID riêng. Checkpoint nằm trong scratch/email-smoke (không commit): giữ nguyên để retry cùng UUID/kind/payload, đợi ít nhất 5 phút, tối đa 3 lần và trong 23 giờ. Accepted chỉ có nghĩa Resend tiếp nhận; kiểm tra Inbox/Spam và Reply-To thật. Lỗi không rõ kết quả phải đối chiếu trước; không đổi UUID hoặc xóa checkpoint để gửi lại. Nếu còn lock sau sự cố, kiểm tra tiến trình đã dừng và đối chiếu Resend trước khi người vận hành xử lý lock.

## Phục hồi

Migration lỗi trong transaction sẽ rollback. Nếu migration đã commit, không xóa snapshot/outbox hoặc khôi phục đè làm mất dữ liệu mới. Tắt gửi, dừng phát hành và chuẩn bị migration bù từ snapshot/backup đã kiểm chứng. Có thể rollback ứng dụng về phiên bản tương thích schema bổ sung. Thư đã được nhà cung cấp tiếp nhận không thu hồi được bằng tắt công tắc.

## Nghiệm thu

- 244/244 kiểm thử hồi quy đạt, không bỏ qua; có PostgreSQL 17 thật cục bộ, claim/prepare đồng thời và phục hồi bản sao tách biệt.
- TypeScript và production build cục bộ đạt. Lint toàn bộ app/components/lib/proxy và công cụ audit/smoke: 0 lỗi, 17 cảnh báo cũ; lint nghiêm ngặt phần sửa cuối: 0 lỗi/cảnh báo.
- Browser phụ huynh đạt ở 1440/768/375px, dark mode, bàn phím/Escape, menu mobile, chặng xem khác chặng học, định hướng Cơ bản/Nâng cao, chưa công bố, phí thiếu/đã điều chỉnh, không có kỳ học phí và A4.
- Browser vận hành email đạt 8 tổ hợp: xem trước trước khi tạo, tạo không tự gửi, xử lý tiếp, bộ lọc, đối chiếu; không tràn ngang hoặc lỗi JavaScript.
- Công cụ email mẫu đã chạy dry-run; kiểm thử việc gửi dùng fetch giả. Không có thư thật gửi trong phiên.
- Audit production chỉ đọc dùng CA Supabase và xác minh TLS; schema/công tắc vẫn như mục hiện trạng. Chưa tạo backup production hoặc ghi dữ liệu production.
- Route QA tạm đã xóa; prototype không nằm trong danh sách Git theo dõi.

Bằng chứng local nằm trong scratch/: release-all-tests.log, release-lint.log, release-build.log, release-audit-20260922.json, parent-session-fee-mobile.png, parent-a4.pdf và ảnh email-*.png. Các tệp này không đưa lên Git. Manifest mã nguồn/migration tại scratch/release-manifest-20260922.json giúp đối chiếu đúng bản đã kiểm thử; cần tái kiểm tra khi mã thay đổi.
