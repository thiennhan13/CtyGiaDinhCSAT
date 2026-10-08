# Workflow frontend

Phạm vi: website công khai và UI admin/gia sư/phụ huynh. Ưu tiên hiện tại là hoàn thiện frontend theo chỉ dẫn chủ trung tâm; backend/API chờ hợp đồng và triển khai riêng. Hai luồng cùng ứng dụng Next.js, không phải hai repository.

## Trước khi sửa

Đọc README/AGENTS/SECURITY, [HANDOFF](HANDOFF.md), [trạng thái](PROJECT_STATUS.md), [kiến trúc](ARCHITECTURE.md), rồi tài liệu chức năng. Xem Git status/diff và UI đang chạy; giữ thay đổi có sẵn, chỉ nạp mã liên quan.

Dùng **Node.js 24** cho local, CI và deploy theo quyết định chủ trung tâm và .nvmrc/engines. Kiểm tra node --version trước chạy; runtime hosted cần xác minh riêng.

## Bản đồ nguồn

| Nhiệm vụ | Nơi đọc/sửa |
|---|---|
| Website public: route/component/asset/form | [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md) |
| Neobrutalism, font/palette/layout ngoại lệ | [PUBLIC_UI_DESIGN_SYSTEM](PUBLIC_UI_DESIGN_SYSTEM.md) |
| Tên/giá/đối tượng/tuyển sinh | [PUBLIC_COURSE_CATALOG](PUBLIC_COURSE_CATALOG.md), lib/public-courses.ts |
| Nội dung học và diễn giải | [CHUONG_TRINH_DAO_TAO](CHUONG_TRINH_DAO_TAO.md), JSON chuẩn; lib/public-roadmap-content.ts, [nghiên cứu](ROADMAP_CONTENT_RESEARCH.md) |
| Mục tiêu cuối khoá | lib/public-course-outcomes.ts, CourseOutcomes trong CourseDetailContent.tsx |
| Thành tích/bài đăng | [PUBLIC_ACHIEVEMENTS](PUBLIC_ACHIEVEMENTS.md), [PUBLIC_POSTS](PUBLIC_POSTS.md) |
| Motion/ảnh/dialog/select | PublicMotion/PublicFeedback/CoursePosterPreview/PublicSelect; [motion workflow](UI_MOTION_WORKFLOW.md) |
| Cổng phụ huynh | app/parents/, components/learning/ParentShell.tsx, ParentPortalView.tsx; contract lib/parent-learning.ts |
| Bài chuyên đề phụ huynh | [Quyết định và quyền đọc](PARENT_TOPICS.md), lib/parent-topics.ts, content/parent-topics/; route private không dùng PublicShell |
| Hồ sơ gia sư | app/tutor/profile/, components/tutors/TutorProfileEditor.tsx, TutorProfileCard.tsx |
| Admin/gia sư nghiệp vụ | app/admin/, app/tutor/, features/; đọc query/action/API/RPC tương ứng |

Tên component public không có tiền tố ở components/marketing/. Không cần đọc toàn bộ prototype/nhật ký để hiểu giao diện hiện hành.

## Áp dụng skill và quyết định đã duyệt

Đọc skill từ catalog máy hiện tại; design định hướng art, ui-ux-pro-max hỗ trợ layout/UX, ui-styling hiện thực component/token; banner-design khi có banner/hero. Không hardcode đường dẫn máy tác giả hoặc sao chép skill vào repo.

Neobrutalism/playful edtech là hướng đã duyệt; dùng editorial/bento/timeline/sơ đồ theo mục đích. Giữ Archivo, logo, palette và Base UI/select hiện có. Không đổi nhận diện hoặc cài dependency theo gợi ý tự động. Nếu skill được gọi thiếu, báo rõ, tìm nguồn phù hợp; quy tắc repo đủ để bắt đầu.

Thay đổi layout/nội dung chưa duyệt cần bản xem cụ thể. Không bắt buộc dựng ba HTML cho mọi sửa nhỏ; chỉ làm khi được yêu cầu. Chỉ tạo agent khi người dùng/chỉ dẫn áp dụng yêu cầu, giao file sở hữu rõ và không sửa trùng.

## Một vòng làm việc

