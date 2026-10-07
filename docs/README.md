# Danh mục tài liệu

Tài liệu hiện hành viết theo chức năng/quyết định, không theo nhật ký cuộc hội thoại. Agent bắt đầu từ HANDOFF, chỉ đọc sâu theo nhiệm vụ.

## Nguồn chuẩn

| Tài liệu | Sở hữu |
|---|---|
| [README](../README.md), [HANDOFF](HANDOFF.md) | Tổng quan và thứ tự tiếp nhận, các quyết định cần giữ |
| [AGENTS](../AGENTS.md), [CONTRIBUTING](../CONTRIBUTING.md), [SECURITY](../SECURITY.md) | Quyền, dữ liệu, workflow nhóm và kiểm tra trước chia sẻ |
| [PROJECT_STATUS](PROJECT_STATUS.md) | Trạng thái local/production, bằng chứng, nội dung chờ và backlog |
| [ARCHITECTURE](ARCHITECTURE.md) | Ranh giới trách nhiệm, luồng dữ liệu/quyền, cấu trúc mã |
| [FRONTEND_WORKFLOW](FRONTEND_WORKFLOW.md), [BACKEND_WORKFLOW](BACKEND_WORKFLOW.md) | Quy trình triển khai và kiểm thử theo phạm vi |
| [PUBLIC_UI_DESIGN_SYSTEM](PUBLIC_UI_DESIGN_SYSTEM.md) | Neobrutalism/playful edtech, token/font/palette và ngoại lệ từng trang |
| [UI_MOTION_WORKFLOW](UI_MOTION_WORKFLOW.md) | Motion, fallback, vòng đời effect và nghiệm thu |
| [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md) | Route/component/media/form và hành vi công khai |
| [PUBLIC_COURSE_CATALOG](PUBLIC_COURSE_CATALOG.md) | Năm lớp A/B/C/E/K, dữ kiện tuyển sinh và hợp đồng tương lai |
| [CHUONG_TRINH_DAO_TAO](CHUONG_TRINH_DAO_TAO.md) | Phạm vi/thứ tự/mã kiến thức chuẩn, quản lý A+B/C+D hiện hành |
| [ROADMAP_CONTENT_RESEARCH](ROADMAP_CONTENT_RESEARCH.md) | Quy tắc hành văn, nguồn tham khảo, dữ kiện so với diễn giải |
| [PUBLIC_ACHIEVEMENTS](PUBLIC_ACHIEVEMENTS.md) | Bố cục 3 đã duyệt, catalog tĩnh/WebP, nguồn còn chờ và cập nhật |
| [PUBLIC_POSTS](PUBLIC_POSTS.md) | Đội ngũ/bài viết frontend và điều kiện nối CMS |
| [BILLING_LOGIC](BILLING_LOGIC.md) | Học phí/chốt sổ/đính chính/lịch sử |
| [Database README](../database/README.md) | Migration/baseline/verification và database thử |
| [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md), [CICD_SETUP](CICD_SETUP.md) | Hướng dẫn cấu hình/phát hành, không phải bằng chứng đã thực hiện |
| [FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md) | Hợp đồng/điều kiện email và API CSATOJ |

## Hồ sơ tham khảo

Giữ hồ sơ có giá trị nghiệp vụ/verification, không nạp mặc định. Tên file có ngày giúp truy lại phiên bản, không quyết định trạng thái hiện tại.

- [Hồ sơ gia sư](TUTOR_PROFILES_20260923.md), [chuyển khung chương trình](CLASS_CURRICULUM_ROLLOUT_20260923.md).
- [Cổng phụ huynh](PARENT_PORTAL_CURRICULUM_20260922.md), [phát hành parent/email](RELEASE_PARENT_EMAIL_20260922.md).
- [Tư vấn](PUBLIC_SITE_AND_CONSULTATIONS_20260913.md), [kế hoạch email](EMAIL_ROLLOUT_PLAN_20260914.md), [setup email cũ](EMAIL_VERCEL_SETUP_20260914.md).
- [Ngày/điểm danh](CHANGES_20260906_DATE_ATTENDANCE.md), [CHANGELOG](../CHANGELOG.md).
- Database UPDATE/ACCOUNTING_UPGRADE/LEARNING_PORTAL_DEPLOYMENT/POST_UPGRADE_CHECK: bối cảnh migration; dùng database README và verification hiện hành trước thực thi.

Prototype, nguồn thiết kế/Excel, screenshot QA, backup và dữ liệu thật giữ ngoài Git trong kho nội bộ phân quyền. Không biến đường dẫn máy tác giả thành dependency.

## Cách duy trì

Mỗi tài liệu có một trách nhiệm; đổi quyết định thì cập nhật nguồn chuẩn và nơi dẫn chiếu, không nối thêm đoạn cập nhật mâu thuẫn. Xóa mô tả phương án hết hiệu lực khỏi nguồn hiện hành, giữ lịch sử ở Git/hồ sơ cần thiết. Ngày năm học/thành tích, tên migration và bằng chứng môi trường vẫn giữ khi có ý nghĩa.

Nếu tài liệu mâu thuẫn, ưu tiên quyết định trực tiếp đã duyệt và đối chiếu mã/RPC/test/schema thật. Không mặc định file mới hơn là đã deploy; không suy chỉ dẫn production từ một ghi chú lịch sử.
