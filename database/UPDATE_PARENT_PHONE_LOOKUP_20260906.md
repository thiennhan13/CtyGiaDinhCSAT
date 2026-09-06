# Cập nhật tra cứu phụ huynh bằng số điện thoại — 06/09/2026

Theo phương án đã duyệt: phụ huynh nhập **số điện thoại đầy đủ**, không mật khẩu, không OTP. Supabase vẫn lưu dữ liệu; phụ huynh không còn dùng Supabase Auth. Admin/gia sư tiếp tục đăng nhập như trước.

**Đây là tra cứu bằng một khóa đã biết, không xác minh danh tính:** bất kỳ ai biết số điện thoại đã được đăng ký đều có thể xem học sinh được liên kết. Quyền chỉ đọc, mã phiên và giới hạn lượt truy cập không loại bỏ hệ quả này.

## Trường hợp của database hiện tại

Anh đã chạy `20260905_02_parent_accounts.sql`. Vì vậy chỉ cần chạy tiếp **migration03** bên dưới. Không xóa bảng, không tạo lại tài khoản, không chạy lại migration02 hay toàn bộ master schema trên database đang sử dụng.

Mã nguồn không tự chạy migration. Các kiểm thử dùng database cục bộ và dữ liệu giả; database Supabase thật cần anh thao tác.

## Thứ tự thực hiện

1. Dùng một khoảng thời gian ngắn không chỉnh sửa danh sách phụ huynh. Chạy [SQL đối chiếu trước/sau](verification/20260906_parent_lookup_preflight.sql) trong Supabase SQL Editor và giữ lại hai dòng kết quả. SQL này chỉ xuất số lượng và dấu đối chiếu, không xuất số điện thoại.
2. Chạy **toàn bộ** [20260906_03_parent_phone_lookup.sql](migrations/20260906_03_parent_phone_lookup.sql) trong SQL Editor bằng quyền quản trị database. File có `BEGIN`/`COMMIT`, kiểm tra policy trước khi sửa và giữ nguyên dữ liệu trong giao dịch.
3. Chạy [SQL hậu kiểm](verification/20260906_parent_phone_lookup.sql). Kỳ vọng **12 dòng, tất cả `passed = true`**.
4. Chạy lại SQL đối chiếu bước 1. Hai `row_count` và hai `fingerprint` phải giống trước khi cập nhật nếu không có ai chỉnh sửa dữ liệu đồng thời. Nếu khác, giữ lại kết quả để kiểm tra trước khi thao tác tiếp.
5. Chạy lại [hậu kiểm quyền admin/gia sư](verification/20260905_permissions.sql). Kỳ vọng **9 dòng true**. Không dùng hậu kiểm phụ huynh ngày 05/09 nữa vì nó kiểm tra cơ chế mật khẩu đã bỏ.
6. Khi Vercel đã deploy phiên bản mới, kiểm tra tại `/login` và `/admin/parents` theo danh sách bên dưới.

Trong thời gian mã ứng dụng và database chưa cùng phiên bản, chức năng phụ huynh có thể tạm báo không tải được. Thực hiện bước SQL sát thời điểm triển khai. Những route quản lý phụ huynh mới sẽ báo cần migration03 khi schema chưa có; không tự quay về cách đọc cũ.

Nếu lỗi `unexpected policies`, migration sẽ dừng để tránh giữ sót quyền truy cập ngoài dự kiến. Chạy truy vấn chỉ đọc dưới đây và gửi kết quả policy để đối chiếu; không tự xóa policy hoặc bỏ preflight:

```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('parent_accounts', 'parent_student_links',
                    'parent_lookup_sessions', 'parent_lookup_limits')
ORDER BY tablename, policyname;
```

Nếu gặp `lock timeout`, giao dịch không được áp dụng; chờ hết thao tác đang giữ khóa rồi chạy lại toàn bộ migration03. Nếu SQL Editor còn trong giao dịch lỗi, chạy `ROLLBACK;` trước khi thử lại. Migration03 đã được kiểm thử chạy lại mà giữ nguyên dữ liệu.

