# Bản đồ nguồn để xây dựng website CSAT khác

Tài liệu chỉ vị trí mã nguồn, nội dung và tài nguyên để một website khác đọc, tham khảo hoặc tích hợp phần công khai của CSAT. Đây là bản đồ nguồn local; không phải xác nhận trạng thái production, cũng không có nghĩa các thay đổi giao diện mới đã được triển khai.

## Thư mục gốc và cách đọc đường dẫn

- Project website hiện tại: `D:\Cty_gia_đình_CSAT\CtyGiaDinhCSAT`.
- Project roadmap gốc: `D:\Cty_gia_đình_CSAT\csat-roadmap`.
- Các đường dẫn trong bảng dưới tính từ gốc website hiện tại, trừ phần ghi riêng project roadmap gốc.
- Website hiện tại dùng Next.js/React/TypeScript, Node.js 24. File TSX không chạy trực tiếp như HTML; website dùng stack khác cần chuyển markup, style và tương tác tương ứng.

## Phạm vi cần triển khai ở website nhận

| Yêu cầu | Nguồn hiện có để đọc | Phân biệt hiện trạng và việc cần làm |
|---|---|---|
| Làm lại Giới thiệu / Trang chủ | `app/page.tsx`, `components/marketing/HomeExperience.tsx` | Hiện Giới thiệu và Trang chủ cùng là `/`; làm lại bố cục tại website nhận, giữ thông tin được duyệt |
| Thêm popup liên hệ CSAT | `components/marketing/PublicNavigation.tsx`, `lib/public-contact.ts` | Hiện có bảng liên hệ mở từ nút nổi, không phải modal tự bật; website nhận có thể tái sử dụng hành vi này |
| Thêm liên kết đến Portal | `components/marketing/PublicNavigation.tsx`, `components/marketing/PublicShell.tsx` | Website khác dùng URL tuyệt đối `https://portal.csatoj.vn/`; liên kết thẳng trang liên lạc dùng `/login` trên domain Portal |
| Thêm liên kết đến trang khóa học riêng | `app/lo-trinh/page.tsx`, `app/lo-trinh/[program]/page.tsx` | Danh mục và chi tiết khóa đã có tại Portal; có thể dẫn sang đó hoặc dựng trang riêng từ catalog |
| Tạo trang Road map | `app/tu-hoc/page.tsx`, `components/marketing/SelfStudyRoadmap.tsx` | Bản đồ kiến thức tương tác hiện là `/tu-hoc`; khác với trang giới thiệu khóa `/lo-trinh`. `/roadmap` là route có thể tạo ở website nhận, không phải route hiện hành của repo này |

## 1. Giới thiệu / Trang chủ

| File / thư mục | Nội dung |
|---|---|
| `app/page.tsx` | Route `/`, metadata, dữ liệu SEO và kết nối shell với nội dung trang chủ |
| `components/marketing/HomeExperience.tsx` | Ghép toàn bộ nội dung giới thiệu, lớp học, phụ huynh và CTA cuối trang |
| `components/marketing/TutorShowcase.tsx` | Hero và đội ngũ được trang chủ sử dụng |
| `components/marketing/HomeLearningWidgets.tsx` | Giá trị học tập và trình tự buổi học |
| `components/marketing/WhyCSAT.tsx` | Phần hệ sinh thái / lý do học cùng CSAT |
| `components/marketing/home-experience.css` | Style trang chủ, các khối art, bố cục và responsive |
| `components/marketing/why-csat.css` | Style hệ sinh thái / sơ đồ WhyCSAT |
| `components/marketing/public-density.css` | Khoảng cách riêng của trang chủ và tổng quan lộ trình |
| `public/images/site/` | Media công khai đã tối ưu; truy theo đường dẫn import/src trong component để lấy đúng ảnh |

Luồng nội dung hiện tại: Hero CSAT → bốn lý do học lập trình thi đấu → đội ngũ → hệ sinh thái → khóa học → sáu bước buổi học → phụ huynh đồng hành → lời mời tư vấn. Nội dung thật nằm trong các component trên; tên, giá và đối tượng khóa cần đối chiếu catalog, không sao chép giá thành nguồn độc lập mới.

