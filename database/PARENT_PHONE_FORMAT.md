# Chuẩn hóa số điện thoại phụ huynh

Migration 16 đưa số liên hệ về dạng nội địa `0xxxxxxxxx`, giữ ID và liên kết. Đầu vào +84/0084 hoặc dấu phân cách hợp lệ được chuẩn hóa; số thiếu/không xác định không tự thêm chữ số. Constraint/unique index ngăn hai hồ sơ cho hai cách viết của cùng số.

- Chuẩn hóa ở RPC/trigger và validation, không sửa mạng xã hội/nội dung tự do/học phí.
- Hồ sơ nhập nhằng hoặc thiếu liên hệ cần admin đối soát; không tự lấy số học sinh làm số phụ huynh.
- Cơ chế truy cập hiện hành thuộc migration 27 và [PARENT_PHONE_ACCESS](../docs/PARENT_PHONE_ACCESS.md); dữ liệu Auth cũ được giữ nhưng không dùng cho tra cứu.

[Verification migration 16](verification/20260911_parent_domestic_phones.sql) phục vụ đối chiếu định dạng. Không dùng kết quả login lịch sử để chứng minh phiên/Turnstile hiện hành đã nghiệm thu. Registry và bằng chứng ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md); không chạy lại migration đã có.