## Dữ liệu cũ được xử lý thế nào?

| Thành phần | Sau khi nâng cấp |
|---|---|
| `parent_accounts.auth_uid` | Đổi tên thành `parent_id`, giữ đúng UUID cũ, bỏ phụ thuộc vào tài khoản Auth |
| `parent_accounts.legacy_auth_uid` | Lưu tham chiếu Auth trước đây để đối chiếu; hồ sơ mới không cần giá trị này |
| `parent_student_links.parent_auth_uid` | Đổi thành `parent_id`, giữ nguyên học sinh và thông tin thời điểm/người tạo liên kết |
| Tên, điện thoại, `active`, thời điểm cập nhật | Giữ nguyên |
| Tài khoản/mật khẩu Auth cũ | Giữ lại nhưng ứng dụng phụ huynh không dùng nữa; JWT cũ không mở được dữ liệu phụ huynh |
| Phiên phụ huynh cũ | Phải nhập lại số điện thoại; cookie số điện thoại cũ không được chấp nhận |
| Điểm danh, lớp, hóa đơn, bảng lương | Không thay đổi bảng dữ liệu hoặc quy tắc trong đợt này |

Không cần cấp lại những phụ huynh **đã có hồ sơ trong `parent_accounts` và liên kết trong `parent_student_links`**. Số đang bị khóa vẫn bị khóa. Số không có học sinh còn được quản lý sẽ thấy thông báo chưa liên kết.

Nếu trước đây chỉ lưu `students.parent_number`, chưa tạo hồ sơ/liên kết theo migration02, admin vẫn cần đăng ký số đó và chọn đúng học sinh tại `/admin/parents`. Hệ thống không tự suy ra quan hệ gia đình từ số liên hệ, không so khớp bằng đuôi số.

Không cần xóa Auth user cũ để tính năng mới hoạt động. Migration không xóa hay sửa mật khẩu bất kỳ tài khoản Auth nào. Nếu muốn dọn những Auth user phụ huynh cũ, cần một bước kiểm tra riêng để tránh xóa nhầm tài khoản đang phục vụ luồng khác. Sau migration03, xóa một Auth user cũ không còn xóa dây chuyền hồ sơ/liên kết phụ huynh.

## Cấu hình Supabase và Vercel

