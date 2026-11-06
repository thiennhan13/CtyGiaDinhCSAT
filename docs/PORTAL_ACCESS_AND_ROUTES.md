# Quyền truy cập và địa chỉ Portal

| Danh tính do máy chủ xác minh | Đích khi mở sai cổng hoặc mở lại trang đăng nhập |
|---|---|
| Admin | `/admin/dashboard` |
| Gia sư có hồ sơ hoạt động gắn với tài khoản | `/tutor/dashboard` |
| Google phụ huynh | `/parents` hiển thị bước nhập số, thông báo khóa hoặc hồ sơ con theo liên kết hiện hành |
| Vai trò khác hoặc hồ sơ gia sư ngừng hoạt động | `/access-denied` có thao tác đăng xuất |
| Khách | `/login`, chọn sẵn nhân sự nếu đi từ cổng admin/gia sư |

Vai trò nhân sự lấy từ app metadata do máy chủ quản lý và được ưu tiên cả khi Gmail có danh tính Google. Proxy giữ cookie làm mới phiên trên chuyển hướng. API kiểm người dùng và vai trò trước khi đọc. RPC kiểm quyền hiện tại, học sinh, lớp hoặc phân công tương ứng. API riêng trả 401 cho khách và 403 khi sai quyền. Đăng xuất kiểm nguồn và kết thúc phiên trên thiết bị đang dùng.

Biểu mẫu đăng nhập giữ trạng thái đang chuyển cổng khi thành công. Khi thất bại, người dùng thấy lỗi và có thể thực hiện thử thách mới. Vùng tải có trạng thái đọc được bằng trình đọc màn hình và biểu tượng tĩnh khi giảm chuyển động.

## URL và dữ liệu công khai

Địa chỉ chuẩn dùng `/team`, `/achievements`, `/posts`, `/roadmap`, `/enroll`, `/free-resources`, `/self-study` và `/privacy-policy`. Bài viết và chuyên đề có slug tiếng Anh. Bản đồ lớp dùng `/parents/roadmap/<classId>`, chuyên đề dùng `/parents/topics/<slug>`. Địa chỉ tiếng Việt đã phát hành và bí danh `/parent` chuyển 308. Trình duyệt chuyển điểm neo cũ sau khi đến trang mới. Danh sách ánh xạ cho ba bài viết, 54 chuyên đề và các điểm neo nằm trong [route-aliases.json](../lib/route-aliases.json). Khóa Markdown và mã chương trình vẫn xác định nội dung và quyền đọc.

Danh mục cuối trang Đội ngũ dùng [bộ dữ liệu biên tập](../lib/public-team.json) của 10 gia sư đã đối chiếu. Khi gia sư ngừng hoạt động, cập nhật danh mục và phát hành lại website. Để thêm hồ sơ, admin đối chiếu tài khoản, trạng thái hoạt động, thông tin nghề nghiệp và ảnh trước khi đưa vào bộ công khai. Dùng ảnh đã bỏ metadata. Tệp gốc, ID nội bộ và liên hệ cá nhân thuộc kho riêng.

**Supabase production ngày 06/11/2026.** Đã sao lưu, đọc kiểm tra archive, diễn tập rollback rồi áp 33 và 34. Registry và kiểm tra sau áp đạt. Khi triển khai ứng dụng trên project này, tiếp tục từ bước kiểm thử vai trò.

## Thứ tự nghiệm thu và phát hành

1. Trên project thử, kiểm registry và sao lưu. Áp migration [33](../database/migrations/20261105_33_portal_roles.sql) sau 32 và [34](../database/migrations/20261105_34_registration_routes.sql) sau 24. Migration 33 siết quyền trên danh tính hiện hành. Migration 34 cho phép đơn đăng ký ghi từ URL mới và cũ.
2. Dựng bản Node 24 tương ứng. Kiểm ba tài khoản trên cả ba cổng, URL con, API và RPC. Thử Google trùng nhân sự, gia sư bị ngừng giữa phiên, thu hồi liên kết, đổi ID học sinh/lớp, tải lại, nút Back, mở lại trình duyệt và đăng xuất. Kiểm dữ liệu phản hồi cùng địa chỉ cuối.
3. Với Cloudflare thật, thử thành công, sai mật khẩu, token hết hạn, đổi vai trò và gửi lặp. Kiểm đọc chuyên đề, ảnh công khai và chuyển hướng một bước. Thử gửi đơn từ trang đăng ký mới.
4. Chỉ sau nghiệm thu, áp cùng migration theo thứ tự, triển khai và xác minh đúng phiên bản Vercel cùng registry production. Kiểm URL mẫu, gửi lại sitemap trong Search Console và theo dõi canonical mới. Kết quả kiểm thử local dùng dữ liệu tổng hợp. Ghi bằng chứng môi trường thật tại [PROJECT_STATUS](PROJECT_STATUS.md).
