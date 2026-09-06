> **Phương án cũ đã được thay thế ngày 06/09/2026.** Không tiếp tục hướng dẫn mật khẩu/Phone Auth bên dưới cho phiên bản hiện tại. Nếu đã chạy migration02, chuyển sang [hướng dẫn nâng cấp tra cứu bằng số điện thoại](UPDATE_PARENT_PHONE_LOOKUP_20260906.md); hồ sơ và liên kết cũ được giữ lại. Nội dung bên dưới chỉ lưu để đối chiếu lịch sử.

# Cập nhật tài khoản phụ huynh — migration 20260905_02

Phương án đã được duyệt: **Supabase Auth, số di động + mật khẩu admin cấp**, chỉ xem học sinh được admin liên kết. Chủ hệ thống đã xác nhận hậu kiểm migration phân quyền `20260905_01` trả về true. Đợt tài khoản phụ huynh này có **migration mới cần tự chạy**; deploy Vercel không tự cập nhật database.

## 1. Chạy SQL trên Supabase

Mở **SQL Editor → New query**, chạy toàn bộ [20260905_02_parent_accounts.sql](migrations/20260905_02_parent_accounts.sql) bằng role `postgres`.

- Tạo hai bảng `parent_accounts`, `parent_student_links`, policy RLS và hai RPC có kiểm tra quyền.
- Không tự tạo tài khoản Auth, không tự suy đoán quan hệ phụ huynh–học sinh từ số điện thoại.
- Không sửa học phí, điểm danh, hóa đơn hoặc kỳ lương. Các quy tắc sửa điểm danh trước chốt kỳ của đợt trước vẫn giữ nguyên.
- Script dùng transaction; lỗi làm rollback toàn đợt. Có thể chạy lại mà không xóa tài khoản/liên kết hiện có.
- **Không chạy lại `CSAT_master_schema.sql` trên database hiện tại.** Master chỉ dành cho database trống.

Nếu báo policy lạ, giữ nguyên thông báo và lấy định nghĩa bằng truy vấn chỉ đọc sau, rồi gửi kết quả để đối chiếu; không bỏ preflight hoặc tự xóa policy:

```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('parent_accounts', 'parent_student_links')
ORDER BY tablename, policyname;
```

Nếu phiên SQL còn báo transaction aborted, chạy `ROLLBACK;` rồi dùng query mới.

## 2. Hậu kiểm

Chạy toàn bộ [20260905_parent_accounts.sql](verification/20260905_parent_accounts.sql). Kết quả phải có **10 dòng, tất cả `passed = true`**. Các kiểm tra gồm RLS, quyền gọi RPC, tập policy, liên kết và số đăng nhập khớp Auth. Đây là kiểm tra cấu hình SQL, chưa thay thế việc đăng nhập thử ở bước 4.

## 3. Bật phương thức đăng nhập trên Supabase

