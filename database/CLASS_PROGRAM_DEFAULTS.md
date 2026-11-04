# Loại lớp và chương trình mặc định

Nguồn triển khai hiện hành: `lib/class-programs.ts`, migration 20/25 và [chương trình đào tạo](../docs/CHUONG_TRINH_DAO_TAO.md).

| Mã quản lý | Chương trình | Mặc định |
|---|---|---|
| A/B/AB | basic | Phần tương ứng A/B; lớp Cơ bản mặc định A+B, 24 chủ đề |
| C | advanced | Toàn bộ C/D, 19 chủ đề; giữ C01–D07/scope CD |
| PREVOI | voi | Giáo án riêng, không dùng E |
| E/K | custom | Nội dung được duyệt; chưa tự tạo giáo trình chuẩn mới |

Khung hiện hành không ấn định 30/35 buổi như template lịch sử. Chọn chương trình không xác nhận học sinh thành thạo. Đổi mã lớp không tự đổi tên, nội dung đã công bố, học phí hoặc lịch sử; admin xác nhận và ghi revision/audit.

Migration 17 là nền mặc định cũ; 20 bổ sung khung chuẩn và 25 bổ sung mã quản lý. Giữ SQL/fixture để kiểm nâng cấp; không chạy lại các migration đã có. Xem [database README](README.md) để kiểm phụ thuộc, [backend](../docs/BACKEND_COMPLETION.md) để nghiệm thu tạo/đổi chương trình.

K phối nguồn chéo chương trình là đề xuất chờ duyệt. PreVOI/Luyện thi không được đổi nhãn hoặc sao chép giáo án tự động để lấp phần còn thiếu.
