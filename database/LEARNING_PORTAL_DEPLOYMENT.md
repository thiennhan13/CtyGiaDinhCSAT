# Triển khai cổng phụ huynh và nhận xét tháng — 10/09/2026

Gói mã đã triển khai trong workspace. Chưa áp dụng lên Supabase thật, chưa commit/push hoặc deploy. Không chạy lại gói nâng cấp kế toán cũ.

## 1. Thứ tự triển khai

1. Giữ bản sao lưu Supabase theo quy trình đang dùng.
2. Chạy **database/upgrade-learning-portal.sql** một lần trong Supabase SQL Editor. Gói yêu cầu migration kế toán `20260909_10` và gộp các migration 11–15 trong một transaction. Có lỗi thì toàn bộ gói được rollback.
3. Chạy **database/verification/20260910_learning_portal.sql** để kiểm tra chỉ đọc. Cần đủ năm phiên bản 11–15; các bảng mới bật RLS; anonymous không được đọc trực tiếp và authenticated không được ghi trực tiếp.
4. Cập nhật mã nguồn lên Vercel, redeploy và kiểm tra bằng tài khoản admin/gia sư cùng hồ sơ phụ huynh đã liên kết.
5. Vào **Admin → Học sinh → Chương trình & nhận xét**: xác nhận lộ trình của lớp cũ, cấu hình kênh liên hệ, giới thiệu gia sư và email admin.
6. Gia sư lưu và công bố lộ trình/nội dung buổi. Phụ huynh chỉ thấy bản đã công bố. Nhập hồ sơ hàng loạt từ **Tra cứu phụ huynh → Nhập hồ sơ từ danh sách học sinh**.

Không chạy cả gói tổng hợp và từng migration riêng. Gói chủ động từ chối chạy lại khi đã có phiên bản của đợt này. Nếu đã chạy một phần bằng file riêng, kiểm tra phiên bản và chỉ thực hiện phần còn thiếu sau khi đối chiếu.

## 2. Những phần đã tích hợp

- Phụ huynh tra cứu bằng số điện thoại đã liên kết, không có mật khẩu/OTP. Mọi dữ liệu vẫn kiểm tra phiên tra cứu opaque ở phía máy chủ.
- Lộ trình lớp có chương trình, hình thức học nhóm/1–1, phiên bản giáo án, mục tiêu và chặng đang tập trung. Trọng tâm của học sinh được ghi riêng; không tự suy ra mức độ thành thạo từ điểm danh hoặc số buổi.
- Khung Cơ bản 30 buổi, Nâng cao 35 buổi lấy từ nội dung bản mẫu đã duyệt, giữ ghi chú nguồn và các phần được đánh dấu đề xuất. VOI chưa có template mặc định; chờ giáo án trung tâm.
- Lớp mới tự nhận template mặc định trong cùng transaction tạo lớp. Lớp đã chọn template giữ phiên bản đó; sửa mặc định không làm đổi chương trình của lớp đang học.
- Nội dung buổi dùng bảng riêng. Gia sư chọn nhóm buổi trong giáo án để điền rồi chỉnh theo thực tế. Không dùng ghi chú điểm danh làm nội dung công khai.
- Nhận xét và tag một lần/tháng/học sinh/lớp. Mở lại đúng nhận xét đã có; tự lưu bản nháp sau khoảng 1,8 giây ngừng nhập; lỗi lưu không bị thử vô hạn. Công bố bằng nút Gửi nhận xét.
- Gợi ý tag dựa trên trọng tâm, nội dung buổi trong tháng và đề xuất từ nhận xét trước. Không tự chọn thẻ, mức độ, minh chứng hoặc kết luận tiến bộ.
- Admin có hàng đợi tháng, xem nhận xét, chuyển bản nháp sang gia sư hiện tại khi đổi phân công, và thêm đính chính cho nhận xét đã công bố. Đính chính không thay thế hoặc xóa bản gốc.
- Trang phụ huynh có lộ trình, trọng tâm, nhận xét phân trang, điểm danh theo tháng, nội dung buổi, học phí thực, giới thiệu gia sư, nội dung liên hệ để sao chép và in/lưu A4.
- Học phí tách đã chốt, thanh toán ròng, còn phải đóng, dư/cần hoàn và tạm tính. Khoản tạm tính chưa được coi là công nợ; thiếu điểm danh/phí thì hiển thị chưa đầy đủ.
- Nhập hồ sơ có bản xem trước và kiểm tra lại nguồn khi ghi. Số có nhiều nội dung, thiếu tên, khác tên, hoặc hồ sơ khóa phải đối chiếu riêng. Chỉ thêm hồ sơ/liên kết cần thiết; không ghi đè cột nguồn, xóa liên kết cũ hoặc tự mở khóa.
- Dữ liệu OJ/contest và giáo án VOI tiếp tục để giai đoạn sau, không tạo số liệu minh họa trong trang thật.

## 3. Email nhắc ngày 28

Gửi **một email cho mỗi gia sư còn thiếu/bản nháp có thể xử lý**, kèm các liên kết yêu cầu đăng nhập; **một email tổng hợp cho từng địa chỉ admin**. Gia sư đã hoàn tất không bị nhắc. Trường hợp nghỉ học, thiếu phân công hoặc bản nháp thuộc gia sư trước được báo để admin kiểm tra.

Email tổng hợp là ảnh chụp tình hình tại thời điểm nhắc, có trạng thái gửi đã biết. Trang admin luôn hiển thị dữ liệu hiện tại. Học sinh mới phát sinh sau đợt nhắc được theo dõi ở hàng đợi tháng; không tự tạo đợt email bổ sung.

