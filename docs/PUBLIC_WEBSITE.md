# Website công khai CSAT

Website giới thiệu CSAT, giúp người học hiểu hướng học và chủ động liên hệ. Phát triển trực tiếp trong Next.js, không phụ thuộc HTML prototype. Quyết định tuyển sinh ở [catalog](PUBLIC_COURSE_CATALOG.md), nội dung chuẩn ở [đào tạo](CHUONG_TRINH_DAO_TAO.md), phong cách ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md), trạng thái ở [PROJECT_STATUS](PROJECT_STATUS.md).

## Chức năng và entry point

| Route/chức năng | Nơi sửa chính | Hành vi hiện tại |
|---|---|---|
| / — Giới thiệu | app/page.tsx, HomeExperience.tsx, home-experience.css | Hero, bốn lý do, đội ngũ, hệ sinh thái, lớp học, sáu bước buổi học, phụ huynh, tư vấn |
| /lo-trinh — Tìm hiểu | RoadmapExperience.tsx, RoadmapCourseSection.tsx, CourseKnowledge.tsx | Selector, năm mục A/B/C/E/K, tag/roadmap; ảnh nền không tương tác |
| E tổng quan | FlagshipCourseSection.tsx, flagship-course.css, course-e-theme.css | Một mục nổi bật, banner/sơ đồ đầu vào/ba trọng tâm/CTA |
| /lo-trinh/[program] | app/lo-trinh/[program]/page.tsx, CourseDetailContent.tsx, CourseStageNavigation.tsx, course-detail.css | Facts, chặng/chủ đề, mục tiêu cuối khoá trước tư vấn; poster flexible và mở ảnh |
| /dang-ky-hoc | EnrollmentExperience.tsx, enrollment.css | Năm thẻ 3/2/1 cột, giá/tag/đối tượng, khóa quan tâm mặc định theo ngữ cảnh |
| /thanh-tich | app/thanh-tich/page.tsx, achievements.css, lib/public-achievements.ts | HTML tĩnh và WebP; bố cục 3 nhãn cạnh ảnh; [hướng dẫn](PUBLIC_ACHIEVEMENTS.md) |
| /gia-su | app/gia-su/page.tsx, TutorShowcase.tsx | Đội ngũ dùng chung trang chủ, thành tích cá nhân có nguồn |
| /bai-dang và /bai-dang/[slug] | app/bai-dang/, lib/public-posts.ts, posts.css | Danh mục/trang bài viết frontend; [hướng dẫn](PUBLIC_POSTS.md) |
| /hoc-lieu-mien-phi | LearningMaterialsExperience.tsx, PracticeVideo.tsx | Không gian luyện tập, video và form chuẩn bị nhu cầu; chưa tự gửi tài liệu |
| /login | components/auth/ContactEntry.tsx, ParentLoginForm.tsx, TutorLoginForm.tsx | Trang liên lạc, switch Phụ huynh/Gia sư; handler Auth hiện hành |
| Shell/menu/theme/footer | PublicShell.tsx, PublicHeader.tsx, PublicNavigation.tsx, RoadmapNavigation.tsx | Menu chung, theme, liên hệ thật; không thay quyền |
| Form/select/motion/ảnh | PublicConsultation.tsx, PublicSelect.tsx, PublicMotion.tsx, PublicFeedback.tsx, CoursePosterPreview.tsx | Tái sử dụng tương tác, bàn phím và fallback |

Tên component/CSS không có tiền tố nằm trong components/marketing/. CSS scope .csat-public; PublicHeader scope riêng tại login/ParentShell, không áp phong cách marketing lên dữ liệu portal.

## Nguồn dữ liệu và trách nhiệm

| Nguồn | Sở hữu |
|---|---|
| lib/public-courses.ts | Mã A/B/C/E/K, tên, đối tượng, giá, thời lượng/sĩ số, ảnh, hashtag, bước giới thiệu |
| lib/learning-curriculum-20260922.json | Mã/tên/thứ tự/phạm vi chủ đề chuẩn; A9/B15/C19 |
| lib/public-roadmap-content.ts | Diễn giải lớp/chặng/chủ đề; phần chủ trung tâm sửa E.overview và E.development |
| lib/public-course-outcomes.ts | Mục tiêu tư duy/dạng bài/mức độ thuật toán/hướng tiếp nối, không đánh giá thành thạo |
| lib/public-achievements.ts | Danh mục vinh danh biên tập riêng, không lấy hồ sơ học sinh Portal |
| lib/public-posts.ts | Nội dung bài viết hiện hành, chưa có CMS |
| lib/public-contact.ts | Gmail/Zalo/Facebook/TikTok và liên hệ công khai |