CTA cuối trang hiện dẫn `https://portal.csatoj.vn/lo-trinh#tu-van`. Nếu dùng lời mời từ trang Tự học, nội dung đã yêu cầu là: **Đăng kí ngay để truy cập các bài giảng chuyên sâu, code mẫu và hình thành tư duy lập trình thi đấu!** Dẫn về phần đăng ký/tư vấn; không mô tả như đã có cơ chế tự cấp quyền sau khi bấm.

## 2. Popup / bảng liên hệ CSAT

| File | Trách nhiệm |
|---|---|
| `components/marketing/PublicNavigation.tsx` | State `dock`, nút mở/đóng, `contact-panel`, đóng bằng Escape/click ngoài, chuyển và trả focus, danh sách kênh |
| `components/marketing/public-design.css` | `.contact-dock`, `.dock-toggle`, `.dock-panel`, vị trí nổi, responsive, dark mode và reduced motion |
| `lib/public-contact.ts` | Nguồn chính các kênh liên hệ công khai |
| `components/marketing/PublicShell.tsx` | Footer cũng dùng dữ liệu liên hệ này |

Kênh hiện có trong nguồn:

- Email chính: `contact@csatoj.vn`; email bổ sung ở footer: `csattutor@gmail.com`.
- Zalo: `https://zalo.me/0917791599`.
- Facebook: `https://www.facebook.com/csat.tutor`.
- TikTok: `https://www.tiktok.com/@csat.tutor`.

Bảng mở theo thao tác người dùng. Giữ nút có tên truy cập, trạng thái mở/đóng và hỗ trợ Escape. Trang Tự học hiện ẩn dock bằng CSS riêng để tránh che sơ đồ; khi chuyển sang website khác cần chọn vị trí không đè toolbar. Nếu chỉ cần popup liên hệ, không cần sao chép backend đăng ký.

## 3. Menu, Portal và các liên kết

| File | Nội dung |
|---|---|
| `components/marketing/PublicNavigation.tsx` | Logo, châm ngôn, menu, icon, nút theme và bảng liên hệ |
| `components/marketing/RoadmapNavigation.tsx` | Dropdown Lộ trình và liên kết khóa |
| `components/marketing/PublicShell.tsx` | Khung trang công khai, header, footer, nền, điều hướng section |
| `components/marketing/PublicHeader.tsx` | Header dùng ở các entry của Portal |

URL nên dùng khi dẫn từ một website khác:

| Điểm đến | URL đầy đủ |
|---|---|
| Website Portal CSAT | `https://portal.csatoj.vn/` |
| Trang liên lạc / đăng nhập | `https://portal.csatoj.vn/login` |
| Gia sư | `https://portal.csatoj.vn/login?role=tutor` |
| Tổng quan các khóa học | `https://portal.csatoj.vn/lo-trinh` |
| Chi tiết khóa A / B / C / E / K | `https://portal.csatoj.vn/lo-trinh/a`, `/lo-trinh/b`, `/lo-trinh/c`, `/lo-trinh/e`, `/lo-trinh/k` trên cùng domain |
| Đăng ký học | `https://portal.csatoj.vn/dang-ky-hoc` |
| Đăng ký với khóa chọn sẵn, ví dụ A | `https://portal.csatoj.vn/dang-ky-hoc?course=A#thong-tin` |
| Tư vấn | `https://portal.csatoj.vn/lo-trinh#tu-van` |
| Roadmap / bản đồ tự học | `https://portal.csatoj.vn/tu-hoc` |
| Nhánh A / B / C / DP | `https://portal.csatoj.vn/tu-hoc#view=A` (đổi A thành B, C hoặc DP) |
| Kho đề và bài tập CSATOJ | `https://csatoj.vn` |

Logo CSAT dẫn về trang chủ. Menu hiện không có nút Giới thiệu riêng; Tự học nằm sau Bài đăng. Khi liên kết sang domain khác, không dùng đường dẫn tương đối `/login` hoặc `/lo-trinh` nếu mục đích là mở Portal.