- **Không cần nhà cung cấp SMS, Phone Auth hay email alias cho luồng phụ huynh mới.** Không có lệnh gửi OTP, tạo Auth user hoặc đăng nhập Auth ở luồng này.
- Nếu Phone provider chỉ được bật để phục vụ phụ huynh, có thể tắt tại Authentication → Sign In / Providers → Phone sau khi chuyển đổi. Giữ nguyên các provider admin/gia sư đang dùng.
- Nếu đã bật Send SMS Hook `csat_block_sms_auth` theo phương án trước, có thể tắt hook đó nếu không có luồng khác sử dụng. Không cần xóa function; không xóa khi cấu hình hook vẫn tham chiếu đến nó. Migration03 không tự đổi cấu hình Auth Dashboard.
- Vercel tiếp tục cần `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và **`SUPABASE_SERVICE_ROLE_KEY` ở phía server**. Không thêm khóa môi trường mới; không đặt service key vào biến `NEXT_PUBLIC_*`.
- Các RPC đọc tra cứu chỉ cho phép `service_role`; anon/authenticated không được gọi trực tiếp. Đây là lý do website đọc qua server thay vì mở RLS bảng học sinh cho khách. Service role vượt RLS nên phải được giữ kín theo [tài liệu Supabase](https://supabase.com/docs/guides/database/postgres/roles).

## Luồng hoạt động và phạm vi ảnh hưởng

1. Admin đăng ký tên, số di động Việt Nam và danh sách học sinh. `0912…`, `+84912…`, `0084912…` được chuẩn hóa về cùng khóa `+84…`; trùng số bị từ chối.
2. Phụ huynh nhập số ở `/login`. API kiểm tra hồ sơ đang mở, tính lượt tra cứu trong database và tạo phiên 12 giờ. Không có mật khẩu được tạo/lưu/trả về.
3. Cookie `csat_parent_lookup` chứa mã ngẫu nhiên 256 bit, HttpOnly, Secure khi production, SameSite=Lax. Database chỉ lưu SHA-256 của mã. Số điện thoại và mã phiên không đưa vào URL hay JSON trả về khi mở tra cứu.
4. Mỗi lần tải dữ liệu, RPC kiểm tra phiên còn hạn, hồ sơ còn mở và học sinh vẫn được liên kết. Chỉ trả các trường đang dùng trên cổng: thông tin cơ bản học sinh, nhận xét, lớp, tên gia sư và tổng số buổi có mặt.
5. Admin khóa hồ sơ sẽ thu hồi các phiên qua RPC quản lý. Mở lại cần nhập số để tạo phiên mới. Gỡ liên kết học sinh có hiệu lực ở lần tải tiếp theo; không thể thu hồi nội dung người dùng đã nhìn thấy hoặc lưu trước đó.
6. Nút “Đóng tra cứu” xóa phiên ở database và cookie phụ huynh. Phiên Supabase admin/gia sư trong cùng trình duyệt được giữ nguyên. Trang đổi mật khẩu chuyển về `/parents`; API đổi/reset mật khẩu cũ không còn sửa Auth.

Giới hạn hiện tại là 10 lần tra cứu số hợp lệ/IP/phút, bao gồm số không tồn tại hoặc đang bị khóa. Bộ đếm dùng chung trong PostgreSQL, không mất khi Vercel cold start. IP được lưu dưới dạng HMAC; bảng phiên và bộ đếm không cho trình duyệt đọc trực tiếp. Dữ liệu hết hạn được dọn khi có lần tra cứu tiếp theo. Nếu nhiều phụ huynh dùng chung IP, họ dùng chung hạn mức này.

Giới hạn này giảm việc thử hàng loạt, không chống hoàn toàn người biết số hoặc dùng nhiều IP. IP lấy từ header do Vercel thiết lập; nếu sau này tự host sau proxy khác cần kiểm tra cấu hình header tin cậy. Xem [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-forwarded-for).

Lộ trình/tư vấn học, CSATOJ contest, điểm danh chi tiết từng buổi và học phí phụ huynh vẫn thuộc các hạng mục phát triển tiếp theo. Đợt này đổi cách truy cập và bảo toàn phạm vi dữ liệu hiện có; không tự bổ sung dữ liệu tài chính vào endpoint công khai theo số.

## Kiểm tra sau khi chạy SQL

- `/login`: chỉ có ô số điện thoại; nhập số đã liên kết để mở cổng, không SMS/OTP.
- Thử phụ huynh có hai học sinh: đổi được giữa các học sinh; sửa URL sang ID không được liên kết thì bị từ chối.
- Số chưa đăng ký/bị khóa không xem được. Khóa một hồ sơ đang mở cổng rồi tải lại trang để kiểm tra thu hồi.
- `/admin/parents`: đăng ký/sửa liên kết/khóa hồ sơ được; không còn cấp/reset mật khẩu.
- Đăng nhập admin, mở tra cứu phụ huynh trong cùng trình duyệt, đóng tra cứu, quay về admin: phiên admin còn hoạt động.
- Gia sư vẫn sửa điểm danh trước chốt; sau chốt phải admin mở kỳ. Kiểm thử hồi quy đã chạy với quy tắc này.

## Nếu cần quay lại

Không rollback Vercel về bản mật khẩu rồi chạy migration02 đè lên schema03. Hai cơ chế dùng tên cột và RPC khác nhau. Giữ dữ liệu hiện tại, ghi nhận lỗi cụ thể và thực hiện bản sửa tiến tiếp. Nếu quyết định quay về mật khẩu, cần chuẩn bị migration đảo riêng và xử lý các hồ sơ mới chưa có Auth user; chưa cung cấp một rollback tự động có thể gây mất liên kết.
