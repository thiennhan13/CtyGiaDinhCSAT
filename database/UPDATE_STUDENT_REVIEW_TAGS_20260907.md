# Nhận xét học sinh — tham chiếu migration 04

Migration 04 bổ sung thẻ nhận xét, ngữ cảnh và trạng thái nháp/công bố; migration 15 bổ sung lịch sử/đính chính. Các hướng dẫn “không thể đính chính” của giao diện cũ không còn là hợp đồng hiện hành.

- Giữ nhận xét bằng lời và thẻ có căn cứ, mức độ quan sát/minh chứng; lựa chọn tag không tự chứng minh năng lực.
- Phụ huynh chỉ đọc nội dung đã công bố trong phạm vi liên kết; quyền gia sư/admin được API/RPC kiểm, không chỉ lọc UI.
- Giữ mã/tag lịch sử và snapshot, không viết lại nhận xét cũ khi đổi khung chương trình.
- Nháp/công bố, revision và lịch sử thay đổi là bất biến. Không dùng cron hoặc ranking để tự công bố.
- Chương trình kiến thức và tag là hai nguồn riêng; không lấy catalog thẻ cũ để tạo giáo trình mới.

Nguồn mã: `lib/student-reviews.ts`, `lib/review-tag-catalog.json`, các API nhận xét và migration 04/15/20. Đọc caller/RPC hiện hành trước khi sửa.

[Khung đào tạo](../docs/CHUONG_TRINH_DAO_TAO.md) · [Kiến trúc](../docs/ARCHITECTURE.md) · [Database README](README.md). Giữ đường dẫn để tra migration; không chạy lại 04 hoặc suy trạng thái production từ log kiểm thử cũ.