## 4. Trang khóa học riêng

| File / thư mục | Nội dung |
|---|---|
| `app/lo-trinh/page.tsx` | Trang tổng quan khóa học |
| `app/lo-trinh/[program]/page.tsx` | Route chi tiết A/B/C/E/K và metadata theo khóa |
| `components/marketing/RoadmapExperience.tsx` | Ghép bố cục tổng quan |
| `components/marketing/RoadmapCourseSection.tsx` | Khối giới thiệu từng khóa |
| `components/marketing/FlagshipCourseSection.tsx` | Nội dung nổi bật riêng lớp E |
| `components/marketing/CourseDetailContent.tsx` | Chặng, tag tư duy, chủ đề và mục tiêu ở trang chi tiết |
| `components/marketing/CourseStageNavigation.tsx` | Điều hướng chặng của trang chi tiết |
| `components/marketing/PublicConsultation.tsx` | Form tư vấn / đăng ký; không coi là form HTML gửi độc lập |
| `lib/public-courses.ts` | Nguồn tên, đối tượng, giá, thời lượng, sĩ số, ảnh, tag và helper URL đăng ký |
| `lib/public-roadmap-content.ts` | Diễn giải khóa, chặng và chủ đề |
| `lib/public-course-outcomes.ts` | Mục tiêu cuối khóa |
| `lib/learning-curriculum-20260922.json` | Khung chuẩn A: 9, B: 15, C: 19 chủ đề |
| `components/marketing/roadmap-experience.css`, `roadmap-detail-base.css`, `roadmap-editorial.css`, `course-detail.css` | Style tổng quan / chi tiết; các tên sau file đầu cũng nằm trong `components/marketing/` |

Nội dung công khai gồm A/B/C/E/K. C là tên chung phần C/D; giữ mã chủ đề lịch sử. E là lớp Chủ lực tuyển chọn từ C, không đồng nghĩa PreVOI; K là Kèm riêng. Trang chi tiết đã bỏ dòng Kỹ năng rèn luyện dưới từng bài; tag chặng và tên/thứ tự chủ đề vẫn giữ.

Nếu website nhận chỉ làm phần giới thiệu, dẫn đăng ký về Portal. Sao chép form cần triển khai đúng API/validation/consent và xử lý lỗi tương ứng; không tạo thông báo gửi thành công giả.

## 5. Road map / bản đồ kiến thức tương tác

| File / thư mục | Nội dung |
|---|---|
| `app/tu-hoc/page.tsx` | Route Tự học, dùng `PublicShell presentation="map"` |
| `components/marketing/SelfStudyRoadmap.tsx` | Component gắn markup và khởi tạo/dọn tương tác |
| `components/marketing/self-study-roadmap.css` | Giấy kẻ toàn trang, node/drawer, menu nổi trái, toolbar dưới, mobile/dark/in |
| `lib/self-study-markup.ts` | Cấu trúc HTML sơ đồ, điều khiển, CTA và fallback |
| `lib/self-study-runtime.js` | Tải dữ liệu/SVG, chuyển nhánh, tìm kiếm, zoom, kéo/cuộn, drawer, hash/history và cleanup |
| `lib/roadmap-graph.ts` | Renderer DAG dọc, hình học node/cạnh và ngắt dòng tiêu đề |
| `lib/self-study-diagrams.json` | Manifest chính xác năm SVG dọc đang được bản tích hợp tham chiếu |
| `lib/self-study-source.json` | Commit và checksum snapshot nguồn |
| `public/self-study/roadmap.d09f0efd29b0.json` | 43 chủ đề, mô tả, quan hệ và URL bài tập từ nguồn roadmap |
| `public/self-study/notebook/` | Các SVG dẫn xuất; chọn theo manifest, không tự lấy file có tên gần giống |
| `scripts/build-self-study-diagrams.cjs` | Sinh năm SVG dọc bằng Node 24 từ dữ liệu snapshot |
| `docs/KNOWLEDGE_MAP.md` | Cấu trúc nguồn, hành vi tương tác và ranh giới với giáo án phụ huynh |

