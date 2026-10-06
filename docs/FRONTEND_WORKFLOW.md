# Workflow frontend

Áp dụng cho website công khai và giao diện admin/gia sư/phụ huynh. Frontend và backend cùng ứng dụng Next.js; ranh giới là trách nhiệm, không phải hai repository. Tổng quan và trạng thái đọc [HANDOFF](HANDOFF.md), [ARCHITECTURE](ARCHITECTURE.md), [PROJECT_STATUS](PROJECT_STATUS.md).

## Nguồn và nơi sửa

| Phần | Entry point |
|---|---|
| Trang chủ, đội ngũ, hệ sinh thái | `app/page.tsx`, `components/marketing/HomeExperience.tsx`, `TutorShowcase.tsx`, `WhyCSAT.tsx` |
| Đăng ký học, thẻ lớp và khóa mặc định | `app/dang-ky-hoc/page.tsx`, `EnrollmentExperience.tsx`, `lib/public-courses.ts`, `PublicConsultation.tsx` |
| Lộ trình và chi tiết lớp | `app/lo-trinh/page.tsx`, `components/marketing/RoadmapExperience.tsx`, `app/lo-trinh/[program]/page.tsx` |
| Poster mở toàn màn hình, màu lớp và chuyển mục | `CoursePosterPreview.tsx`, `PublicSectionNavigation.tsx`, `roadmap-poster-colors.css` trong `components/marketing/` |
| Shell, menu, theme, footer/dock | `PublicShell.tsx`, `PublicHeader.tsx`, `PublicNavigation.tsx`, `RoadmapNavigation.tsx`, `public-design.css` trong `components/marketing/` |
| Chuyển động, select, form | `PublicMotion.tsx`, `PublicFeedback.tsx`, `PublicSelect.tsx`, `PublicConsultation.tsx` trong `components/marketing/` |
| Học liệu, bài viết, thành tích | `app/hoc-lieu-mien-phi/`, `app/bai-dang/`, `app/thanh-tich/`; nội dung bài viết `lib/public-posts.ts` |
| Liên lạc và đăng nhập | `app/(auth)/login/page.tsx`, `components/auth/ContactEntry.tsx`, `ParentLoginForm.tsx`, `TutorLoginForm.tsx` |
| Cổng phụ huynh | `app/parents/`, `components/learning/ParentShell.tsx`, `ParentPortalView.tsx`; JSON contract `lib/parent-learning.ts` |
| Hồ sơ gia sư | `app/tutor/profile/page.tsx`, `components/tutors/TutorProfileEditor.tsx`, `TutorProfileCard.tsx` |
| Quản lý nghiệp vụ | `app/admin/`, `app/tutor/`, component trong `features/`; đọc query/action liên quan trước khi sửa |

Nội dung đào tạo: [chương trình](CHUONG_TRINH_DAO_TAO.md), [catalog](PUBLIC_COURSE_CATALOG.md), `lib/learning-curriculum-20260922.json`. Dữ kiện tuyển sinh ở `lib/public-courses.ts`; phần diễn giải lộ trình, chặng và chủ đề ở `lib/public-roadmap-content.ts`, có [căn cứ biên tập](ROADMAP_CONTENT_RESEARCH.md). `RoadmapCourseSection`, `CourseKnowledge`, `CourseDetailContent` dùng các nguồn này. Nội dung trang chủ/đăng ký còn có cách trình bày riêng; khi thay cùng khái niệm phải đối chiếu các nơi dùng, không giả định đã có CMS.

## Cách áp dụng ba skill

Đọc SKILL.md từ catalog trên máy đang dùng; các skill hiện được cài chung ngoài project, thường dưới thư mục `.agents/skills` của người dùng. Không hardcode đường dẫn máy tác giả, không cài package hoặc gọi dịch vụ tạo ảnh chỉ vì ví dụ trong skill có lệnh đó.

| Skill | Trách nhiệm trong CSAT |
|---|---|
| `design` | Art direction, ngôn ngữ hình học/icon, sự thống nhất logo/ảnh và cách thể hiện nội dung |
| `ui-ux-pro-max` | Phân cấp thị giác, bố cục đa dạng, khả năng đọc, responsive, accessibility và tương tác theo ngữ cảnh |
| `ui-styling` | Hiện thực component, token, dark mode, trạng thái form/dialog/select và kiểm tra sử dụng bàn phím |

Skill là phương pháp hỗ trợ. [Design system đã duyệt](PUBLIC_UI_DESIGN_SYSTEM.md) là nguồn nhận diện; không thay Archivo, palette, logo hoặc Base UI/select hiện có theo gợi ý tự động. Chỉ đọc reference/tra cứu phù hợp phần đang sửa. Nếu thiếu skill được yêu cầu, báo rõ và dùng nguồn khả dụng theo AGENTS; không sao chép skill vào Git để tạo dependency runtime.

