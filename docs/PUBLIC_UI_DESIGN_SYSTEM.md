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
| Điều hướng | Logo CSAT, Giới thiệu, dropdown Lộ trình, Thành tích (`/thanh-tich`), Đội ngũ, Bài đăng, Trang liên lạc, logo CSATOJ và theme; thu gọn khi không đủ chỗ |
| Nền gốc | Dots 15 px, blob lime/mint tròn; C+SAT dùng SVG nét KVANT dẫn xuất từ logo đã duyệt, rộng 70vw, nghiêng −5°, top 2vh/left −3vw theo ứng dụng hiện có |
| Kính | Navbar/dock/bộ chọn/kết quả; nền sáng khoảng 92%, tối khoảng 94%, blur cố định 8–12 px; fallback nền đặc |
| Nội dung dài/form | Nền đặc, chữ rõ; không kính chồng nhiều lớp, không animate blur |
| Icon | Icon thao tác nhỏ giữ hệ hiện có; bộ trang trí code lớn SVG góc cắt, nét vuông, pixel; không dùng emoji thay nút |
| Liên hệ | Dock desktop cách đáy 24 px; mobile 16 px + safe-area; không che form/bàn phím |

Spacing theo nhịp 4/8 px. Chữ thường tương phản ≥4,5:1; chữ lớn và ranh giới thao tác ≥3:1. Target thao tác ≥44×44 CSS px. Không coi layer nền động là nền an toàn cho chữ nếu chưa đo ở trạng thái xấu nhất.

## Bố cục và hành vi

Vận dụng nhiều phương pháp từ `ui-ux-pro-max` theo mục đích từng phần: phân cấp thị giác và khoảng trắng, so le/editorial, bento, sơ đồ mạch/cây, timeline, ảnh phối chữ và reveal có định hướng. Không bắt buộc mỗi phần có một tiêu đề lớn, đoạn dẫn rồi hàng thẻ giống nhau. Với phần dẫn bằng art hoặc sơ đồ, dùng tên truy cập cho section và tiêu đề con đúng nghĩa; bỏ chữ lặp không cần thiết, không bỏ thông tin cần hiểu hoặc khả năng điều hướng bàn phím. Chọn bố cục theo nội dung và hành động người đọc cần thực hiện, giữ token/nhận diện đã duyệt; gợi ý font/màu hoặc stack từ skill chỉ là tham khảo, không tự thay cấu hình CSAT. Khi skill local không có, tài liệu này là quy tắc dùng chung của nhóm.

Trang chủ: hero CSAT → bốn lý do học thi đấu và bóng đèn → đội ngũ ba gia sư → hệ sinh thái bốn nhánh → khóa học → sáu bước buổi học → phụ huynh → tư vấn. Hệ sinh thái dùng terminal CSAT ở giữa hai hàng, mỗi hàng hai ô, cột phải lệch xuống 24 px; mạch góc chéo/chip/cổng vuông nằm sau nội dung. Dưới 901 px dùng luồng dọc, không ép chữ vào sơ đồ nhỏ. Bóng đèn đi cùng nhãn “Bốn lý do để bắt đầu” trong luồng bố cục, không phủ heading. Học liệu có trang riêng. Dùng chung PublicNavigation tại trang đăng nhập gia sư/phụ huynh và trong ParentShell; giữ sidebar nội dung, nút in và đóng tra cứu. Khung desktop công khai tối đa 1.408 px, tăng 10% từ 1.280 px, co theo viewport.

Trang lộ trình, cập nhật 06/10: “Lộ trình học lập trình cùng CSAT Tutor” và art terminal ở trước bốn ảnh góc khuyết, blur cố định → chọn điểm bắt đầu → cụm 9 icon → năm phần A/B/C/E/K → tư vấn. Bỏ hero chữ/đoạn dẫn cũ, interlude riêng và sơ đồ thẻ A/B/C lặp lại. Nền chia theo section kem/lime/xanh; giữ nhịp nhận diện nhưng không để lớp nền xám phủ toàn trang. Cụm icon chỉ trang trí, không phải đánh giá đầu vào hoặc cơ chế tự chuyển chặng.

