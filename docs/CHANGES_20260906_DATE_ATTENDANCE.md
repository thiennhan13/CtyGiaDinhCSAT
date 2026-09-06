# Sửa ngày tháng kế toán và form điểm danh — 06/09/2026

Phạm vi được chủ hệ thống duyệt: DATE-01 và UI-02. **Không có migration mới; không cần chạy SQL.**

## Hành vi sau cập nhật

- Ngày mặc định của kỳ kế toán là ngày đầu/cuối tháng hiện tại tại Việt Nam. Ví dụ tháng 09/2026 là `2026-09-01` đến `2026-09-30`.
- Máy chủ tính tháng theo `Asia/Ho_Chi_Minh` rồi truyền cùng giá trị xuống giao diện, tránh lệch ngày hoặc hiển thị khác nhau khi trình duyệt ở múi giờ khác. Admin vẫn có thể sửa khoảng ngày.
- Form điểm danh giữ trạng thái và ghi chú đã lưu, kể cả học sinh hiện đã rời danh sách đang học. Danh sách hiện tại không ghi đè lịch sử buổi học.
- Học sinh chưa có bản ghi hiển thị **Chưa điểm danh**. Điều này cũng áp dụng cho buổi chưa từng lưu: không mặc định cả lớp Có mặt.
- Chỉ các dòng có Có mặt/Vắng mặt được gửi lên khi lưu. Bỏ trống học sinh mới không tự thêm điểm danh hoặc phát sinh học phí; bản ghi cũ không được gửi vẫn được RPC giữ nguyên.
- Nếu nhập ghi chú cho một dòng chưa chọn trạng thái, form yêu cầu chọn trạng thái trước khi lưu, tránh mất ghi chú hoặc tự suy ra Có mặt.
- Nếu tải thiếu dữ liệu, form không cho lưu lên lịch sử chưa tải được và cung cấp nút **Thử tải lại**. Phản hồi của buổi cũ không được ghi đè form sau khi đổi trang.
- Dựng payload, gửi mạng và hiển thị kết quả cùng nằm trong xử lý lỗi; cờ đang lưu được giải phóng khi kết thúc. Bấm lưu lặp không tạo hai yêu cầu đồng thời.
- Nút lưu được đổi từ “Chốt Điểm Danh (Lưu vĩnh viễn)” thành **Lưu điểm danh**, phù hợp quyền sửa trước khi chốt kỳ.

## Phạm vi database và nghiệp vụ

Không đổi bảng, RPC, RLS, công thức học phí/lương hoặc cách chốt/hủy chốt kỳ. API/RPC hiện có tiếp tục xác định và giữ snapshot đơn giá ở phía server/database. Gia sư sửa trước chốt; sau chốt database tiếp tục yêu cầu admin mở lại.

Lỗi hộp thoại của trang kế toán và quy trình mở lại kỳ có tiền đã thu chưa thuộc gói này. Đặc biệt, mở lại dialog hủy chốt không tự giải quyết lỗi xử lý các hóa đơn paid/unpaid.

“Chưa điểm danh” là trạng thái trong form; không bổ sung một enum hoặc dòng dữ liệu vào PostgreSQL. Danh sách theo ngày hiệu lực vào/nghỉ lớp chưa được xây dựng trong đợt này, nên gia sư vẫn cần xác nhận đúng học sinh khi bổ sung điểm danh cũ.

## Kiểm tra

Kết quả trước khi đẩy mã: **125 kiểm thử tự động đạt**, TypeScript và production build đạt; lint phần thay đổi không có lỗi/cảnh báo. Kiểm thử Edge với backend giả lập đạt 12 nhóm kiểm tra, bao gồm ngày Việt Nam khi máy chủ UTC và trình duyệt khác cả múi giờ/tháng; không có lỗi runtime hoặc hydration.

- Kiểm thử ngày: máy chạy ở UTC, Việt Nam, Los Angeles, Kiritimati; tháng 2 thường/nhuận, giao tháng và giao năm theo giờ Việt Nam.
- Kiểm thử form và hàm thực tế: dữ liệu cũ/mới, học sinh đã rời lớp, ghi chú chưa có trạng thái, lỗi mạng, lỗi trả về không phải JSON, kỳ đã chốt, gửi lặp, tải thiếu và phản hồi đến muộn.
- Kiểm thử PostgreSQL: cập nhật một phần giữ nguyên đơn giá, các bản ghi lịch sử không gửi và không tự thêm điểm danh cho học sinh mới.
- Kiểm tra TypeScript, lint phần thay đổi và production build dùng cấu hình giả; không thao tác trên dữ liệu Supabase thật.

Sau khi deploy, có thể mở trang kế toán để kiểm tra ngày mặc định, rồi mở một buổi có học sinh mới chưa được điểm danh để kiểm tra nhãn Chưa điểm danh. Việc thay đổi điểm danh thật vẫn là thao tác nghiệp vụ của gia sư/admin.