Trong **Authentication → Sign In / Providers → Phone**, bật **Phone authentication** và lưu. Tên nhóm menu có thể khác theo phiên bản Dashboard. Supabase hỗ trợ đăng nhập số điện thoại kèm mật khẩu. [Tài liệu chính thức](https://supabase.com/docs/guides/auth/passwords#with-phone).

Ứng dụng cấp tài khoản qua Auth Admin API với `phone_confirm: true`; không gọi đăng ký công khai hay gửi OTP. Admin phải xác minh đúng phụ huynh và số liên hệ trước khi cấp tài khoản. Không cần bổ sung luồng SMS cho thao tác đăng nhập bằng mật khẩu đã xác nhận này. Nếu Dashboard yêu cầu cấu hình khác khi bật Phone, gửi lại thông báo thực tế để xử lý, không nhập thông tin nhà cung cấp giả. [Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

Các biến Vercel vẫn dùng bộ hiện có: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Service role chỉ được dùng ở API admin trên server; trang phụ huynh đọc bằng phiên của chính phụ huynh.

## 4. Cấp tài khoản và kiểm tra thực tế

1. Đăng nhập admin, vào **Học sinh → Tài khoản phụ huynh** (`/admin/parents`).
2. Chọn **Cấp tài khoản**; nhập tên, số di động và chọn một hoặc nhiều học sinh. Kiểm tra cả tên, ngày sinh và số liên hệ để tránh liên kết nhầm. Mỗi tài khoản hỗ trợ tối đa 50 học sinh.
3. Hệ thống chấp nhận dạng `0912 345 678`, `+84 912345678`, `0084912345678`, lưu thống nhất thành `+84912345678`. Không dùng so khớp đuôi số. Mật khẩu ngẫu nhiên chỉ xuất hiện trong phản hồi cho admin và màn hình vừa cấp; không lưu mật khẩu rõ vào bảng ứng dụng.
4. Admin tự chuyển thông tin đăng nhập cho đúng phụ huynh. Nếu đóng màn hình mà chưa giữ mật khẩu, dùng **Đặt lại mật khẩu**. Hệ thống không tự gửi tin nhắn.
5. Dùng cửa sổ riêng/ẩn danh để đăng nhập tại `/login`. Kiểm tra đúng học sinh, đổi học sinh nếu có nhiều con, xem nhận xét/lớp hiện có, rồi **Đổi mật khẩu**.
6. Mật khẩu mới cần ít nhất 12 ký tự và đáp ứng chính sách mật khẩu hiện tại của Supabase. Luồng đổi mật khẩu xác thực lại mật khẩu cũ và kiểm tra đúng UID trước khi cập nhật, bảo đảm phiên còn mới. Không cần thay cấu hình mật khẩu chung của gia sư chỉ để dùng tính năng này. [Cấu hình mật khẩu Supabase](https://supabase.com/docs/guides/auth/password-security).
7. Kiểm tra gỡ một liên kết hoặc bỏ **Cho phép truy cập** bằng tài khoản thử: lần đọc dữ liệu tiếp theo phải bị từ chối. Khôi phục cấu hình tài khoản thử sau kiểm tra. Không thử sửa quyền của phụ huynh thật đang sử dụng nếu chưa có kế hoạch phối hợp.

Cookie cũ `parent_session` không còn giá trị xác thực. Phụ huynh cũ cần tài khoản được admin cấp và phải đăng nhập lại. Trước khi hoàn tất SQL/cấu hình Auth/cấp tài khoản, cổng phụ huynh sẽ chưa dùng được.

## 5. Quyền và xử lý sự cố

- `parent_accounts.active = false` khóa quyền đọc ngay ở RPC, kể cả khi JWT cũ chưa hết hạn. Gỡ liên kết cũng có hiệu lực ở lần đọc tiếp theo. Dữ liệu đã tải và đang hiển thị trên thiết bị không thể thu hồi từ xa.
- **Đặt lại mật khẩu không thay cho khóa truy cập tức thời**: nếu cần thu hồi quyền ngay, tắt **Cho phép truy cập** trước. Access token Supabase đã cấp có thể còn hiệu lực tới khi hết hạn.
- Phụ huynh không được đọc trực tiếp các bảng học sinh/gia sư/hóa đơn. RPC chỉ trả các trường đang được giao diện sử dụng; ghi chú nội bộ, email và UID đăng nhập gia sư không nằm trong kết quả.
- Nếu số điện thoại đã có trong Supabase Auth, hệ thống báo lỗi và không tự nhận lại tài khoản hoặc đổi role. Admin kiểm tra người sở hữu trước khi quyết định cách xử lý. Việc đổi số đăng nhập chưa nằm trong giao diện này.
- Hồ sơ phụ huynh và tập liên kết được lưu cùng một transaction. Supabase Auth là dịch vụ riêng: nếu lưu hồ sơ thất bại, API thử thu hồi đúng tài khoản Auth vừa tạo. Nếu thu hồi cũng thất bại, thông báo trả UID để admin kiểm tra, khóa/thu hồi; không coi trạng thái đó là đã hoàn tất.
- Admin vẫn khóa được tài khoản có liên kết tới học sinh đã xóa mềm. Khi bật lại tài khoản, cần bỏ những học sinh đã xóa khỏi danh sách.
- Giới hạn gọi API đăng nhập/đổi mật khẩu hiện dùng bộ nhớ từng instance Vercel, nên không phải giới hạn phân tán toàn hệ thống. Supabase có giới hạn Auth riêng; cần quan sát 429 nếu nhiều yêu cầu qua cùng máy chủ. Chưa thêm CAPTCHA hay dịch vụ rate limit mới trong đợt này. [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## 6. Kiểm chứng và phạm vi

- 88 kiểm thử SQL/API đã đạt trong môi trường cô lập, gồm schema nâng cấp và schema cài mới; kiểm tra tách gia đình, nhiều học sinh, giả mạo metadata, khóa/gỡ liên kết, dữ liệu nội bộ, lỗi tạo tài khoản và đổi mật khẩu.
- Kiểm thử trình duyệt trên localhost với backend giả lập đã đi qua đăng nhập, đổi học sinh, đổi mật khẩu, đăng xuất, từ chối cookie cũ, admin tạo/liên kết/khóa/reset. Không có lỗi JavaScript; bố cục quản trị ở chiều rộng 390 px không tràn ngang.
- TypeScript, lint và production build đã chạy. Lint còn 19 cảnh báo có sẵn trong dự án.
- Agent **không chạy SQL, không tạo tài khoản, không xác minh đăng nhập trên Supabase production**. Hậu kiểm thực tế của migration này còn chờ chủ hệ thống.
- Chưa triển khai dữ liệu contest CSATOJ, lộ trình học, học phí chi tiết cho phụ huynh hoặc thiết kế lại chốt/mở kỳ lương. Các hướng này cần duyệt riêng theo yêu cầu ban đầu.