Glyph chỉ thay lớp hiển thị tối đa 7 ký tự gần chuột trong khoảng 420 ms; văn bản gốc, copy, thứ tự đọc và kích thước không đổi. Không dùng ở menu, form, touch, selection hoặc reduced motion. Icon hội tụ chỉ là bản sao trang trí; liên kết thật cố định. Nhịp và kiểm thử xem [motion workflow](UI_MOTION_WORKFLOW.md).

## Mật độ nội dung — 06/10/2026

Theo yêu cầu của chủ trung tâm, trang giới thiệu `/` dùng khoảng đệm dọc giữa các phần bằng **70%** mức trước đó; trang tổng quan `/lo-trinh` dùng **50%**. Token theo trang nằm trong `components/marketing/public-density.css`, giới hạn bởi `.csat-public .home-overview` và `.csat-public .roadmap-overview`. Giữ khoảng cách tới menu đầu trang, kích thước nút và khoảng cách trường nhập. Khoảng đệm cuối hero được giảm cùng tỷ lệ; cụm icon chuyển tiếp lộ trình thu gọn còn nửa chiều cao, giữ đủ 9 icon.

Ví dụ: section trang chủ desktop 96 → 67,2 px mỗi phía, mobile 56 → 39,2 px; section lớp lộ trình desktop 80/96 → 40/48 px, mobile 50/65 → 25/32,5 px. Riêng năm phần mô tả lớp trên tổng quan lộ trình, tiêu đề và chiều rộng/cao ảnh còn **70%**; chiều cao phần tự co theo nội dung, không cắt chữ hoặc ép chiều cao cố định. Không áp dụng các quy tắc này sang trang đội ngũ, chi tiết từng lớp hoặc Portal.

Theo duyệt tiếp ngày 06/10, tích hợp phương án 3 tại `/dang-ky-hoc`: poster 144 × 144 px gấp đôi mẫu, thời lượng và sĩ số ngay dưới tên, phần đối tượng bám poster, các bước học và tag. Dùng cobalt cho A, lime cho B, cam cho C, lime trên nền đậm cho E, viền nét đứt cho K; tên/nhãn giữ rõ nghĩa ngoài màu sắc. Lưới 3 cột desktop, 2 cột tablet, 1 cột mobile. Lộ trình A/B/C dùng ô nhóm chặng/tag theo curriculum; E/K dùng bước trao đổi. Nội dung dẫn được rút gọn theo hướng hành động, không cam kết đầu ra.

Prototype và ảnh QA tiếp tục ngoài Git tại `scratch/`; poster gốc ở `public/images/courses/` giữ nguyên và loại khỏi gói Vercel. Chỉ bốn WebP đã chọn ở `public/images/site/course-{a,b,c,ek}.webp` được phục vụ runtime. Lời mời học liệu được ẩn riêng trên trang đăng ký để giữ form dễ dùng.

## Tham khảo và bàn giao

