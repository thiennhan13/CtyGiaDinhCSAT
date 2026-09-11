# Loại lớp và chương trình mặc định

Migration `20260911_17_class_program_defaults.sql` đã áp dụng trên Supabase ngày 11/09/2026. Không chạy lại trên database này.

| Loại lớp | Mã chương trình | Cách áp dụng |
| --- | --- | --- |
| Lớp Cơ bản | basic | Khung Cơ bản 30 buổi, phiên bản mặc định đã duyệt |
| Lớp Nâng cao | advanced | Khung Nâng cao 35 buổi, phiên bản mặc định đã duyệt |
| Lớp HSGQG | voi | Giữ mã VOI cũ để tương thích; chưa bổ sung giáo án khi chưa được duyệt |
| Lớp Luyện thi | custom | Nội dung tùy chỉnh theo mục tiêu của lớp; không mặc định gán VOI |

## Kết quả trên dữ liệu hiện có

- 12/12 lớp Cơ bản và 13/13 lớp Nâng cao có khung được công bố.
- Tạo thêm 24 bản ghi khung lớp, gồm cả lớp đã ngừng hoạt động/lưu trữ theo yêu cầu áp dụng cho tất cả lớp.
- Giữ nguyên toàn bộ bản nháp, bản công bố, chặng đang học và lịch sử của lớp đã có lộ trình.
- 4 lớp Luyện thi giữ nguyên dữ liệu; chưa công bố giáo án tùy chỉnh chưa được xác nhận.
- Không thay đổi dữ liệu của 33 bảng còn lại, gồm lớp, học sinh, học phí, điểm danh, chốt sổ và tài khoản phụ huynh. Quyền gọi các RPC hiện hữu giữ nguyên.

Các khung bổ sung là chương trình tham chiếu, không phải xác nhận học sinh đã học xong hay đạt năng lực. Chặng hiện tại và hình thức học để trống do chưa có dữ liệu xác nhận. Gia sư chọn hình thức thực tế khi công bố các điều chỉnh tiếp theo.

## Lớp mới và tùy chỉnh

Luồng tạo lớp qua `create_class_with_learning` suy ra chương trình từ loại lớp và từ chối chương trình không khớp. Cơ bản/Nâng cao tự nhận và công bố phiên bản mặc định hiện tại; mục tiêu riêng và chặng hiện tại để trống. HSGQG/Luyện thi khởi tạo bản nháp, chờ nội dung được xác nhận.

Gửi lại cùng yêu cầu tạo lớp giữ nguyên lộ trình đã tạo và mọi chỉnh sửa sau đó. Thay đổi phiên bản mặc định không tự đổi giáo án của lớp đã có lộ trình.

Luyện thi hỗ trợ công bố mục tiêu và nội dung riêng khi chưa có template; không tạo giáo án giả. HSGQG giữ hành vi tương tự trong thời gian chờ giáo án được duyệt.

## Kiểm tra

- 5 kiểm thử mới và 13 kiểm thử hồi quy đều đạt.
- TypeScript đạt; lint không có lỗi, còn một cảnh báo eslint-disable đã có ở màn hình tạo lớp.
- Chạy thử giao dịch hoàn tác rồi áp dụng cùng nội dung migration; đối chiếu dữ liệu trước/sau và quyền RPC.
- Đã kiểm tra đăng nhập trên portal.csatoj.vn: chương trình hiển thị, không truy cập được học sinh của phụ huynh khác; đăng xuất phiên kiểm thử.
- Truy vấn kiểm tra chỉ đọc: `database/verification/20260911_class_program_defaults.sql`.
- Bản đối chiếu và báo cáo chi tiết nằm trong thư mục riêng tư `scratch/class-program-defaults-20260911/`, không đưa vào Git.

Migration chỉ bổ sung khung cho lớp chưa có bản ghi lộ trình. Với database khác có bản nháp hoặc chương trình riêng, cần xem kết quả kiểm tra; không công bố bản nháp hoặc ghi đè giáo án riêng tự động.