1. Xác định mục đích, người đọc, hành vi cần quan sát và ranh giới dữ liệu.
2. Đối chiếu nội dung mới với catalog/giáo trình và chỉ đạo gần nhất. Dữ kiện, diễn giải, nội dung chờ duyệt phải phân biệt.
3. Thiết kế cấu trúc ngữ nghĩa và responsive trước kích thước chi tiết; ảnh flexible, heading/CTA không bị phủ, không cắt chữ để ép chiều cao.
4. Tái dùng shell/token/component; CSS scope .csat-public hoặc page/class phù hợp, không reset toàn hệ thống để sửa một section.
5. Hoàn thiện trạng thái focus/bàn phím/touch/no-JS/reduced motion; dọn observer/listener/timer/rAF. Không khóa cuộn, thay DOM text bằng glyph hoặc trì hoãn điều hướng.
6. Dùng media đã chọn/tối ưu, dimensions/sizes đúng; nguồn/prototype/ảnh QA giữ scratch/internal ngoài runtime.
7. Chạy kiểm tra theo thay đổi, xem ảnh thực tế, cập nhật tài liệu nguồn và PROJECT_STATUS. Bàn giao kết quả, file chính, bằng chứng và giới hạn.

Nội dung học thuật dùng chủ ngữ/vị ngữ rõ, gắn hoạt động với phương pháp và mục tiêu. Không bịa thành tích, chỉ số, học phí, chủ đề mới hoặc cam kết kết quả. Giữ đoạn chủ trung tâm tự biên tập khi nhiệm vụ chỉ là styling.

## Giao tiếp với backend

Chốt input/response, enum, validation, quyền, revision, lỗi và null trước nối. Form public hiện chỉ xem lại/sao chép/liên hệ thật; không báo đã gửi. Bật env không tự hoàn thiện adapter/schema.

Trang phụ huynh chỉ đọc published trong phạm vi liên kết, không lọc quyền thay server, không biến null thành 0 hoặc tính học phí cũ bằng giá mới. Catalog C/E/K không tự map vào enum lớp hoặc chuyển dữ liệu hiện có. Backend có workflow riêng: [BACKEND_WORKFLOW](BACKEND_WORKFLOW.md).

## Preview và QA

```sh
node --version
node scripts/preview-public-site.cjs
```

Preview tại http://127.0.0.1:3100 dùng cấu hình giả/email tắt. Không chứng minh dữ liệu portal/production hoạt động; không mở .env ra output hoặc giả VERCEL_ENV.

```sh
npm run check:repo
npm run test:repo
npm run typecheck
npm run lint:strict
npm run build
npm run test:public
```

Build dùng môi trường thử/placeholders. Playwright đã khóa version trong devDependency; local dùng Microsoft Edge có sẵn (mặc định msedge), không cài Chromium riêng theo quyết định chủ trung tâm. CI cài Chromium trên runner; PLAYWRIGHT_MODULE là override local tùy chọn. PUBLIC_QA_BASE_URL phải là loopback, PUBLIC_QA_FILTER chọn nhóm liên quan và không được rỗng kết quả. Runner chặn mạng ngoài/request ghi; không bỏ ca đang lỗi để báo đạt. CI chỉ chạy nhóm smoke trong [CI/CD](CICD_SETUP.md).

Kiểm tra desktop/mobile/ngang/dọc, breakpoint hai phía, 320 px/zoom 200%, light/dark, bàn phím/focus, no-JS/reduce; nội dung dài/thiếu, ảnh/CTA, client navigation và back/forward. Với motion thêm cuộn nhanh/resize/chuyển tab/chọn-copy chữ; với ảnh nền kiểm tra thứ tự tải CSS. Đo tương phản trên nền thực; không gọi toàn bộ site đạt WCAG hoặc LCP/CLS nếu chưa đo đủ.

Chọn kiểm thử phù hợp: Markdown thuần dùng guard/liên kết/diff; CSS/content/runtime dùng lint/type/build/browser tương ứng. Không chạy DB/concurrency cho CSS thuần. Trước PR vẫn đầy đủ kiểm tra trong [CONTRIBUTING](../CONTRIBUTING.md), ghi skipped/chưa chạy; đổi contract/quyền cần kiểm thử hai phía. Không tự push/deploy từ test xanh.

## Duy trì tài liệu

Sửa mục hiện hành thay vì nối nhật ký ngày tháng. HANDOFF chỉ dẫn đọc/quyết định; design system giữ style; catalog giữ nghiệp vụ; website giữ mã/hành vi; PROJECT_STATUS giữ trạng thái/bằng chứng/backlog. Không sao chép nguyên cùng quy định vào mọi tài liệu. Ngày chỉ giữ cho bằng chứng môi trường hoặc dữ kiện nguồn cần độ mới.
