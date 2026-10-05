# Nhận diện và hệ thiết kế website CSAT

Quyết định được duyệt **05/10/2026**, áp dụng vào giao diện Next.js. Đọc tài liệu này khi sửa giao diện công khai; cấu trúc mã đọc [website](PUBLIC_WEBSITE.md), chương trình đọc [hệ 5 lớp](PUBLIC_COURSE_CATALOG.md), thao tác/QA đọc [workflow](UI_MOTION_WORKFLOW.md). Không cần nạp toàn bộ biên bản lịch sử để bắt đầu. Trạng thái phát hành thực tế xem PROJECT_STATUS.

## Nội dung và tài nguyên

- Theo nội dung chủ trung tâm cập nhật 04/10: CSAT gồm đội ngũ gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu. Không ghi đè thông tin nền từng gia sư trong database từ thông điệp tập thể.
- Logo chính là `csat-logo-compact.svg`; dòng phụ **Lập trình thi đấu & Tư duy thuật toán**. CSATOJ dùng `csatoj-logo-compact.svg`, dòng **Kho đề thi & bài tập** ở trái logo. SVG đã có chữ dạng path; không cần tệp KVANT để hiển thị và không gọi font UI là KVANT. Bản gốc dùng để biên tập được giữ trong kho nội bộ, không tải cùng ứng dụng.
- Chỉ cắt khoảng trắng viewBox của bản dẫn xuất; giữ nguyên màu, tỷ lệ và nội dung logo. Dark mode dùng nền kem nhỏ phía sau logo, không tự đảo màu.
- Hải Đăng: Thủ khoa khóa 52 chuyên Tin THPT Chuyên Phan Bội Châu; Giải Nhất HSGQG 2025–2026, hạng 3 toàn quốc; Giải Nhì và Giải Ba HSGQG 2023–2025. Không suy thành thành tích trung tâm/học viên hoặc bổ sung loại kỳ thi “thủ khoa”.
- Ba poster gia sư Ngô Tuấn Hiệp, Trần Đăng Quang và Nguyễn Ngọc Bảo Toàn dùng cùng nội dung HTML đọc được. Poster tổng hợp giải thưởng chưa rõ đối tượng/giai đoạn không dùng trong catalog hoặc cam kết.
- Ảnh sách/code/Git/bóng đèn là minh họa, không phải ảnh lớp hay nội dung chính thức CSATOJ. Tạo bản phục vụ WebP/AVIF, giữ nguồn và giấy phép trong manifest; khai báo kích thước, lazy load dưới màn hình đầu. Không tải SVG ảnh nhúng 7 MB nguyên bản vào trang.

## Token và thành phần

Điều chỉnh tỷ lệ 05/10: hero text giảm 10% so với bản mở rộng trước; khung/ảnh hero giới thiệu lớn hơn khoảng 20% trên desktop. CTA cuối giảm chữ chính 10%, tăng nhãn dẫn 10% và nút 20%, thêm khoảng cách giữa các dòng và cắt góc nút. Ảnh lớp C có tỷ lệ 4:3; E dùng comp-program.webp với cùng thành phần ảnh như K. Mobile giữ ảnh trong chiều rộng màn hình.

Ba tầng: giá trị gốc → vai trò → component. Nền kem `#f8f7f2`, xanh `#2b50e0`, lime `#d9e64c`, cam `#ee683e`; dark mode nâu ấm. Màu trong logo được giữ theo tài nguyên, không ép đổi thành màu nút.

| Thành phần | Quy tắc |
|---|---|
| Menu | Archivo 500–600, 15–16 px; cùng bộ font toàn hệ thống |
| Tiêu đề/nội dung | Archivo, Segoe UI, Lucida Grande, Arial, sans-serif; Archivo tự phục vụ qua next/font. Tiêu đề công khai viết hoa; desktop hero/heading tăng 50%, mobile dùng cỡ linh hoạt |
| Điều hướng | CSAT → Giới thiệu → Lộ trình → Thành tích ngoài CSATOJ → Gia sư → Phụ huynh → CSATOJ → theme; thu gọn khi không đủ chỗ |
| Nền gốc | Dots 15 px, blob lime/mint tròn; C+SAT dùng SVG nét KVANT dẫn xuất từ logo đã duyệt, rộng 70vw, nghiêng −5°, top 2vh/left −3vw theo ứng dụng hiện có |
| Kính | Navbar/dock/bộ chọn/kết quả; nền sáng khoảng 92%, tối khoảng 94%, blur cố định 8–12 px; fallback nền đặc |
| Nội dung dài/form | Nền đặc, chữ rõ; không kính chồng nhiều lớp, không animate blur |
| Icon | Icon thao tác nhỏ giữ hệ hiện có; bộ trang trí code lớn SVG góc cắt, nét vuông, pixel; không dùng emoji thay nút |
| Liên hệ | Dock desktop cách đáy 24 px; mobile 16 px + safe-area; không che form/bàn phím |

