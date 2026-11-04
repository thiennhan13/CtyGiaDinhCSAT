# Tài khoản phụ huynh — tham chiếu migration 02

Migration 02 là nền hồ sơ `parent_accounts`, liên kết `parent_student_links` và quyền quản lý. Phương án Phone Auth/mật khẩu trong tài liệu cũ đã hết hiệu lực.

**Hiện hành:** tra cứu số điện thoại qua phiên lookup và Turnstile; không cấp/reset thêm Auth phụ huynh, không cần Phone provider. Giữ Auth users và lịch sử đã có.

- [Tra cứu phụ huynh](../docs/PARENT_PHONE_ACCESS.md): migration 27, phiên và quyền.
- [Database README](README.md): khởi tạo thử, phụ thuộc và verification.
- [Tiến độ](../docs/PROJECT_STATUS.md): trạng thái môi trường và nghiệm thu.

Giữ đường dẫn và migration lịch sử để kiểm nâng cấp; không chạy lại 02 hoặc theo hướng dẫn cấp mật khẩu cũ.
