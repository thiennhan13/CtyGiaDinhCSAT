# Chuẩn hóa số điện thoại phụ huynh — 11/09/2026

Đã áp dụng migration `20260911_16` trên Supabase ngày 11/09/2026. Không chạy lại file migration này trên database hiện tại.

- `parent_accounts.phone`: 49/49 hồ sơ lưu dạng `0xxxxxxxxx`, giữ nguyên mã hồ sơ và liên kết.
- `students.parent_number`: chuẩn hóa mọi số di động đầy đủ, xác định được chính xác. Đã bỏ khoảng trắng thừa ở một dòng. Các giá trị thiếu hoặc không phải số đầy đủ được giữ lại để đối chiếu; không tự thêm chữ số vào số thiếu.
- Đầu vào `+84`, `0084` và số có khoảng trắng/dấu phân cách hợp lệ đều được chuyển về đầu `0`. Phiên tra cứu cũ vẫn dùng được.
- Trigger chuẩn hóa khi tạo/cập nhật hồ sơ trực tiếp; RPC mở tra cứu, quản lý hồ sơ và nhập hàng loạt dùng cùng quy tắc.
- Constraint và unique index bảo đảm tài khoản phụ huynh chỉ lưu số chuẩn, không tạo hai hồ sơ cho hai cách viết của cùng số.
- Không đổi các cột liên kết mạng xã hội, nội dung tự do hoặc lịch sử học phí. Supabase Auth hiện không có số điện thoại để chuyển đổi.

Đã chạy 18 kiểm thử API/database đạt; chạy thử migration trên Supabase bằng transaction rollback trước khi ghi chính thức. Đối chiếu xác nhận giữ nguyên các bảng liên kết, phiên tra cứu, điểm danh, nhận xét và dữ liệu kế toán. Kiểm tra sau chuyển đổi: 49 hồ sơ tải được dữ liệu portal, ba yêu cầu xem học sinh ngoài liên kết bị từ chối.

Mã nguồn chuẩn hóa và tìm kiếm admin đã được cập nhật cùng migration; phiên bản website cũ vẫn tra cứu được do RPC tiếp tục nhận đầu vào quốc tế. Cần triển khai mã nguồn mới để cập nhật cách tìm kiếm số điện thoại trong màn hình quản lý phụ huynh.

Kiểm tra chỉ đọc: `database/verification/20260911_parent_domestic_phones.sql`.

Đã kiểm tra trên https://portal.csatoj.vn/login: cả số đầu 0 và +84 đều trả đăng nhập thành công, trang phụ huynh hiển thị đúng học sinh, yêu cầu học sinh ngoài liên kết bị chặn. Đã đăng xuất các phiên kiểm thử. TypeScript và lint các file mã nguồn đã sửa đều đạt.
