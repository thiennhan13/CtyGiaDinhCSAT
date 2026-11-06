# Danh mục tài liệu

- [Google, CSATOJ grants, gia sư thu tiền và reset: runbook hiện hành](PORTAL_GOOGLE_GRANTS_ROLLOUT.md).
- [Kết nối local, trạng thái SQL đã đọc, Google OAuth và chuẩn bị hồ sơ gia sư](LOCAL_DATABASE_GOOGLE_TUTOR_SETUP.md).
- [Triển khai từng bước: môi trường thử, SQL, Google, OJ và nhập18 hồ sơ gia sư](PORTAL_DEPLOYMENT_STEP_BY_STEP.md).
- [Quyền ba cổng, URL tiếng Anh và nghiệm thu migration 33–34](PORTAL_ACCESS_AND_ROUTES.md).
- [Dữ liệu OJ cho phụ huynh: nhãn Việt hóa, xếp hạng và contract lịch lượt nộp theo ngày](CSATOJ_PARENT_DATA_CONTRACT.md).

Mỗi tài liệu sở hữu một loại thông tin. Bắt đầu từ [HANDOFF](HANDOFF.md), đọc sâu theo nhiệm vụ; không nạp toàn bộ hồ sơ lịch sử.

## Tiếp nhận và quản trị

| Tài liệu | Trách nhiệm |
|---|---|
| [README](../README.md), [HANDOFF](HANDOFF.md) | Tổng quan, chạy local, thứ tự đọc và nơi sửa |
| [DECISIONS](DECISIONS.md) | Quyết định đã chốt và giới hạn phạm vi |
| [PROJECT_STATUS](PROJECT_STATUS.md) | Trạng thái theo môi trường, bằng chứng và backlog |
| [AGENTS](../AGENTS.md), [CONTRIBUTING](../CONTRIBUTING.md) | Quy tắc làm việc, kiểm thử, review và bàn giao |
| [Release](RELEASES.md), [giấy phép](../LICENSE.md) | Gói nguồn, tag/checksum, quyền sử dụng nội bộ và cấu hình GitHub |
| [SECURITY](../SECURITY.md) | Secret/dữ liệu nội bộ, quyền thao tác và xử lý lộ thông tin |
| [ARCHITECTURE](ARCHITECTURE.md) | Bản đồ website/route, ranh giới module, luồng dữ liệu và quyền |
| [Đối chiếu Portal](PORTAL_DEVELOPMENT_REVIEW.md), [danh tính và database](PARENT_IDENTITY_DATABASE_DESIGN.md) | Hiện trạng so với hướng Google + tự liên kết theo số, học sinh–phụ huynh–OJ, schema và kế hoạch chuyển đổi |
| [Frontend](FRONTEND_WORKFLOW.md), [backend](BACKEND_WORKFLOW.md) | Workflow theo phạm vi |

## Website và nội dung

| Tài liệu | Trách nhiệm |
|---|---|
| [Design system](PUBLIC_UI_DESIGN_SYSTEM.md), [motion](UI_MOTION_WORKFLOW.md) | Neobrutalism/playful edtech, token/font/palette, responsive, accessibility và vòng đời effect |
| [Website](PUBLIC_WEBSITE.md) | Route, component, media, form và điều hướng |
| [Catalog](PUBLIC_COURSE_CATALOG.md), [chương trình đào tạo](CHUONG_TRINH_DAO_TAO.md) | Dữ kiện tuyển sinh; mã, thứ tự và phạm vi kiến thức |
| [Biên tập lộ trình](ROADMAP_CONTENT_RESEARCH.md) | Văn phong, nguồn và giới hạn diễn giải |
| [Bản đồ kiến thức](KNOWLEDGE_MAP.md) | Trang tự học công khai, đối chiếu roadmap/PDF, quan hệ kiến thức và bài luyện |
| [Thành tích](PUBLIC_ACHIEVEMENTS.md), [bài viết](PUBLIC_POSTS.md) | Dữ liệu tĩnh, nguồn đã duyệt, cách cập nhật |
| [Chuyên đề phụ huynh](PARENT_TOPICS.md) | 43 chủ đề/54 bài, renderer, quyền và cách biên tập |
| [Đối chiếu bài học](PARENT_LESSON_AUDIT.md) | Bảng 54 bài với roadmap/PDF, tag CSATOJ đã xác minh và đề xuất ngoài khung |
| [Nghiên cứu chuyên đề](PARENT_TOPIC_RESEARCH.md) | Kiểm chứng nội dung và nguồn; sổ nguồn [A/B](parent-topic-sources-ab.md), [B/C](parent-topic-sources-bc.md), [C/D](parent-topic-sources-cd.md) |
| [SEO](PUBLIC_SEO.md), [hiệu năng/QA](PUBLIC_PERFORMANCE_QA.md) | Metadata, Search Console; phương pháp đo, kết quả và giới hạn |

