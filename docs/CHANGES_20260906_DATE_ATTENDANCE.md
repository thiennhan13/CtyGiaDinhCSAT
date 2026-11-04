# Ngày kế toán và giao diện điểm danh

Quy tắc giao diện cần giữ khi sửa quản lý lớp/kế toán. Nghiệp vụ dữ liệu hiện hành ở [BILLING_LOGIC](BILLING_LOGIC.md) và [kiến trúc](ARCHITECTURE.md); tài liệu này không yêu cầu chạy SQL.

- Kỳ mặc định tính đầu/cuối tháng theo `Asia/Ho_Chi_Minh`; server và UI dùng cùng giá trị, không phụ thuộc múi giờ trình duyệt. Admin vẫn được chọn khoảng ngày theo luồng nghiệp vụ.
- Form giữ trạng thái/ghi chú đã lưu, kể cả học sinh đã nghỉ. Danh sách hiện tại không ghi đè lịch sử buổi.
- Chưa có bản ghi thì hiển thị **Chưa điểm danh**, không mặc định Có mặt. Đây là trạng thái UI, không tạo enum hoặc dòng database mới.
- Chỉ gửi dòng Có mặt/Vắng mặt; không tự ghi nhận học phí cho dòng bỏ trống. Nếu nhập ghi chú mà chưa chọn trạng thái, yêu cầu hoàn thiện trước lưu.
- Dữ liệu tải thiếu thì khóa lưu và có Thử tải lại; phản hồi buổi cũ không ghi đè form sau điều hướng.
- Khóa gửi lặp, xử lý lỗi mạng/phản hồi không hợp lệ và giải phóng trạng thái đang lưu. Nút mang tên **Lưu điểm danh**.
- Quyền, roster theo ngày hiệu lực và snapshot do API/RPC xác minh; không tin giá client. Buổi đã chốt dùng luồng đính chính/điều chỉnh có audit, không sửa trực tiếp hoặc tự mở lại kỳ.

Kiểm thử liên quan: giao tháng/năm/năm nhuận với máy chủ và trình duyệt khác múi giờ; dữ liệu cũ/mới, học sinh đã nghỉ, lỗi tải/gửi, phản hồi đến muộn, ghi một phần và kỳ đã chốt. Dùng fixture và quyền thật của route/RPC, không sửa điểm danh production để kiểm UI.
