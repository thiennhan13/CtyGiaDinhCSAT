# Danh mục tài liệu

## Nguồn hiện hành để bắt đầu

| Tài liệu | Mục đích |
|---|---|
| [README](../README.md) | Tổng quan, thành quả, cấu trúc và định hướng |
| [AGENTS](../AGENTS.md), [CONTRIBUTING](../CONTRIBUTING.md) | Quy tắc Codex và workflow nhóm |
| [PROJECT_STATUS](PROJECT_STATUS.md) | Mã so với production, ngày kiểm tra, backlog và tiêu chí hoàn tất |
| [ARCHITECTURE](ARCHITECTURE.md) | Luồng dữ liệu, quyền, bảng/RPC, vị trí mã và công cụ |
| [CHUONG_TRINH_DAO_TAO](CHUONG_TRINH_DAO_TAO.md) | Nội dung đã được duyệt và cách phân bố A/B/C/D |
| [PUBLIC_COURSE_CATALOG](PUBLIC_COURSE_CATALOG.md) | Hệ 5 lớp A/B/C/E/K, E PreVOI chờ giáo trình, K tùy chọn và hợp đồng hệ thống tương lai |
| [PUBLIC_UI_DESIGN_SYSTEM](PUBLIC_UI_DESIGN_SYSTEM.md) | Nhận diện công khai, font/logo/ảnh/token và ranh giới UI; đọc trước khi sửa thiết kế |
| [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md) | Mã Next.js, tài nguyên, form thực, kiểm thử và phát hành trang công khai |
| [PUBLIC_POSTS](PUBLIC_POSTS.md) | Trang đội ngũ, bài viết frontend, nơi sửa và ranh giới lần nối database sau |
| [BILLING_LOGIC](BILLING_LOGIC.md) | Bất biến học phí/chốt sổ hiện hành |
| [Database README](../database/README.md) | Migration, baseline, verification và khởi tạo môi trường thử |
| [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md), [CICD_SETUP](CICD_SETUP.md) | Cấu hình và phát hành; không phải bằng chứng đã thực hiện |
| [Workflow tương tác](UI_MOTION_WORKFLOW.md) | Phân công, vòng đời hiệu ứng React, fallback và tiêu chí nghiệm thu |
| [FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md) | Việc còn lại trước Resend/email/API CSATOJ |
| [SECURITY](../SECURITY.md) | Git-safe/nội bộ, giới hạn guard và xử lý thông tin đã chia sẻ |

## Đặc tả và hồ sơ các đợt đã qua

Những tài liệu này giải thích bối cảnh và quyết định; dòng “đã/chưa triển khai”, số test hay bước migration chỉ đúng ở thời điểm viết. Trạng thái mới đọc PROJECT_STATUS; không dùng gói SQL cũ trên production hiện tại.

- Kế hoạch UI và bản duyệt HTML 03–04/10 đã chuyển vào kho nội bộ cùng prototype. Nguồn hiện hành là PUBLIC_WEBSITE, PUBLIC_UI_DESIGN_SYSTEM và UI_MOTION_WORKFLOW; không dùng số đo HTML cũ thay nghiệm thu ứng dụng.

- [Hồ sơ gia sư](TUTOR_PROFILES_20260923.md): luồng và kiểm thử local, vẫn cần Storage thật.
- [Chuyển khung chương trình](CLASS_CURRICULUM_ROLLOUT_20260923.md): biên bản đã lược thông tin nội bộ.
- [Cổng phụ huynh và khung](PARENT_PORTAL_CURRICULUM_20260922.md), [phát hành parent/email](RELEASE_PARENT_EMAIL_20260922.md).
- [Trang công khai/tư vấn](PUBLIC_SITE_AND_CONSULTATIONS_20260913.md), [kế hoạch email](EMAIL_ROLLOUT_PLAN_20260914.md), [setup email cũ](EMAIL_VERCEL_SETUP_20260914.md).
- [Sửa ngày/điểm danh](CHANGES_20260906_DATE_ATTENDANCE.md), [CHANGELOG](../CHANGELOG.md).
- Các `database/UPDATE_*.md`, `ACCOUNTING_UPGRADE.md`, `LEARNING_PORTAL_DEPLOYMENT.md`, `POST_UPGRADE_CHECK_*.md`, `CLASS_PROGRAM_DEFAULTS.md`, `PARENT_PHONE_FORMAT.md`: bối cảnh migration/nghiệp vụ; xem chỉ dẫn mới ở đầu tài liệu.

## Tài liệu ngoài Git

Prototype, Excel nguồn, sổ tay vận hành, backup, báo cáo có dữ liệu thật và gói `internal/` do chủ trung tâm cấp riêng. Thành viên không cần bản sao dữ liệu production để hiểu kiến trúc hoặc chạy test. Không biến các đường dẫn máy tác giả thành dependency của workflow nhóm.

Khi tài liệu mâu thuẫn: đối chiếu mã/RPC/test và schema môi trường; ghi lại bằng chứng có ngày rồi cập nhật tài liệu hiện hành. Không mặc định bản có ngày mới hơn là đã triển khai.