[Crency](https://crency.agency/) tham khảo cách tổ chức chữ và trải nghiệm; cảnh hội tụ thiết kế riêng cho CSAT, không khẳng định đã xác minh công nghệ của họ. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) hướng dẫn giảm chuyển động, [web.dev](https://web.dev/articles/animations-guide) hướng dẫn ưu tiên transform/opacity.

Prototype/manifest/ảnh QA lưu nội bộ ngoài Git. Khi tích hợp ứng dụng, đưa bản tài nguyên được duyệt và giấy phép phù hợp vào repo; không đưa poster nguồn, file thử hay ảnh tải dư vào commit chỉ vì chúng nằm trong public. Mọi kết quả QA ghi phiên bản, môi trường và giới hạn ở [PROJECT_STATUS](PROJECT_STATUS.md).

### Hình khối và form — 05/10/2026

Ảnh A+B và ảnh minh họa CSATOJ cắt chéo góc; poster gia sư giữ đầy đủ thành tích. Navbar, form và cửa sổ code giảm bo góc. Hero lộ trình đặt bốn ảnh sau chữ, blur Gaussian cố định nhẹ và lớp nền chuyển sắc bảo vệ chữ; ảnh Chủ lực dùng comp-program.webp từ nguồn trung tâm. Dropdown dùng PublicSelect trên Base UI có bàn phím/typeahead, Escape trả focus, bảng chọn riêng hai theme; vẫn chỉ frontend. Lớp C hiển thị sáu nhóm kiến thức thành ba hàng, hai cột, icon bên trái.
## Tinh chỉnh hero giới thiệu — 05/10/2026

Ảnh gia sư được phóng thêm 10% trong lớp cắt theo khung, transform-origin ở giữa phía trên; không tăng khung hoặc thay khoảng cách menu. Orbit có vòng tròn đồng tâm phía trong. C++ trắng; icon/pixel đổi hướng, nhịp và màu khi hover, reduced motion giữ yên. Watermark KVANT ở light giảm opacity 0,12 → 0,085; dark tăng nhẹ 0,16 → 0,18. Dots có token riêng, không thay màu viền hoặc chữ nội dung.

Khoảng cách thực từ menu đến nhãn CSAT: desktop 45 px, tablet 31,5 px, mobile nhỏ 22 px. Khung ảnh cao 792/560/520 px tại viewport 1440/768/375 px; ảnh giữ tỷ lệ, phần cắt mở rộng theo khung. Ba icon terminal, nhánh và mảng cùng bộ hình học nằm dưới lớp portrait, không nhận pointer/focus; hover chỉ dịch/xoay nhẹ trên thiết bị chuột và không bật khi giảm chuyển động. Quy tắc nằm trong `home-experience.css`, không tác động hero lộ trình.
## Bố cục lộ trình cập nhật (local, 06/10/2026)

Tổng quan dùng tên lớp + facts ngay dưới tên; poster đặt làm nền cho vùng mô tả, clip trước vùng kiến thức, có mask/opacity để giữ khả năng đọc và nút Xem ảnh. Chi tiết/đăng ký giữ thumbnail, cùng mở lightbox toàn màn hình với nút Đóng. Ảnh không sticky/reveal/parallax; chỉ phản hồi hover hữu hạn. Tiêu đề thẻ không glyph. Token màu cục bộ lấy theo poster: A xanh lam, B tím, C cam, E/K xanh ngọc, với phiên bản sáng/tối có tương phản rõ. Tag A dùng cyan/cam/tím sáng; E dùng mint/vàng/xanh nhạt trên nền tối. Danh mục chặng có ô đánh số nhiều màu và tag kiến thức; giữ bố cục 3/2/1 cột theo nội dung và viewport, cùng giảm 50% khoảng đệm ranh giới section.

E là điểm nhấn căn giữa: nền tối, chữ mint theo poster, tagline rộng ở giữa, đường tuyển từ C; ba ô trọng tâm xanh ngọc/nâu vàng/xanh lam nằm ngang trên desktop và dọc trên mobile. Không biến ba trọng tâm thành giáo trình hay điều kiện lên lớp. Trang chi tiết đặt thanh lớp trên cùng; sơ đồ chặng dẫn tới native disclosure, các heading chủ đề dùng Archivo. Rail phải có hai nút tối thiểu 44 px, dành khoảng riêng ngoài vùng đọc ở mọi breakpoint. Native image dialog nằm trên header/dock/rail, có focus rõ và Escape; không khóa cuộn bằng script. CSS `roadmap-editorial.css`, `roadmap-poster-colors.css`, `course-poster-preview.css`, `public-section-navigation.css` giới hạn `.csat-public`; PNG gốc không đi vào runtime.