Quyết định đã duyệt → catalog/giáo trình → dữ liệu biên tập → component. Poster cũ và nguồn tham khảo không thay quyết định mới. Biên tập các nơi dùng chung khi đổi một khái niệm; không giả định nội dung đã đi qua CMS.

## Nội dung và cấu trúc đã duyệt

CSAT tập trung lập trình thi đấu/tư duy thuật toán, đội ngũ cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu. Thông điệp tập thể không ghi đè hồ sơ cá nhân.

Trang chủ dùng bốn lý do: Rèn lập luận và phản biện; Tìm cách giải có hệ thống; Hiểu tin học sau công nghệ; Kiên trì học cùng bạn bè. Diễn giải theo tình huống → hoạt động tư duy → giá trị, không bảo đảm chuyển giao sang mọi môn hoặc kết quả thi.

Hệ sinh thái có terminal giữa bốn nhánh Kho bài & máy chấm / Nhóm học nhỏ / Gia sư chuyên Phan / Đồng hành sát sao. Mỗi nhánh ba ý ngắn; art dẫn trực tiếp, không heading lớn/chú thích riêng. Dây mạch phía sau thẻ; mobile luồng dọc. Trải nghiệm ngay mở CSATOJ tab mới với noopener noreferrer. Số bài/điểm CSATOJ là nội dung trao đổi với gia sư, chưa tự đồng bộ Portal.

Tổng quan lộ trình tách A/B/C/E/K; A+B không có trang/thẻ/tư vấn công khai. C là tên chung toàn bộ C/D nhưng giữ mã/scope và hiện trạng admin/gia sư/database. E chọn lọc từ C qua thi riêng, không phải PreVOI. K chọn phạm vi từ nội dung đã duyệt. [Catalog](PUBLIC_COURSE_CATALOG.md) quyết định đối tượng/giá, không chép lại các dữ kiện này thành nguồn khác.

Chi tiết lớp: breadcrumb → hero/poster/CTA và lịch → facts → bản đồ chặng/nội dung học → mục tiêu cuối khoá → Cùng CSAT chọn bước tiếp theo. E/K dùng định hướng được duyệt, không tạo chuyên đề chưa có nguồn. Tư vấn có chủ ngữ/vị ngữ, người học chia sẻ nền tảng và khó khăn, CSAT cùng xem lại để chọn hướng; không tự xác nhận đủ điều kiện.

Dòng lịch ngay dưới nút đăng ký:
> *Lịch học sắp xếp thuận tiện nhất cho học viên theo từng đợt tuyển sinh; trao đổi cụ thể cùng CSAT ngay bây giờ!

Chi tiết/đăng ký cho mở poster với nút đóng/Escape/trả focus; không JS có liên kết ảnh WebP. Tổng quan chỉ có ảnh nền tĩnh, không nút Xem ảnh lớp. Hai nút chuyển mục nổi bên phải không dành cột màn hình.

## Điều hướng và ngữ cảnh đăng ký

- Menu: Giới thiệu, dropdown Lộ trình, Đăng ký học, Thành tích, Đội ngũ, Bài đăng, Trang liên lạc, CSATOJ, theme. Disclosure native dùng hover/click/bàn phím, Escape trả focus; no-JS vẫn mở.
- CTA từ lớp X tới /dang-ky-hoc?course=X#thong-tin; server chỉ nhận A/B/C/E/K. Trang chi tiết xác định khóa bằng route, query khác không thay khóa mặc định. Người dùng vẫn đổi lựa chọn form được.
- /lo-trinh/basic và /lo-trinh/co-ban về tổng quan; /lo-trinh/hsgqg, /voi, /prevoi về đăng ký chung, không tự chọn E. Đối chiếu alias thực trong route trước sửa.
- /tutor kiểm tra phiên qua proxy; người chưa đăng nhập về /login?role=tutor. Đổi switch không gộp phiên/quyền.
- Dock/lời mời học liệu không render tại login/tutor entry. Lời mời học liệu ẩn tại trang đích, đăng ký và Thành tích để tránh che nội dung. Không popup tự mở hoặc số tin giả.
- Footer dùng liên hệ đã xác nhận; không tự thêm địa chỉ, pháp nhân hoặc giờ hỗ trợ chưa được cung cấp.

