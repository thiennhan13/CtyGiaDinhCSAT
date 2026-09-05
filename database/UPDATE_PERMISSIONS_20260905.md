# Cập nhật phân quyền CSAT — 05/09/2026

**Chủ hệ thống tự chạy SQL trên Supabase. Agent không chạy migration trên database thật.** Đẩy code lên GitHub/Vercel không tự cập nhật database; các bảo vệ ở RPC/RLS chỉ có hiệu lực sau khi chạy file migration bên dưới.

## Phạm vi đã sửa

- `is_admin()` luôn trả true/false; chỉ chấp nhận service role hoặc `app_metadata.role = admin` của tài khoản đăng nhập. Bỏ quyền admin từ `user_metadata` và email cố định.
- RPC được thu hồi quyền gọi mặc định của `PUBLIC`/`anon`, kiểm tra quyền bên trong và cố định `search_path`. RPC đọc tên kỳ cũng yêu cầu admin.
- Gia sư ghi điểm danh qua RPC. Database kiểm tra quyền buổi học, học sinh thuộc lớp hoặc đã có điểm danh của buổi, dữ liệu lặp/không hợp lệ; bỏ qua đơn giá client gửi và giữ snapshot đã có.
- RLS giữ gia sư trong phạm vi lớp được gán, ràng buộc nhận xét với đúng học sinh–lớp–gia sư; tài khoản inactive/is_deleted không tiếp tục truy cập bằng JWT cũ.
- Khi gia sư thêm buổi, database lấy người dạy/phí từ lớp. Gia sư chỉ được cập nhật status của buổi đã tạo; không tự sửa ngày, định danh, đơn giá hay kỳ. Xóa chỉ được với buổi scheduled chưa có điểm danh và chưa chốt. Admin vẫn giữ quyền quản trị hiện có.
- Gia sư không sửa điểm danh, hủy hoặc xóa buổi có `billing_period`; không đặt giới hạn ngày đối với buổi chưa chốt, nên vẫn điểm danh/sửa cuối tháng được.
- Bỏ `TRUNCATE` và quyền ngoài DML cho vai trò trình duyệt trên 10 bảng CSAT. Quyền mặc định của các object tạo sau được siết; object mới cần GRANT rõ ràng. Không xóa policy của bảng ngoài CSAT.
- API gia hạn và đăng nhập bỏ fallback role tự khai báo; API dạy bù kiểm tra tài khoản đang hoạt động; API điểm danh kiểm tra quyền/danh sách và báo lỗi HTTP phù hợp. API vẫn gửi snapshot do server đọc để tương thích trong thời gian chưa chạy SQL; RPC mới tự tính lại từ DB.

Migration chỉ thay đổi function, policy, trigger và quyền; không sửa/xóa hàng dữ liệu nghiệp vụ, không tự gán lại admin, không đổi bảng/cột và không tính lại hóa đơn/lương.

## Trước khi chạy

1. Dùng đúng project Supabase của CSAT và tài khoản SQL `postgres`. Lưu bản sao schema/quyền hiện tại và backup dữ liệu theo cách quản trị đang dùng. File master không dùng cho database đã có dữ liệu.
2. Chạy truy vấn chỉ đọc này để xác nhận **tài khoản admin anh đang dùng** có role trong app metadata. Việc có chữ admin trong user metadata là chưa đủ:

```sql
SELECT id, email, raw_app_meta_data ->> 'role' AS server_role
FROM auth.users
WHERE raw_app_meta_data ->> 'role' = 'admin';
```

Nếu chưa có tài khoản admin đúng, dừng tại đây để xác nhận UUID của tài khoản quản trị. Migration sẽ dừng khi không có admin; không tự suy ra admin từ email. Không cấp admin cho tài khoản gia sư chỉ để vượt bước kiểm tra.

3. Migration kiểm tra cột cần thiết, chữ ký RPC và các policy ngoài danh sách đã biết. Nếu production đã có tùy chỉnh, giữ nguyên thông báo `CSAT preflight` để đối chiếu; không bỏ đoạn kiểm tra rồi chạy tiếp. Kiểm tra này phát hiện một số khác biệt cấu trúc, không thay thế việc xem toàn bộ schema production.

## Nếu lần chạy trước báo Admin_Full_Access_Reviews

Bản migration đã bổ sung tương thích chính xác với `student_reviews.Admin_Full_Access_Reviews`, theo tên policy mà chủ hệ thống báo từ production. Chưa đọc được điều kiện của policy thật; migration không giữ lại hoặc tin cậy điều kiện đó. Nó thay policy cũ bằng `Admin_Full_Student_Reviews` và các policy gia sư đã được kiểm thử. Tên tương tự trên bảng khác và các policy lạ khác vẫn bị chặn.

Lỗi preflight xảy ra trước các thay đổi quyền, nên lần chạy thất bại này chưa áp dụng bản sửa. Trong SQL Editor, thay toàn bộ query cũ bằng nội dung file migration mới rồi chạy lại; không xóa riêng policy trên production. Nếu phiên còn báo transaction aborted, chạy `ROLLBACK;` trước.

## Chạy cập nhật

Mở **Supabase → SQL Editor → New query**, sao chép **toàn bộ** [20260905_01_harden_permissions.sql](migrations/20260905_01_harden_permissions.sql), rồi Run một lần.

