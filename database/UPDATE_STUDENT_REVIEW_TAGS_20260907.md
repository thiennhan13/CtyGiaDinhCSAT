# Tích hợp nhận xét học sinh dành cho gia sư

## Phạm vi đã thực hiện

Gia sư mở **Lớp giảng dạy → chọn lớp → Nhận xét** ở học sinh cần đánh giá. Trang mới thay hộp thoại nhận xét cũ, dùng thông tin học sinh và loại lớp từ database.

- Thư viện 64 thẻ đã duyệt: kiến thức, kỹ năng giải bài, điểm mạnh, tiến bộ, thói quen học tập. Tìm kiếm hỗ trợ tiếng Việt không dấu và từ khóa số học.
- Khung Cơ bản/Nâng cao gợi ý theo loại lớp; thay bộ lọc không đổi loại lớp hoặc tự kết luận năng lực học sinh.
- Kiến thức/kỹ năng có mức độ quan sát và minh chứng. Tiến bộ có lần trước để đối chiếu. Đề xuất trọng tâm cần bước rèn tiếp.
- Giữ ba trường nhận xét bằng lời. Có thể gửi chỉ bằng lời nếu chưa cần thẻ.
- Lưu nháp, tiếp tục nháp, xem trước và gửi lên cổng phụ huynh. Phụ huynh chỉ đọc nội dung đã gửi; admin đọc được cả nháp.
- Gia sư xem tối đa 30 nhận xét gần đây của mình cho học sinh trong lớp. Nội dung đã gửi được giữ nguyên; muốn bổ sung, tạo nhận xét mới. Chưa có giao diện chỉnh sửa hoặc thu hồi nhận xét đã gửi.

Danh mục dùng trong ứng dụng: `lib/review-tag-catalog.json`. Mã thẻ, nhãn và nhóm của phiên bản 1 được kiểm tra thêm trong SQL. Từ khóa tìm kiếm không thay đổi ý nghĩa thẻ.

## Áp dụng vào Supabase

**Chưa xác nhận đã áp dụng trên database từ xa.** Kiểm tra chỉ đọc ngày 07/09/2026 bằng cấu hình hiện có nhận HTTP 401. Kết quả này không cho biết migration đã có hay chưa. Không có dữ liệu thật nào được tạo hoặc sửa trong quá trình kiểm thử.

1. Xác nhận dự án đã áp dụng `20260906_03_parent_phone_lookup.sql` và các migration trước đó theo hướng dẫn tương ứng. Migration 04 dùng lại cơ chế phân quyền và tra cứu phụ huynh hiện tại.
2. Trong SQL Editor của **đúng dự án Supabase**, chạy toàn bộ `database/migrations/20260907_04_student_review_tags.sql` bằng tài khoản quản trị database. File có transaction; lỗi sẽ hủy toàn bộ thay đổi trong lần chạy đó.
3. Chạy `database/verification/student_review_tags_20260907.sql`. Các cột, RPC, trigger, quyền và bộ lọc chỉ công bố phải hiện đúng theo chú thích trong file.
4. Triển khai mã nguồn này lên Vercel sau khi migration thành công. Không chạy lại toàn bộ master schema trên database đang sử dụng để thay cho migration.
5. Đăng nhập bằng gia sư đang phụ trách lớp: mở Nhận xét, tạo nháp, tải lại và tiếp tục. Phụ huynh của học sinh chưa thấy bản nháp. Hoàn thiện minh chứng và gửi, rồi kiểm tra đúng phụ huynh đọc được nội dung mới.

Nếu API trả `REVIEW_SCHEMA_NOT_READY`, kiểm tra migration và bộ nhớ schema PostgREST. Migration đã có `NOTIFY pgrst, 'reload schema'`. Nếu Supabase trả lỗi xác thực, cần kiểm tra cấu hình khóa của dự án/Vercel; không dán khóa vào tài liệu hoặc tin nhắn.

## Dữ liệu và quyền truy cập

`student_reviews` thêm `review_context`, `review_tags`, `review_status`, `updated_at`. Nhận xét cũ giữ nguyên nội dung và mặc định là đã gửi; thời điểm cập nhật ban đầu lấy từ ngày tạo để giữ đúng thứ tự lịch sử. Không đổi điểm danh, học phí, lương hoặc lộ trình đào tạo; chưa nối API OJ.

API sử dụng phiên Supabase của gia sư. RPC và RLS cùng kiểm tra gia sư đang hoạt động, lớp đang phụ trách, học sinh chưa bị xóa và danh sách đang học. Client không được tự chỉ định gia sư hoặc nhãn thẻ. Nhận xét đã gửi không thể bị gia sư sửa/xóa bằng truy cập trực tiếp.

Mỗi bản nháp có UUID ổn định qua các lần thử lại. Lưu/gửi cùng nội dung được trả về bản ghi đã có. `updated_at` giữ nguyên độ chính xác khi gửi lại, giúp phát hiện bản nháp đã bị sửa ở phiên khác. Không tự ghi đè phiên mới hơn.

`get_parent_lookup` vẫn giữ kiểm tra phiên tra cứu và liên kết phụ huynh–học sinh; chỉ trả các nhận xét đã gửi. Thông tin thẻ là bản chụp nhãn/nhóm/phiên bản tại thời điểm ghi nhận.

## Kiểm chứng cục bộ

- 147 kiểm thử API/phân quyền/database đã đạt; hai bộ mới là `student-review-api.test.cjs` và `student-review-tags.test.cjs`.
- Migration được thử với database PostgreSQL cục bộ PGlite: khởi tạo từ master, nâng cấp dữ liệu cũ và chạy lại migration.
- TypeScript và build production Next.js đã đạt. ESLint đạt ngưỡng dự án, còn 18 cảnh báo hiện có.
- Kiểm thử Edge đã đạt ở các chiều rộng 375/768/1024/1440 px, gồm lưu lỗi, thử lại cùng UUID, tiếp tục nháp, gửi một lần khi bấm đúp và bảo vệ nội dung khi đổi trang qua menu. Bộ thử dùng thành phần React thật và dữ liệu mô phỏng tách biệt; đây không thay thế bước nghiệm thu bằng tài khoản thật sau khi cập nhật Supabase.

Lệnh kiểm tra: `node --test database/tests/*.test.cjs`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Bảo trì danh mục

Không đổi ý nghĩa mã thẻ đã lưu. Khi thay nhãn, nhóm hoặc tiêu chí cấu trúc, tạo phiên bản danh mục/migration tương ứng và giữ khả năng đọc phiên bản cũ. Thẻ nhận xét là quan sát trong một phạm vi cụ thể, không phải chứng nhận đã hoàn thành chủ đề hoặc bảo đảm kết quả kỳ thi.
