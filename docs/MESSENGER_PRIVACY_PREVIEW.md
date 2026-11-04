# Bản xem trước chính sách tư vấn Messenger

Chuẩn bị local ngày04/11/2026 từ main `99989645869fb16a69df27e6499207a8db45d01b`, trong clone riêng. Chủ trung tâm đã duyệt công khai ngày04/11/2026; chuẩn bị phát hành, chưa có xác minh production. Không thay đổi workspace cũ ở D:/CtyGiaDinhCSAT hoặc database.

## Nội dung và phạm vi

- Route dự kiến: `/chinh-sach-quyen-rieng-tu`; nội dung tĩnh ở `lib/public-privacy.ts`.
- Tái dùng PublicShell/Archivo/palette; CSS Module riêng, mục lục anchor, liên hệ email/Zalo, footer và sitemap.
- Bỏ riêng dock quảng bá học liệu tại route chính sách để không che nội dung. Các trang khác giữ điều kiện hiện có.
- Proxy bypass Auth cho đúng route chính sách; không nới quyền của API hoặc trang riêng tư.
- Áp dụng cho tư vấn Messenger; không thay thông báo/consent của form đăng ký hoặc Portal.
- Thời hạn90 ngày cho khách chưa đăng ký được chủ trung tâm đồng ý trong cuộc trao đổi04/11. Đã bổ sung Nguyễn Cảnh Thọ,48 Yên Lạc, Phường Hai Bà Trưng, Hà Nội theo thông tin chủ trung tâm; đã được chủ trung tâm duyệt nội dung và công khai; chưa đặt ngày hiệu lực.

## Kiểm chứng local

Node24.11.1. Repo guard không finding; TypeScript đạt; lint strict đạt; unit36/36 đạt. Cập nhật kiểm thử sitemap hiện có để bao gồm route mới. Build Next16.3.8 đạt82 route, chính sách prerender tĩnh. Trước phát hành đã chạy database/API291/291,0 skip, gồm PostgreSQL native trên database thử riêng. Không kết nối database production.

Browser QA bằng Edge đã có trên máy, preview loopback dùng cấu hình giả và chặn request ra ngoài:8 cấu hình320/390/768/1440px × sáng/tối, reduced motion, không tràn ngang, mục lục tới đúng mục không bị header che, link email/Zalo/footer và sitemap đúng,0 lỗi JavaScript. Tắt JavaScript vẫn đọc được tiêu đề và thời hạn90 ngày. Ảnh được kiểm tra trực quan; bỏ overlay học liệu sau vòng kiểm tra đầu rồi chạy lại8 cấu hình.

Đã chạy lại8 cấu hình Edge trên bản production build tại loopback3117 sau khi bổ sung người chịu trách nhiệm/địa chỉ;0 lỗi JavaScript. Không coi đây là nghiệm thu production hoặc chứng nhận tuân thủ pháp lý. Chưa tạo URL chính sách công khai, chưa chấp nhận điều khoản Meta hoặc đăng quảng cáo.

## Bước tiếp

1. Chủ trung tâm đã cung cấp Nguyễn Cảnh Thọ,48 Yên Lạc, Phường Hai Bà Trưng, Hà Nội; đã duyệt công bố bản chính sách cuối ngày04/11/2026.
2. Khi được phép công khai, đối chiếu main mới nhất và chỉ đưa các thay đổi của trang chính sách vào bản phát hành. Không phát hành toàn bộ workspace cũ có thay đổi khác.
3. Sau deploy, xác minh URL trả200 không đăng nhập, nội dung và footer trên domain thật.
4. Điền URL thật trong Meta, xin duyệt điều khoản riêng, lưu mẫu chat và trình cấu hình/ngân sách trước khi đăng quảng cáo.
