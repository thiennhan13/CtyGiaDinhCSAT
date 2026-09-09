# Kiểm tra Supabase sau nâng cấp — 09/09/2026

Kiểm tra trực tiếp lúc 23:47–23:50 (giờ Việt Nam), qua kết nối PostgreSQL TLS có xác minh chứng chỉ. Mọi truy vấn kiểm tra nằm trong giao dịch READ ONLY; không chạy thêm migration hoặc sửa dữ liệu nghiệp vụ.

## Kết quả

- Đủ 6 migration 05–10, áp dụng lúc 17:19 ngày 09/09/2026.
- 34 hàm được đối chiếu với schema cục bộ đã kiểm thử: không khác biệt.
- 146 chứng từ cũ khớp toàn bộ nội dung bản lưu khi nâng cấp (không so cột paid_at). Chưa có kỳ ledger mới, khoản điều chỉnh hoặc sự kiện thu/hoàn tiền mới.
- Quyền ghi trực tiếp các bảng nghiệp vụ chính bị thu hồi đúng thiết kế; không có bảng public thiếu RLS trong kiểm tra. Lượt tham gia chỉ có một trigger audit.
- Đọc theo quyền admin trong PostgreSQL thành công: lớp, học sinh, điểm danh hiệu lực, công nợ, dashboard, lịch sử lớp và danh sách điểm danh theo buổi.
- Data API nhận đúng quan hệ của class_current_state và class_students_current khi kiểm tra truy vấn không lấy dòng dữ liệu. attendance_current từ chối service key theo quyền đã thiết kế; truy vấn dưới quyền admin ở PostgreSQL thành công. Chưa kiểm chứng truy vấn này qua HTTP bằng phiên đăng nhập admin.

Có 29 lớp, 88 liên kết học sinh–lớp, 589 buổi, 947 dòng điểm danh, 146 chứng từ. So với lần ghi nhận 943 dòng điểm danh, nhật ký sau nâng cấp có 4 INSERT điểm danh và 1 UPDATE buổi học lúc 22:08 ngày 09/09/2026. Điều này giải thích chênh lệch số dòng; không thay thế việc so checksum toàn bộ dữ liệu trước/sau vì không có bản checksum trước nâng cấp trong lần kiểm tra này.

## Cần xử lý nghiệp vụ riêng

11 buổi hoàn thành chưa chốt: 10 buổi cần xác minh toàn bộ danh sách học sinh lịch sử; 1 buổi có giờ không hợp lệ. Các nhóm có thể giao nhau. Không tự điền trạng thái hoặc sửa giờ khi chưa có căn cứ.

Các dấu hiệu lịch sử vẫn còn: 10 nhóm lịch trùng, 19 buổi có giờ không hợp lệ, 101 lịch dự kiến trong lớp không hoạt động/lưu trữ, 71 buổi ngoài thời hạn lớp và 5 chứng từ thiếu liên kết. Đây là các trường hợp được giữ lại để đối soát, không phải migration tự làm sạch dữ liệu.

## Triển khai app

Người dùng đã cho phép commit và push main; cần dùng phiên bản app tương thích schema mới. Kiểm tra trạng thái CI/Vercel sau push và kiểm tra giao diện bằng phiên đăng nhập thực. Công cụ trình duyệt của phiên làm việc gặp lỗi khởi động, nên chưa xác nhận E2E trên giao diện đang chạy.

Log chi tiết và fingerprint được giữ trong thư mục scratch bị loại khỏi Git; báo cáo này không chứa dữ liệu cá nhân hay khóa kết nối.
