# Chuyển khung chương trình — biên bản đã lược thông tin nội bộ

Ngày thực hiện: **24/09/2026, giờ Việt Nam**. Người dùng cho phép áp dụng migration 20 và bổ sung số phụ huynh từ số học sinh hợp lệ khi thiếu.

## Kết quả được ghi nhận

- Cơ bản chuyển sang khung A+B (7 chặng, 24 chủ đề); Nâng cao C+D (6 chặng, 19 chủ đề), áp dụng các trạng thái lớp thuộc hai chương trình.
- Tách nháp/công bố, lưu snapshot trước/sau và lịch sử. Luyện thi tùy chỉnh không đổi; chỉ số chặng cũ không tự quy đổi.
- Thao tác liên hệ dùng `database/maintenance/20260923_student_phone_fallback.sql`: chỉ số di động hợp lệ, không ghi đè số đã có, từ chối trường hợp nhập nhằng; audit và kiểm tra liên kết. Đây là thao tác một lần, không phải quy tắc tự động cho tương lai.
- Bộ test tập trung 6/6 đạt; đã phục hồi backup ứng dụng vào PostgreSQL tách biệt và diễn tập trước khi ghi. Đối chiếu dữ liệu/quyền trước và sau, kiểm tra HTTP phụ huynh và quyền chéo được ghi nhận đạt.
- Không tạo deployment trong đợt này; ứng dụng `c4cf9f8` đã được báo phát hành trước thao tác database.

## Giới hạn và việc còn lại

Gia sư phải xác nhận chặng cần học theo khung mới. Không suy ra mức thành thạo hoặc hoàn thành từ danh mục được chọn.

Registry được ghi nhận có 05–17 và 20; **18, 19, 21, 22 chưa áp dụng tại mốc này**. Không bật email, không tích hợp CSATOJ. Cần đọc lại registry trước lần phát hành tiếp theo.

Bản đầy đủ, số lượng hồ sơ/lớp, định danh thao tác, checksum và đường dẫn backup nằm trong gói nội bộ do chủ hệ thống quản lý. Backup đợt này chỉ gồm schema/data ứng dụng, không phải đầy đủ Auth/Storage; không phục hồi đè làm mất dữ liệu mới.

[Trạng thái hiện hành](PROJECT_STATUS.md) · [Quy tắc lưu hành nội bộ](../SECURITY.md)