Spacing theo nhịp 4/8 px. Chữ thường tương phản ≥4,5:1; chữ lớn và ranh giới thao tác ≥3:1. Target thao tác ≥44×44 CSS px. Không coi layer nền động là nền an toàn cho chữ nếu chưa đo ở trạng thái xấu nhất.

## Bố cục và hành vi

Trang chủ: hero CSAT → giá trị học và bóng đèn → đội ngũ ba gia sư → CSATOJ/tài liệu → khóa học → sáu bước buổi học → phụ huynh → tư vấn. Đây là thứ tự được cập nhật ngày 04/10; thay thế vị trí đội ngũ sau CSATOJ ở bản duyệt trước. Dùng chung PublicNavigation tại trang đăng nhập gia sư/phụ huynh và trong ParentShell; giữ sidebar nội dung, nút in và đóng tra cứu. Khung desktop công khai tối đa 1.408 px, tăng 10% từ 1.280 px, co theo viewport.

Trang lộ trình: hero rõ → chọn điểm bắt đầu → khám phá A/B/C → E/K → tư vấn. Nền chia theo section kem/lime/xanh; giữ nhịp nhận diện nhưng không để lớp nền xám phủ toàn trang. Bản đồ không phải đánh giá đầu vào hoặc cơ chế tự chuyển chặng.

Glyph chỉ thay lớp hiển thị tối đa 7 ký tự gần chuột trong khoảng 420 ms; văn bản gốc, copy, thứ tự đọc và kích thước không đổi. Không dùng ở menu, form, touch, selection hoặc reduced motion. Icon hội tụ chỉ là bản sao trang trí; liên kết thật cố định. Nhịp và kiểm thử xem [motion workflow](UI_MOTION_WORKFLOW.md).

## Tham khảo và bàn giao

[Crency](https://crency.agency/) tham khảo cách tổ chức chữ và trải nghiệm; cảnh hội tụ thiết kế riêng cho CSAT, không khẳng định đã xác minh công nghệ của họ. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) hướng dẫn giảm chuyển động, [web.dev](https://web.dev/articles/animations-guide) hướng dẫn ưu tiên transform/opacity.

Prototype/manifest/ảnh QA lưu nội bộ ngoài Git. Khi tích hợp ứng dụng, đưa bản tài nguyên được duyệt và giấy phép phù hợp vào repo; không đưa poster nguồn, file thử hay ảnh tải dư vào commit chỉ vì chúng nằm trong public. Mọi kết quả QA ghi phiên bản, môi trường và giới hạn ở [PROJECT_STATUS](PROJECT_STATUS.md).

### Hình khối và form — 05/10/2026

Ảnh A+B và ảnh minh họa CSATOJ cắt chéo góc; poster gia sư giữ đầy đủ thành tích. Navbar, form và cửa sổ code giảm bo góc. Hero lộ trình đặt bốn ảnh sau chữ, blur Gaussian cố định nhẹ và lớp nền chuyển sắc bảo vệ chữ; ảnh PreVOI dùng comp-program.webp từ nguồn trung tâm. Dropdown dùng PublicSelect trên Base UI có bàn phím/typeahead, Escape trả focus, bảng chọn riêng hai theme; vẫn chỉ frontend. Lớp C hiển thị sáu nhóm kiến thức thành ba hàng, hai cột, icon bên trái.
## Tinh chỉnh hero giới thiệu — 05/10/2026

Ảnh gia sư được phóng thêm 10% trong lớp cắt theo khung, transform-origin ở giữa phía trên; không tăng khung hoặc thay khoảng cách menu. Orbit có vòng tròn đồng tâm phía trong. C++ trắng; icon/pixel đổi hướng, nhịp và màu khi hover, reduced motion giữ yên. Watermark KVANT ở light giảm opacity 0,12 → 0,085; dark tăng nhẹ 0,16 → 0,18. Dots có token riêng, không thay màu viền hoặc chữ nội dung.

Khoảng cách thực từ menu đến nhãn CSAT: desktop 45 px, tablet 31,5 px, mobile nhỏ 22 px. Khung ảnh cao 792/560/520 px tại viewport 1440/768/375 px; ảnh giữ tỷ lệ, phần cắt mở rộng theo khung. Ba icon terminal, nhánh và mảng cùng bộ hình học nằm dưới lớp portrait, không nhận pointer/focus; hover chỉ dịch/xoay nhẹ trên thiết bị chuột và không bật khi giảm chuyển động. Quy tắc nằm trong `home-experience.css`, không tác động hero lộ trình.
