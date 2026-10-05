# Website công khai CSAT

Tài liệu vận hành giao diện giới thiệu, lộ trình và catalog A/B/C/E/K. Nguồn nghiệp vụ là [chương trình đào tạo](CHUONG_TRINH_DAO_TAO.md) và [catalog](PUBLIC_COURSE_CATALOG.md); thiết kế theo [nhận diện](PUBLIC_UI_DESIGN_SYSTEM.md) và [quy tắc chuyển động](UI_MOTION_WORKFLOW.md).

## Cấu trúc mã

| Phần | Nơi sửa |
|---|---|
| Trang chủ, nội dung và tương tác buổi học | `app/page.tsx`, `components/marketing/HomeExperience.tsx`, `home-experience.css` |
| Hero và đội ngũ dùng chung, trang gia sư công khai | `TutorShowcase.tsx`, `app/gia-su/page.tsx` |
| Lưới/trang bài viết và nội dung frontend | `app/bai-dang/`, `lib/public-posts.ts`, `posts.css`; xem [hướng dẫn bài đăng](PUBLIC_POSTS.md) |
| Video không gian luyện tập | `PracticeVideo.tsx`, `public/media/writing-960.webm`, poster trong `images/site/` |
| Chọn hướng học, hero và các nhóm lớp | `app/lo-trinh/page.tsx`, `components/marketing/RoadmapExperience.tsx`, `roadmap-experience.css` |
| Chi tiết lớp, liên kết cũ | `app/lo-trinh/[program]/page.tsx` |
| Menu, logo, liên hệ, theme | `PublicShell.tsx`, `PublicHeader.tsx`, `PublicNavigation.tsx`, `public-design.css` |
| Glyph, icon, reveal và phản hồi click | `PublicMotion.tsx`, `PublicFeedback.tsx` |
| Chuẩn bị thông tin tư vấn/tài liệu | `PublicConsultation.tsx` — frontend, kiểm tra và sao chép; API hiện có chưa được nối |

Các thành phần nằm trong `components/marketing/`. CSS giới hạn trong `.csat-public`; không đưa reset hoặc token trang công khai sang nội dung nghiệp vụ. Font Archivo là cấu hình toàn hệ thống. PublicHeader bao scope riêng cho menu tại login/tutor/ParentShell; sidebar, dữ liệu và thao tác phụ huynh nằm ngoài scope đó. Trang dùng React/Next.js trực tiếp, không tải HTML, script hoặc dữ liệu từ prototype.

Bộ HTML trước tích hợp đã được chuyển sang kho nội bộ ngoài Git; server demo cũ đã dừng. Dùng `node scripts/preview-public-site.cjs` để xem ứng dụng tại cổng 3100. Không cần xin bản prototype để phát triển hoặc chạy QA.

Menu “Đội ngũ” đi tới `/gia-su`, “Bài đăng” tới `/bai-dang`; “Kênh gia sư” và “Phụ huynh” đi tới `/tutor` và `/login` để sử dụng cơ chế đăng nhập hiện hành. Các đường dẫn công khai mới được khai báo trong `proxy.ts`; việc này không thay quyền của route nghiệp vụ hay API. Thành tích mở `https://csatoj.vn/awards/` trong tab mới. Menu thu gọn dưới 1281 px, caption cạnh logo ẩn tại desktop hẹp để tránh chèn ép liên kết.

## Nội dung đã duyệt