File đã có `BEGIN`/`COMMIT`, lock timeout 5 giây và statement timeout 60 giây. Các thay đổi được áp dụng cùng một giao dịch; nếu lỗi, không áp dụng riêng một nửa file. Chạy lại cùng file sau khi thành công là an toàn và đã được kiểm thử. Nếu phiên SQL còn báo transaction aborted sau một lần lỗi, chạy `ROLLBACK;` trước khi thử lại sau khi đã xử lý nguyên nhân.

**Không chạy lại `CSAT_master_schema.sql` trên dữ liệu hiện có.** Không cần chạy các đoạn backfill hay bootstrap tài khoản trong master cho đợt cập nhật này.

## Xác minh sau khi chạy

1. Chạy toàn bộ [20260905_permissions.sql](verification/20260905_permissions.sql). Cả 9 dòng phải có `passed = true`.
2. Đăng xuất rồi đăng nhập lại admin/gia sư để refresh JWT, nhất là nếu app metadata vừa được quản trị cập nhật.
3. Kiểm tra trên lớp thử: admin mở trang quản trị; gia sư xem lớp của mình, thêm buổi scheduled, ghi/sửa điểm danh buổi chưa chốt và gửi nhận xét đúng học sinh. Gia sư khác không được can thiệp. Với buổi đã chốt, gia sư phải nhận thông báo cần admin mở lại.
4. Đối chiếu số lượng học sinh/lớp/buổi/hóa đơn trước và sau migration. Không thử xóa hay sửa dữ liệu thật chỉ để kiểm tra quyền.

Các truy vấn xác minh kiểm tra cấu hình đã cài; không chứng minh tất cả hành vi trên production. Bộ kiểm thử trong repo chạy dữ liệu giả trên PostgreSQL PGlite, mô phỏng vai trò và helper Supabase Auth, thay extension UUID bằng hàm tương đương. Không sử dụng URL hoặc key production.

Để chạy lại kiểm thử từ repository:

```sh
npm ci
npm ci --prefix database/tests
npm test --prefix database/tests
```

Dependency kiểm thử nằm riêng trong `database/tests`; không thêm công cụ PostgreSQL vào dependency triển khai của ứng dụng.

## Kết quả kiểm tra trước bàn giao

- Bộ kiểm thử Node báo 45 kiểm tra đạt: các kịch bản quyền được chạy với cả schema cũ + migration và master mới, cùng kiểm thử API/preflight.
- Chạy migration hai lần không làm đổi dữ liệu mẫu của 10 bảng; policy bảng ngoài CSAT được giữ nguyên.
- File hậu kiểm trả đủ 9 dòng true trong hai môi trường thử và khi cập nhật từ database có policy legacy trên.
- Ca policy legacy cố ý cấp quyền quá rộng trong dữ liệu giả: sau migration, policy cũ biến mất; gia sư chỉ nhận xét đúng lớp/học sinh, admin vẫn truy cập hợp lệ. Cùng tên policy trên bảng khác vẫn bị preflight từ chối.
- TypeScript và production build đạt; ESLint không có lỗi, còn 19 cảnh báo đã có. Build dùng URL/key Supabase giả.
- Chưa kiểm thử đăng nhập trên website production, chưa đọc/xác nhận schema production và chưa chạy migration thật.

## Nếu có lỗi sau cập nhật

Ghi lại tên thao tác, thông báo lỗi và kết quả 9 kiểm tra, không gửi access token hoặc service key. Nếu lỗi preflight/DDL trước COMMIT, giao dịch không áp dụng và cần đối chiếu schema. Nếu đã COMMIT rồi mới có lỗi chức năng, giữ bản backup schema/quyền để so sánh và sửa đúng policy/RPC; không bật lại quyền PUBLIC, không tắt RLS hàng loạt để khôi phục truy cập. Revert code trên GitHub cũng không tự hoàn tác SQL.

Không kèm lệnh rollback bật lại lỗ hổng đã sửa. Phương án phục hồi cần dựa trên schema trước cập nhật của chính project, vì hiện chưa đọc được cấu hình production.

## Giới hạn đợt này

- Chưa thay cơ chế đăng nhập phụ huynh bằng số điện thoại/cookie; lỗi xác thực phụ huynh trong báo cáo vẫn cần xử lý riêng.
- Chưa làm kỳ có trạng thái/phiên bản, chốt nguyên tử hay giải quyết mở lại kỳ có hóa đơn đã thu. **Không tự gỡ `billing_period` trên production để lách quy trình hiện tại.** Ca kiểm thử gỡ cờ bằng admin chỉ xác minh cơ chế khóa trên dữ liệu giả.
- Việc admin sửa dữ liệu đã chốt vẫn theo quyền hiện tại; quy trình buộc admin mở lại có lịch sử chưa được triển khai. Chưa giải quyết buổi thêm muộn vào khoảng ngày đã chốt.
- Quyền đọc lịch sử sau đổi gia sư, danh sách/đơn giá theo ngày hiệu lực và công thức lương 0 đồng vẫn thuộc đợt nghiệp vụ tiếp theo.
- Những function/policy tùy chỉnh ngoài schema đã kiểm toán chưa được chứng nhận. Migration không phải bản kiểm toán toàn bộ hạ tầng Supabase.

Tham chiếu kỹ thuật: [Supabase về quyền function và search_path](https://supabase.com/docs/guides/database/functions), [Supabase về RLS và metadata](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL về TRUNCATE ngoài phạm vi RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).