## Form frontend và ranh giới backend

Mọi form tư vấn/tài liệu/đăng ký dùng PublicConsultation: nhập → validate → xem lại/chỉnh → sao chép theo thao tác → người dùng nhắn Zalo/Facebook. Không nhãn Gửi, thông báo Đã tiếp nhận hoặc gửi tài liệu giả.

Vai trò còn Phụ huynh/Học sinh; cấp học Tiểu học/THCS/THPT. Không Sinh viên, Đại học, cấp học Trao đổi thêm hoặc mục tiêu HSG Quốc gia. Thành tích HSGQG thật của gia sư vẫn hợp lệ, không liên quan tùy chọn form.

Không gọi API tư vấn/trạng thái, không lưu liên hệ vào localStorage/sessionStorage hoặc URL. Rời/tải lại trang mất bản nhập. Clipboard bị chặn có bản chọn để sao chép thủ công; no-JS có liên hệ thật.

Backend /api/consultations đã có request/outbox nhưng schema strict chưa nhận lựa chọn mới. Bật env chưa nối form. Lần kết nối cần adapter/hợp đồng đồng bộ validation–API–RPC–admin–email, consent, idempotency, migration và QA riêng. Chi tiết ở [catalog](PUBLIC_COURSE_CATALOG.md) và [backend workflow](BACKEND_WORKFLOW.md).

## Tài nguyên phục vụ

- Ảnh/logo tối ưu được chọn ở public/images/site/ và public/icon/. Raw poster/course JPG, ảnh học sinh nguồn, prototype/ảnh QA và video 4K giữ nội bộ, ngoài Git/gói Vercel.
- Tổng quan: roadmap-a/b/c/k.webp và roadmap-e-v3.webp; K từ Custom.jpg. Chi tiết/đăng ký: course-a/b/c/ek.webp. Dữ liệu kích thước/sizes và modal theo catalog, không dùng nguồn cũ cho quyết định mới.
- Logo compact giữ chữ SVG path; UI dùng Archivo, không tải KVANT, Space Grotesk hoặc IBM Plex Mono.
- Writing tại Học liệu: writing-960.webm VP9 960×720, không audio, ~1,66 MB; poster writing-poster.webp. Khung 4:3, lazy/mute/loop trong viewport, dừng khi tab ẩn, có pause/play; no-JS/reduce/save-data/lỗi giữ poster, người dùng có thể chủ động phát.
- Hai video nguồn khác chưa duyệt vị trí. Không đưa vào runtime chỉ vì đã có file.

## Biên tập và nghiệm thu

Văn phong học thuật phổ thông, tự nhiên và có mạch lập luận; tên thuật toán chính xác, hành động học cụ thể. Tham khảo VNOI/USACO Guide/CS50/Teach Computing để tổ chức lời giải thích, không chép slogan/giáo trình hoặc tuyên bố liên kết. Căn cứ và giới hạn ở [nghiên cứu nội dung](ROADMAP_CONTENT_RESEARCH.md).

Không tạo thành tích, số liệu, giá, lịch contest hoặc cam kết đầu ra. Gia sư và thành tích học sinh chỉ dùng nguồn được duyệt; không biến danh hiệu cá nhân thành kết quả toàn trung tâm.

Preview/QA theo [frontend workflow](FRONTEND_WORKFLOW.md). Kiểm tra UI Next.js thật, dữ liệu giả, desktop/mobile/ngang/dọc, light/dark, bàn phím, no-JS/reduced motion, client navigation và history; đặc biệt CSS load order của ảnh nền. Không lấy bản HTML đã duyệt làm bằng chứng tích hợp. Cập nhật trạng thái tại PROJECT_STATUS, không nối nhật ký lặp vào tài liệu này.