## Backend và vận hành

| Tài liệu | Trách nhiệm |
|---|---|
| [Ba luồng backend](BACKEND_COMPLETION.md) | Hợp đồng tiếp nhận đơn, phân loại lớp, tra cứu phụ huynh |
| [Tra cứu phụ huynh](PARENT_PHONE_ACCESS.md), [CAPTCHA](LOGIN_CAPTCHA.md) | Phiên lookup, rate limit, cấu hình Turnstile và nghiệm thu |
| [Học phí](BILLING_LOGIC.md) | Chốt sổ, snapshot, đính chính và lịch sử |
| [Hồ sơ gia sư](TUTOR_PROFILES_20260923.md) | Hồ sơ/avatar, Storage và cleanup |
| [Database README](../database/README.md) | Baseline, migration chain, verification và môi trường thử |
| [Setup Vercel–Supabase](SETUP_VERCEL_SUPABASE.md), [CI/CD](CICD_SETUP.md) | Cấu hình, kiểm thử và phát hành; không tự chứng minh deployment |
| [Bảo vệ website](PUBLIC_SECURITY.md), [vận hành miễn phí](FREE_TIER_OPERATIONS.md) | HTTP/bot/dependency; quota, backup và các bước chờ |
| [Tích hợp tương lai](FUTURE_INTEGRATIONS.md) | Email/CSATOJ, hợp đồng và điều kiện bật |

## Hồ sơ tương thích và lịch sử

Giữ tên file có ngày khi đã được liên kết hoặc mô tả migration cụ thể; không dùng ngày trong tên để suy trạng thái production. Các hướng dẫn phát hành cũ chỉ dẫn về nguồn hiện hành:

- [Cổng phụ huynh](PARENT_PORTAL_CURRICULUM_20260922.md), [phát hành parent/email](RELEASE_PARENT_EMAIL_20260922.md).
- [Tư vấn cũ](PUBLIC_SITE_AND_CONSULTATIONS_20260913.md), [kế hoạch email](EMAIL_ROLLOUT_PLAN_20260914.md), [setup email](EMAIL_VERCEL_SETUP_20260914.md).
- [Biên bản chuyển khung chương trình](CLASS_CURRICULUM_ROLLOUT_20260923.md), [ngày/điểm danh](CHANGES_20260906_DATE_ATTENDANCE.md).
- Database UPDATE/ACCOUNTING_UPGRADE/LEARNING_PORTAL_DEPLOYMENT/POST_UPGRADE_CHECK là ngữ cảnh migration; đọc database README trước khi thực thi.

## Quy tắc duy trì

- Trạng thái/kiểm chứng ở PROJECT_STATUS; lựa chọn đã chốt ở DECISIONS; chi tiết nghiệp vụ ở tài liệu chủ quản.
- Thay trực tiếp đoạn hết hiệu lực, không nối nhật ký hoặc chép cùng quy định vào nhiều file.
- Ngày chỉ giữ cho kiểm chứng môi trường, dữ kiện nguồn hoặc định danh migration. Log, ảnh QA, backup và dữ liệu thật ở kho nội bộ.
- Đối chiếu quyết định trực tiếp với mã/RPC/test/schema. Không tự sửa quyết định chỉ vì implementation chưa theo kịp; ghi rõ sai khác.
- Khi đổi tài liệu, kiểm liên kết tương đối và diff. Lịch sử chi tiết dùng Git; [CHANGELOG](../CHANGELOG.md) chỉ dẫn tới tiến độ phát hành.
