# Kiểm tra sau nâng cấp — 09/09/2026 (bản đã lược)

Đây là hồ sơ lịch sử, không phải trạng thái live. Xem [PROJECT_STATUS](../docs/PROJECT_STATUS.md) trước thao tác.

Lần kiểm tra chỉ đọc ngày 09/09 xác nhận migration 05–10, đối chiếu định nghĩa hàm, RLS/quyền ghi và chứng từ gốc. Các truy vấn đọc theo quyền admin trong PostgreSQL đã chạy; một phần Data API được kiểm tra cấu trúc, chưa đủ để xác nhận E2E bằng phiên UI thật ở thời điểm đó.

Các trường hợp lịch sử thiếu roster/đơn giá, giờ học hoặc liên kết chứng từ vẫn cần đối soát riêng; không được migration tự xóa/sửa. Số lượng, thời điểm chi tiết và kết quả đối soát được chuyển vào gói nội bộ. Không suy nguyên nhân từ số liệu còn lại khi chưa có chứng cứ.

Không chạy lại gói upgrade trên database đã có phiên bản. Không coi việc giữ dữ liệu cũ là bằng chứng dữ liệu cũ đã chính xác. [Quy trình database](README.md) · [Quy tắc nội bộ](../SECURITY.md).
