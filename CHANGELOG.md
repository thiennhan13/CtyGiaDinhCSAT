# Thay đổi và phiên bản

Lịch sử mã nguồn được lưu trong Git. Tệp này là điểm dẫn, không duy trì một danh sách “Unreleased” song song dễ lệch với bản đã phát hành.

- [Tiến độ và bằng chứng phát hành](docs/PROJECT_STATUS.md): mã đã kiểm chứng, môi trường, giới hạn và backlog.
- [Quyết định hiện hành](docs/DECISIONS.md): định hướng sản phẩm/kỹ thuật cần giữ.
- [Quy trình phát hành](docs/SETUP_VERCEL_SUPABASE.md): phụ thuộc schema, cấu hình, kiểm chứng và phục hồi.

Khi có bản phát hành mới, cập nhật bằng chứng tương ứng trong PROJECT_STATUS; dùng commit/PR để tra diff và lý do thay đổi. Không coi commit, CI đạt hoặc file migration tồn tại là bằng chứng đã triển khai production.