- CSAT tập trung vào lập trình thi đấu và tư duy thuật toán; đội ngũ gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu theo nội dung chủ trung tâm duyệt ngày 04/10/2026. Thông điệp tập thể không cập nhật tự động hồ sơ cá nhân trong database.
- A có 9 chủ đề; B có 15; lớp C dùng đủ 19 chủ đề C+D. E là PreVOI hướng tới HSG Quốc gia; chương trình chi tiết còn chờ trung tâm cung cấp. Website mời trao đổi lịch, học phí và nền tảng, không tự công bố các thông tin chưa được duyệt.
- K học riêng hoặc nhóm riêng với nội dung tùy chọn; không đồng nghĩa HSGQG. Catalog không thay đổi lớp, mã chủ đề, học phí hay lịch sử đang vận hành.
- Hải Đăng: Thủ khoa khóa 52 chuyên Tin THPT Chuyên Phan Bội Châu; Giải Nhất HSGQG 2025–2026, hạng 3 toàn quốc; Giải Nhì và Giải Ba HSGQG 2023–2025. Không diễn giải thêm loại kỳ thi của danh hiệu thủ khoa.
- Poster cung cấp: Ngô Tuấn Hiệp — Giải Nhì HSGQG, Giải Nhất tỉnh Nghệ An 2025–2026; Trần Đăng Quang — Giải Nhì HSGQG 2024–2025 và 2025–2026; Nguyễn Ngọc Bảo Toàn — Giải Nhì HSGQG 2025–2026, Giải Ba HSGQG 2024–2025.
- Không sử dụng poster thống kê tổng hợp chưa được xác nhận. Ảnh code/sách là tài nguyên hình ảnh, không dùng để khẳng định sách là giáo trình C++ hoặc màn hình là CSATOJ.

## Ảnh, font và video

Tệp phục vụ website nằm trong `public/images/site/`, gồm WebP đã tối ưu từ tài nguyên chủ trung tâm cung cấp. Ảnh nguồn dung lượng lớn, poster và video gốc được loại khỏi Git và gói Vercel; giữ tại máy/kho nội bộ để biên tập. Không xóa nguồn chỉ vì bản tối ưu đã được tạo.

Bản gốc logo, font Space Grotesk đã ngừng dùng và ảnh dẫn xuất không còn tham chiếu được lưu nội bộ ngày 05/10, cùng hồ sơ duyệt HTML; không giữ song song trong gói ứng dụng.

Hai logo compact trong `public/icon/` chỉ thu gọn viewBox, giữ nguyên đường nét và màu SVG gốc. Từ 05/10 toàn hệ thống dùng Archivo với fallback Segoe UI, Lucida Grande, Arial, sans-serif. Không còn tải Space Grotesk/IBM Plex Mono. C+SAT nền dùng SVG outline dẫn xuất từ nét KVANT của logo; không cần cài font KVANT.

Ảnh A+B: `basic-class.webp`; lớp C: `books.webp`. Nhóm ảnh hero lộ trình cùng loại ảnh chụp, cắt thành bốn khung hình học. Theo chỉ định mới 05/10, nhóm PreVOI dùng comp-program.webp; các ảnh đều cùng khung góc khuyết, lớp blur và màu nền chung. Icon lớn dùng hình học góc cắt đồng nhất; icon thao tác dùng Lucide.

Ba video nguồn đều 4K: coding-screen khoảng 22,6 giây/119 MB, digital 3D render khoảng 19,4 giây/44 MB, writing khoảng 15,9 giây/20 MB. Ngày 05/10, chủ trung tâm chọn writing cho “Không gian luyện tập”, khung **ngang 4:3**, tự phát không tiếng/lặp trong màn hình. Bản phục vụ `public/media/writing-960.webm` dùng VP9 960×720, không audio, khoảng 1,66 MB; poster `writing-poster.webp`. Chỉ tải video khi cần phát; dừng ngoài viewport/tab ẩn; giảm chuyển động/tiết kiệm dữ liệu dùng poster và cho phép chủ động phát. Có nút dừng/phát; no-JS/lỗi media giữ ảnh tĩnh. Hai video còn lại vẫn chờ chọn vị trí. Nguồn giữ ngoài Git; `public/media/` chỉ chứa bản đã duyệt, không phục vụ nguồn 4K nguyên trạng.

## Form frontend và lần kết nối sau

Theo yêu cầu mới ngày 04/10/2026, cả form tài liệu trên trang chủ và form tư vấn trên lộ trình/chi tiết lớp đều hoạt động **chỉ ở frontend**. Người dùng nhập thông tin, kiểm tra bản tóm tắt, chỉnh lại hoặc chủ động sao chép để nhắn qua Zalo/Facebook. Nút không mang nhãn gửi và không thông báo trung tâm đã nhận. Khi không JavaScript vẫn có các liên kết liên hệ thật.