Hành vi cần giữ: cây dọc; năm view full/A/B/C/DP; tìm kiếm không dấu; Sơ đồ/Danh sách; zoom và vừa chiều ngang; tải SVG; click node mở chi tiết và liên kết CSATOJ; URL hash/back/forward; bàn phím; mobile; no-JS và in. Trang giấy cuộn theo document, mục lục/CTA nổi trái, toolbar nổi dưới. Kéo nền/node không chọn chữ hoặc tự mở drawer; văn bản trong drawer vẫn sao chép được.

Project roadmap gốc tại `D:\Cty_gia_đình_CSAT\csat-roadmap`:

- `README.md`: cách chạy và build bản độc lập.
- `src/roadmap.json`: dữ liệu nguồn.
- `src/index.html`, `src/styles.css`, `src/app.js`: HTML/CSS/JS bản gốc.
- `scripts/build.mjs`, `scripts/serve.mjs`, `tests/browser.mjs`: build, preview và kiểm thử.
- `public/index.html`, `public/assets/`: bản xuất tĩnh của project gốc.

Bản gốc độc lập dùng bố cục trước khi tích hợp cây dọc. Muốn giữ giao diện cây dọc hiện tại phải đọc bộ file trong website Portal ở bảng trên. Project nguồn bên ngoài chỉ để đối chiếu, không là dependency runtime của Portal.

## 6. Nền, logo, font và phong cách chung

| File / thư mục | Nội dung |
|---|---|
| `components/marketing/SiteBackground.tsx` | Nền chung gồm hai hình tròn và watermark |
| `components/marketing/site-background.module.css` | Nền kem/dots, vị trí hai hình tròn, watermark, responsive và dark mode |
| `public/icon/csat-watermark.svg` | Chữ C+SAT chìm |
| `components/marketing/public-design.css` | Token và style chung website công khai |
| `app/layout.tsx` | Archivo qua next/font, theme provider và khai báo favicon |
| `public/icon/csat-logo-compact.svg`, `public/icon/csatoj-logo-compact.svg` | Logo nội dung/menu; giữ tỷ lệ |
| `public/icon/favicon.ico`, `favicon-32x32.png`, `favicon-16x16.png` | Icon tab bo góc; các PNG cũng ở `public/icon/` |
| `components/marketing/PublicMotion.tsx`, `PublicFeedback.tsx` | Reveal/feedback tương tác được component công khai sử dụng |

Phong cách: neobrutalism / playful edtech, Archivo, viền rõ, bóng cứng, mặt màu phẳng và art code/mạch/pixel. Palette: kem `#F8F7F2`, cobalt `#2B50E0`, lime `#D9E64C`, cam `#EE683E`. CSS công khai scope `.csat-public`; CSS nền là module riêng. Riêng Tự học dùng giấy kẻ thay nền dots. Không lấy `.site-bg` cũ trong CSS làm nguồn nền chung thay cho `SiteBackground` hiện hành.

## Tài liệu nên đọc và phạm vi bàn giao

Đọc theo thứ tự: `docs/DECISIONS.md` → `docs/PUBLIC_UI_DESIGN_SYSTEM.md` → `docs/PUBLIC_WEBSITE.md` → `docs/PUBLIC_COURSE_CATALOG.md` → `docs/KNOWLEDGE_MAP.md`. Khi tài liệu mô tả cũ khác với caller/runtime hiện tại, đối chiếu mã và quyết định mới nhất; không suy trạng thái deploy từ file local.

Website khác cần nhận mã/component công khai liên quan, dữ liệu catalog/roadmap, media được chọn, dependency được import và tài liệu này. Đây là bản đồ nguồn, không phải một gói copy chạy độc lập. Chuyển sang stack khác cần thay các thành phần Next.js như Link/Image/font, alias import, routing và mount/cleanup bằng cơ chế tương ứng.

Không gộp `.env`, khóa API, database dump, hồ sơ thật, cookie/phiên, `scratch/` hay nội dung riêng tư `content/parent-topics/` vào gói website công khai. Roadmap tự học không cấp quyền đọc các bài giảng phụ huynh; Portal tiếp tục kiểm quyền ở server.
