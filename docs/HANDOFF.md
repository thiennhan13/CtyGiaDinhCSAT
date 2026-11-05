# Tiếp nhận công việc CSAT

Đây là repository chính thức để phát triển và phát hành CSAT Portal; quyền sử dụng theo [LICENSE](../LICENSE.md), gói nguồn theo [RELEASES](RELEASES.md). Đây là điểm bắt đầu cho thành viên và agent. Chỉ nạp tài liệu liên quan đến nhiệm vụ; lịch sử hội thoại, prototype và log cũ không phải nguồn chỉ dẫn hiện hành.

## Thứ tự đọc

1. [README](../README.md), [AGENTS](../AGENTS.md), [SECURITY](../SECURITY.md); kiểm tra Git status/diff và giữ thay đổi đang có.
2. [PROJECT_STATUS](PROJECT_STATUS.md): phần đã phát hành, bằng chứng kiểm chứng và việc còn chờ.
3. [DECISIONS](DECISIONS.md): các lựa chọn đã chốt, những phương án không được tự khôi phục.
4. [ARCHITECTURE](ARCHITECTURE.md), rồi [frontend](FRONTEND_WORKFLOW.md) hoặc [backend](BACKEND_WORKFLOW.md).
5. Tra nghiệp vụ cụ thể tại [danh mục tài liệu](README.md).

## Ưu tiên khi tiếp tục

Trạng thái mới04/11 thay phạm vi reset03/11: đã giữ Auth/tutors/Storage/intake/catalog/audit và xóa lớp/học sinh/phụ huynh/phát sinh, nhập1 lớp B/4 học sinh/4 phụ huynh cùng10 hồ sơ/ảnh khớp. Không chạy lại reset. Tám hồ sơ chưa khớp vẫn chờ admin; OJ và Google thật cho bộ dữ liệu mới chưa nghiệm thu. [Bằng chứng hiện hành](DATABASE_REINITIALIZATION_20261104.md) và PROJECT_STATUS ưu tiên hơn các mốc cũ phía dưới.

Ưu tiên đã được chủ trung tâm đồng ý: chuẩn bị staging/restore và đối soát schema; Google + nhập số khớp để tự liên kết phụ huynh; admin đổi mã để gắn học sinh CSATOJ theo grants/accounts; hoàn thiện Portal phụ huynh; chuẩn hóa lớp/điểm danh/học phí và quyền gia sư ghi nhận thu. Đọc [bản đối chiếu](PORTAL_DEVELOPMENT_REVIEW.md) và [bản đồ danh tính/database](PARENT_IDENTITY_DATABASE_DESIGN.md). Không dùng hướng mã mời Portal cũ. Mã local đã có migration30–32 và các luồng mới; xem [runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md); email và nội dung E/K/PreVOI là backlog riêng.

## Nơi sửa thường dùng

Phạm vi danh tính: một phụ huynh/một số/một con. Migration19/21/22/29–32 đã áp03/11, mã Google/grants/chứng chỉ/thu dư nợ đã deploy04/11; không chạy lại migration hoặc phục hồi lookup cũ. Chủ trung tâm đã nghiệm thu Google/phone với dữ liệu trước reset. Sau đợt04/11, bucket/10 hồ sơ và ảnh đã có; cần nghiệm thu Google trên4 hồ sơ mới, UI avatar với phiên thật, cấu hình OJ và pilot lớp/điểm danh/học phí. Giữ8 hồ sơ chưa khớp cho admin. Xem [checklist](PORTAL_DEPLOYMENT_STEP_BY_STEP.md) và PROJECT_STATUS.

| Nội dung | Nguồn |
|---|---|
| Tên, giá, đối tượng, ảnh lớp | `lib/public-courses.ts` |
| Diễn giải lộ trình, mô tả và ba trọng tâm E | `lib/public-roadmap-content.ts` |
| Mục tiêu cuối khóa | `lib/public-course-outcomes.ts` |
| Khung giáo trình chuẩn | `lib/learning-curriculum-20260922.json` |
| Chuyên đề riêng tư | `content/parent-topics/`, `lib/parent-topic-catalog/` |
| Thành tích | `lib/public-achievements.ts`, `public/images/site/achievements/` |
| Phân loại chương trình lớp | `lib/class-programs.ts`, migration 25 |
| Đăng nhập/CAPTCHA | `app/api/parents/auth/`, `app/api/auth/login/`, `lib/login-captcha.ts` |

## Nguyên tắc bàn giao

Đối chiếu caller/API/RPC/test trước khi sửa. Chỉ ghi bằng chứng thực đã có, phân biệt local, CI, staging và production. Ngày chỉ cần cho bằng chứng môi trường; không nối nhật ký mỗi lượt làm việc.

Dùng Node.js 24 và dữ liệu giả khi kiểm thử. Không tự tạo agent, ghi production, gửi thư hoặc phát hành nếu chưa được giao đúng phạm vi. Giữ quyền, nháp/công bố và lịch sử; không suy năng lực từ ranking. Kết thúc bằng thay đổi, kiểm thử, giới hạn và bước tiếp theo.