Form kiểm tra trường bắt buộc, định dạng email và số điện thoại Việt Nam; có khóa A/B/C/E/K, cấp học, mục tiêu, nền tảng và lời nhắn. Chọn lộ trình trước đó được giữ trong ngữ cảnh tóm tắt. Không gọi endpoint trạng thái hoặc gửi, không lưu vào localStorage/sessionStorage, không đưa thông tin liên hệ lên URL; rời/tải lại trang sẽ mất bản nhập. Clipboard chỉ được ghi khi bấm sao chép; bị chặn thì chọn sẵn nội dung để sao chép thủ công.

`/api/consultations` và endpoint trạng thái vẫn giữ để nối trong đợt sau. **Chỉ bật biến môi trường chưa nối được form mới.** Cần adapter giữa lựa chọn frontend và schema strict hiện tại, consent trước lưu dữ liệu, idempotency/retry, điều kiện migration 18 và QA thực theo [setup](SETUP_VERCEL_SUPABASE.md). Không gửi nguyên các nhãn tiếng Việt hoặc trường mới vào API cũ. Email là công tắc riêng. Chi tiết hợp đồng tương lai đọc [catalog](PUBLIC_COURSE_CATALOG.md); API CSATOJ/giáo trình E đọc [tích hợp tương lai](FUTURE_INTEGRATIONS.md).

## Kiểm thử và phát hành

Chạy các bước bắt buộc trong [AGENTS](../AGENTS.md), sau đó kiểm tra Next.js thật bằng `scripts/check-public-site.cjs` với Playwright được cài trên máy. Runner chỉ cho địa chỉ loopback, chặn mọi request ghi; form dùng dữ liệu giả và clipboard giả để kiểm tra thành công/thất bại. Kiểm tra mobile/desktop, light/dark, bàn phím, không JS, giảm chuyển động, đổi trang và back/forward.

`.vercelignore` loại prototype, ảnh/video nguồn, dữ liệu nội bộ và output kiểm thử khỏi gói CLI. Deploy từ Git chỉ chứa tài nguyên đã qua review. Cấu hình database/email không tự đổi theo deploy. Trạng thái phát hành và bằng chứng mới nhất phải ghi trong [tiến độ](PROJECT_STATUS.md); build local thành công không đồng nghĩa production đã cập nhật.

## Nguồn tham khảo biên tập

[Teach Computing](https://teachcomputing.org/curriculum/key-stage-4) trình bày kiến thức theo sự tiếp nối của khái niệm và kinh nghiệm đã học. [Competitive Programmer’s Handbook](https://cses.fi/book/book.pdf) là nguồn tham khảo cách kết nối ý tưởng, độ phức tạp và nhóm kỹ thuật. Đây là nguồn tham khảo cách giải thích, không bổ sung chủ đề vào giáo trình CSAT. [Crency](https://crency.agency/) là tham khảo bố cục/typography; không sao chép tài nguyên hoặc khẳng định đã kiểm chứng cách triển khai animation của họ.

Biên tập lộ trình ngày 05/10 có agent riêng, tham khảo thêm cách giải thích vấn đề và tư duy từ [CS50](https://cs50.harvard.edu/x/), [VNOI về tham lam](https://wiki.vnoi.info/algo/greedy-new) và [VNOI về hai con trỏ](https://wiki.vnoi.info/algo/basic/two-pointers). Giữ A9/B15/C+D19, E là PreVOI cần trao đổi, K là học riêng; nguồn tham khảo không phải đối tác CSAT và không thay nội dung đã duyệt.

Menu dùng chung không thay kiểm tra đăng nhập hoặc quyền. Dropdown tại form tư vấn/tài liệu và bộ chọn lộ trình dùng `PublicSelect.tsx`; portal popup có class riêng để không bị cắt bởi section. Root không khóa cuộn; native form value/required do Base UI quản lý.