Transport hiện dùng Resend qua API; không cần cài thêm package gửi mail. Trên Vercel Production, thêm:

| Biến | Giá trị |
| --- | --- |
| `RESEND_API_KEY` | API key gửi mail của trung tâm; chỉ lưu trong môi trường máy chủ |
| `CSAT_EMAIL_FROM` | Ví dụ định dạng `CSAT <dia-chi@ten-mien-da-xac-minh>`; dùng địa chỉ thật đã xác minh |
| `APP_ORIGIN` | Origin HTTPS chính thức của portal, không có đường dẫn; không dùng URL preview |
| `CRON_SECRET` | Chuỗi bí mật ngẫu nhiên dành cho cron |
| Các biến Supabase đang dùng | Giữ cấu hình URL, anon/publishable và service key hợp lệ hiện tại |

Không đặt các bí mật gửi email dưới tiền tố `NEXT_PUBLIC_`. Không cần `DATABASE_URL` cho ứng dụng chạy; biến này chỉ phục vụ truy vấn quản trị/kiểm tra khi cần.

Sau khi xác minh tên miền gửi và thêm email admin trong giao diện, bật **Kích hoạt email ngày 28**. Mặc định đang tắt; preview/development không được gửi qua endpoint cron hoặc nút thử lại.

Vercel dùng UTC: lịch cấu hình tương ứng 08:00 Việt Nam ngày 28. Thời điểm thực thi có thể lệch theo gói Vercel; lịch không cam kết chính xác từng phút trên mọi gói. Tham khảo [Vercel Cron](https://vercel.com/docs/cron-jobs) và [giới hạn lịch](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Hàng đợi lưu payload cố định, có lease chống hai worker nhận cùng thư và khóa idempotency theo mã thư. Sau lỗi, admin có thể chọn **Thử lại thư đang chờ**; tối đa ba lần, cách nhau ít nhất năm phút. Khi lần gửi không chắc chắn đã quá 23 giờ, hệ thống yêu cầu đối chiếu thủ công để tránh vượt cửa sổ chống trùng 24 giờ của [Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

`accepted` chỉ có nghĩa nhà cung cấp đã tiếp nhận. Chưa có webhook xác nhận delivered/bounced. Không gửi email cho phụ huynh, không tự công bố nhận xét và không tự chốt sổ.

## 4. Chốt sổ và dữ liệu lịch sử

Admin chốt sổ thủ công, thường đầu tháng sau, theo khoảng thời gian đã đối chiếu. Nhận xét tháng và kỳ học phí độc lập; thiếu nhận xét không tự chặn chốt sổ. Các kiểm tra điểm danh, danh sách học sinh và đơn giá trước khi chốt vẫn áp dụng.

Gói này không cập nhật lại hóa đơn cũ, không tính lại học phí quá khứ, không đổi trạng thái điểm danh cũ, không mở lại kỳ đã chốt. Các bất thường lịch sử đã được phát hiện trong đợt kiểm tra kế toán không được tự xóa/sửa bởi gói phụ huynh.

## 5. Kiểm thử và giới hạn xác nhận

Đã chạy 183 kiểm thử database/API đạt và kiểm thử bổ sung chính file SQL tổng hợp đạt (184 ca tổng cộng), bao gồm migration trên PGlite và PostgreSQL 17 cục bộ, cập nhật bản nháp cạnh tranh, lease email cạnh tranh, chốt sổ/thu tiền cạnh tranh và phục hồi bản sao lưu độc lập.

TypeScript và production build đã đạt. ESLint không có lỗi, còn 18 cảnh báo sẵn có; kiểm tra whitespace bằng git diff --check đã đạt.

Đã kiểm tra giao diện bằng Edge headless với API giả và dữ liệu được ghi rõ là kiểm thử: desktop/điện thoại không tràn ngang; tiếp tục bản nháp đúng mã; tự lưu; công bố; khóa nhận xét đã gửi sau khi tải lại; màn hình nội dung buổi không có đánh giá từng học sinh. Bản in được kiểm tra khổ A4 và render trực quan; đã sửa ngắt trang làm tách nhãn khỏi số tiền.

Chạy lại:
- `npm test --prefix database/tests`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `node database/tests/browser/run-learning-ui.cjs` trên môi trường Windows có Edge và Playwright. Có thể đặt `CSAT_PLAYWRIGHT_MODULE` tới module Playwright đã cài. Bộ chạy tạo route kiểm thử tạm rồi dọn trong finally, không dùng dữ liệu thật.

Chưa xác minh luồng production bằng tài khoản thật sau migration/deploy; chưa gửi email thật. Cần kiểm tra một lớp và một hồ sơ phụ huynh sau khi triển khai trước khi mở rộng sử dụng.

## 6. Các file chính

- `database/upgrade-learning-portal.sql`: gói SQL chạy một lần.
- `database/migrations/20260910_11_...15_...`: nguồn migration của gói.
- `database/verification/20260910_learning_portal.sql`: đối chiếu chỉ đọc.
- `app/api/learning`, `app/api/admin/learning`: phân quyền và dữ liệu giáo dục.
- `components/learning`: giao diện lộ trình, hàng đợi tháng, admin và phụ huynh.
- `lib/review-email.ts`, `app/api/cron/monthly-reviews`, `vercel.json`: email nhắc tháng.
- `database/tests/learning-portal.test.cjs`: hồi quy dữ liệu và quyền truy cập.
