# Tra cứu số điện thoại — tham chiếu migration 03

Migration 03 là luồng lookup lịch sử. **Runbook hiện hành là [PARENT_PHONE_ACCESS](../docs/PARENT_PHONE_ACCESS.md)** với migration 27 và [Turnstile](../docs/LOGIN_CAPTCHA.md).

Giữ hồ sơ/liên kết và dữ liệu Auth lịch sử; người biết số vẫn có thể truy cập dữ liệu liên kết, CAPTCHA/rate limit không chứng minh sở hữu số. Không tự xóa Auth user, mở Phone provider hoặc phục hồi đăng nhập mật khẩu.

Không chạy lại migration 02/03 hoặc master schema trên database đang dùng. Đối chiếu registry/cấu trúc/grants theo [database README](README.md), trạng thái theo [PROJECT_STATUS](../docs/PROJECT_STATUS.md). Tệp này giữ liên kết cũ, không là hướng dẫn chuyển đổi production.
