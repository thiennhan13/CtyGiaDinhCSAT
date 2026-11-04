# Phân quyền — tham chiếu migration 01

Migration 01 là nền phân quyền lịch sử. Quyền thực tế còn được các migration sau mở rộng; không chạy lại 01 hoặc dùng verification cũ để kết luận toàn bộ schema hiện hành.

## Bất biến cần giữ

- Admin lấy từ `app_metadata.role`, không từ user_metadata hoặc email cố định.
- RPC kiểm quyền bên trong, cố định search_path và giới hạn EXECUTE; client không được cấp service role.
- Gia sư chỉ thao tác trong phạm vi hồ sơ hoạt động, phân công/lịch sử được RPC cho phép. UUID/menu ẩn không chứng minh quyền.
- Điểm danh và đơn giá do database xác minh; buổi đã chốt không sửa trực tiếp.
- Lưu trữ/vô hiệu hóa giữ lịch sử, không xóa dây chuyền học phí hoặc dữ liệu học tập.

## Nguồn hiện hành

[Kiến trúc và quyền](../docs/ARCHITECTURE.md) · [SECURITY](../SECURITY.md) · [Database README](README.md) · [Tiến độ](../docs/PROJECT_STATUS.md).

Kiểm quyền route/API/RPC/RLS bằng fixture cho các vai trò, tài khoản bị khóa và dữ liệu ngoài phạm vi. Production chỉ đọc khi nhiệm vụ cần; migration/ghi dữ liệu cần ủy quyền. Lịch sử lỗi preflight và bản sửa cũ tra Git, không dùng để chạy lại SQL trên môi trường đang vận hành.
