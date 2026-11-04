# Tiếp nhận công việc CSAT

Đây là điểm bắt đầu cho thành viên và agent. Chỉ nạp tài liệu liên quan đến nhiệm vụ; lịch sử hội thoại, prototype và log cũ không phải nguồn chỉ dẫn hiện hành.

## Thứ tự đọc

1. [README](../README.md), [AGENTS](../AGENTS.md), [SECURITY](../SECURITY.md); kiểm tra Git status/diff và giữ thay đổi đang có.
2. [PROJECT_STATUS](PROJECT_STATUS.md): phần đã phát hành, bằng chứng kiểm chứng và việc còn chờ.
3. [DECISIONS](DECISIONS.md): các lựa chọn đã chốt, những phương án không được tự khôi phục.
4. [ARCHITECTURE](ARCHITECTURE.md), rồi [frontend](FRONTEND_WORKFLOW.md) hoặc [backend](BACKEND_WORKFLOW.md).
5. Tra nghiệp vụ cụ thể tại [danh mục tài liệu](README.md).

## Ưu tiên khi tiếp tục

Ưu tiên đã được chủ trung tâm đồng ý: chuẩn bị staging/restore và đối soát schema; Google + nhập số khớp để tự liên kết phụ huynh; admin đổi mã để gắn học sinh CSATOJ theo grants/accounts; hoàn thiện Portal phụ huynh; chuẩn hóa lớp/điểm danh/học phí và quyền gia sư ghi nhận thu. Đọc [bản đối chiếu](PORTAL_DEVELOPMENT_REVIEW.md) và [bản đồ danh tính/database](PARENT_IDENTITY_DATABASE_DESIGN.md). Không dùng hướng mã mời Portal cũ. Mã local đã có migration30–32 và các luồng mới; xem [runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md); email và nội dung E/K/PreVOI là backlog riêng.

## Nơi sửa thường dùng

Phạm vi đã chốt: một phụ huynh/một số/một con; reset đã thu hẹp03/11 trên Supabase hiện tại: sao lưu về máy, giữ lớp/thành viên/phân công/giá/giáo trình lớp cùng học sinh/phụ huynh/liên kết/Auth/tutors/hồ sơ/avatar/Storage/intake/dữ liệu nền; chỉ xóa chốt sổ/buổi/điểm danh/phát sinh. Không dùng kế hoạch xóa rộng cũ. Mã local có Google claim, grants/accounts, chứng chỉ và quyền gia sư thu toàn bộ dư nợ. Chủ trung tâm xác nhận chưa có môi trường thử, yêu cầu hoàn thiện mã/hướng dẫn trước; activity reset giữ lớp đã thực hiện03/11, đã áp19/21/22/29–32 theo yêu cầu riêng sau backup/rehearsal, chưa deploy ứng dụng; lookup cũ đã bị thu hồi, cần triển khai mã tương thích; xem PROJECT_STATUS. Xem bằng chứng local ở PROJECT_STATUS; bước tiếp theo là deploy ứng dụng tương thích schema đã áp, cấu hình/nghiệm thu Google/OJ/Storage thật và pilot theo [runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md).

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