Website công khai có thể dùng editorial, bento, sơ đồ, timeline, ảnh phối chữ và bố cục so le; không ép mọi phần vào heading → đoạn dẫn → hàng thẻ. Với portal nghiệp vụ, ưu tiên đọc dữ liệu, trạng thái và thao tác chính xác; không mang typography hero hay hiệu ứng trang trí vào bảng/form chỉ để đồng bộ hình thức.

## Một vòng triển khai

1. Đọc hướng dẫn bắt buộc, xem status/diff, xác định người đọc và thao tác cần làm. Giữ nhánh/working tree đã thống nhất; không ghi đè phần có sẵn.
2. Đối chiếu UI đang chạy với component, dữ liệu và nguồn nội dung. Nêu các quyết định lớn cần duyệt; chỉnh nhỏ trong phạm vi được giao thì thực hiện trực tiếp.
3. Chốt cấu trúc, nội dung thật, bố cục responsive và trạng thái. Với thiết kế mới chưa được duyệt, tạo bản xem cụ thể để duyệt; prototype/ảnh QA ở kho nội bộ. Trang hiện hành đã dùng Next.js, không bắt buộc quay lại HTML cho mỗi thay đổi.
4. Tái sử dụng shell/token/component; CSS công khai giới hạn `.csat-public`. Không phủ CSS marketing lên portal; không thêm reset toàn cục để sửa một section.
5. Tương tác: phản hồi nhanh, focus rõ, click/tap và bàn phím đều dùng được. Observer/listener/timer/rAF có cleanup; cuộn gốc không bị khóa; glyph là lớp trang trí, không đổi DOM text. Nhịp reveal và fallback theo [motion workflow](UI_MOTION_WORKFLOW.md).
6. Media: chọn nguồn có quyền và đúng nội dung, tối ưu WebP/AVIF, khai báo kích thước/sizes. Video cần vị trí đã được người dùng duyệt, bản tối ưu, pause/viewport/tab/reduced-motion và poster. Không tải nguồn lớn nguyên trạng.
7. Kiểm tra phần thay đổi, xem ảnh thực tế rồi cập nhật nguồn tài liệu và PROJECT_STATUS. Bàn giao file chính, kiểm thử, giới hạn và việc tiếp theo.

## Khi giao diện cần backend

- Thống nhất request/response, validation, quyền, revision, lỗi, `null` và trạng thái trước khi nối. Dữ liệu giả chỉ dùng trong môi trường thử, không biến thành thành tích/chỉ số trên website.
- Form công khai hiện chỉ xem lại/sao chép và liên hệ thật; chưa gửi API. Cần adapter/consent/idempotency cùng backend khi nối; bật env không tự hoàn thiện luồng.
- Trang phụ huynh chỉ đọc bản công bố trong phạm vi liên kết. Không tự lọc dữ liệu ngoài quyền ở client, không biến `null` thành 0 hoặc lấy giá hiện hành tính lại lịch sử.
- UI không được thay Auth/RPC hay thêm service key để “lấy dữ liệu cho dễ”. Chuyển phần hợp đồng/quyền sang [backend workflow](BACKEND_WORKFLOW.md).

## Preview và kiểm thử

```sh
node scripts/preview-public-site.cjs
```

Mở `http://127.0.0.1:3100`. Lệnh này dùng Supabase giả/email tắt; chỉ phục vụ sửa website công khai, không chứng minh portal dữ liệu thật hoạt động. Browser runner: `node scripts/check-public-site.cjs`, cần Playwright/Chromium trên máy; cấu hình `PLAYWRIGHT_MODULE` khi cần, `PUBLIC_QA_BASE_URL` theo server loopback. `PUBLIC_QA_FILTER` giới hạn nhóm kiểm tra liên quan, không bỏ ca đang lỗi để báo đạt. Runner chặn mạng ngoài và các request ghi không được mock.

Kiểm tra desktop/mobile, sáng/tối, bàn phím/focus, 320 px/zoom 200%, reduced motion/no-JS, lỗi/thiếu dữ liệu và điều hướng back/forward. Với animation thêm cuộn nhanh hai chiều, resize, chuyển tab và chọn/copy chữ; hình ảnh không che text/CTA. Không công bố đạt WCAG hoặc mục tiêu LCP/CLS nếu chưa đo đúng bản.

Chạy lint/TypeScript/build và hồi quy phù hợp phạm vi; trước PR dùng đầy đủ bộ kiểm tra trong [CONTRIBUTING](../CONTRIBUTING.md), ghi rõ phần chưa chạy. Không chạy lại DB/concurrency cho một chỉnh CSS thuần túy; khi hợp đồng/quyền thay đổi, kiểm thử cả hai phía. Không tự push/deploy từ kết quả QA.
