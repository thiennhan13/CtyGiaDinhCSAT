# Bắt đầu cuộc hội thoại mới

Đối chiếu mã local ngày **06/10/2026**, trên `main`, commit nền `f83c3a6` (`Eco-system-update`). Tài liệu này là bản đồ đọc, không thay mã hoặc xác nhận production. Khi tiếp tục, kiểm tra lại HEAD và working tree; không mặc định trạng thái Git, server preview hay quyền phát hành của cuộc hội thoại trước còn phù hợp với nhiệm vụ mới.

## Đọc theo nhiệm vụ

Đọc [README](../README.md), [AGENTS](../AGENTS.md), [PROJECT_STATUS](PROJECT_STATUS.md), [ARCHITECTURE](ARCHITECTURE.md) và [SECURITY](../SECURITY.md). Sau đó chọn nhánh công việc, chỉ nạp tài liệu và mã liên quan:

| Công việc | Đầu mối |
|---|---|
| Giao diện, nội dung, tương tác, responsive | [Frontend workflow](FRONTEND_WORKFLOW.md) |
| API, xác thực, RPC, migration, Storage, email | [Backend workflow](BACKEND_WORKFLOW.md) |
| Nội dung học | [Chương trình](CHUONG_TRINH_DAO_TAO.md), [catalog công khai](PUBLIC_COURSE_CATALOG.md) |
| Phát hành | [Setup Vercel–Supabase](SETUP_VERCEL_SUPABASE.md), [CI](CICD_SETUP.md) |
| Nối form, email, CSATOJ | [Các tích hợp tương lai](FUTURE_INTEGRATIONS.md) |

Không đọc toàn bộ nhật ký cũ, prototype hoặc export để bắt đầu. Mã/API/RPC/test và schema đúng môi trường là bằng chứng; tài liệu có ngày mới hơn vẫn có thể chỉ là kế hoạch.

## Hệ thống đang làm gì?

Một ứng dụng Next.js phục vụ website công khai và ba vai trò. Admin quản lý lớp, con người, học phí và chốt sổ; gia sư cập nhật buổi học, điểm danh, lộ trình, nhận xét và hồ sơ; phụ huynh xem dữ liệu đã công bố của con. Backend nằm trong cùng repository: Next.js API/Server Actions → validation và quyền → Supabase RPC/RLS/transaction, không phải một dịch vụ tách riêng.

| Phần | Đã có trong mã | Chưa được coi là hoàn tất |
|---|---|---|
| Website | Trang giới thiệu, lộ trình, năm lớp, đội ngũ, học liệu, bài viết, thành tích và trang liên lạc | Bài viết lấy frontend; trang thành tích chưa có dữ liệu trung tâm cung cấp |
| Form công khai | Validation → xem lại/chỉnh sửa → sao chép → chủ động nhắn Zalo/Facebook | Chưa nối API tư vấn, không lưu/gửi tự động |
| Quản lý và phụ huynh | Luồng nghiệp vụ, quyền, lịch sử, nhận xét/lộ trình, học phí và giao diện theo prototype | Cần xác thực mạnh hơn, schema phù hợp và nghiệm thu staging |
| Hồ sơ/avatar | Editor gia sư/admin, revision, audit, xử lý ảnh 512×512 và cleanup | Cần migration 22, bucket/policy và QA Supabase Storage thật |
| Email | Backend/outbox, cron ngày 28, admin xem và xử lý ngoại lệ | MAIL-01/02, schema và Resend chưa đủ điều kiện bật |
| CSATOJ | Liên kết hoạt động; vị trí số bài/ranking trong Portal | Chưa có tích hợp API hoặc đồng bộ chỉ số |

Trạng thái production gần nhất là kiểm tra chỉ đọc **01/10/2026**: registry 05–17 và 20, thiếu 18/19/21/22; chưa có bucket avatar, email tháng tắt. **Không kiểm tra lại production trong đợt bàn giao này.** Xem ma trận và bằng chứng theo phiên bản trong PROJECT_STATUS; build/QA local không xác nhận deployment, DNS, Storage hay dữ liệu production.

## Các quyết định cần giữ

- Catalog tuyển sinh **A/B/C/E/K** tách khỏi chương trình database `basic/advanced/voi/custom` và hình thức học. A có 9 chủ đề, B có 15; C dùng trọn C+D, 19 chủ đề. Cơ bản đang vận hành vẫn mặc định A+B, có thể chọn A/B/A+B trong quản lý. Website giới thiệu và tư vấn A/B riêng; A+B chỉ là gộp tạm nội bộ, các lớp tương lai cần tách riêng khi đặc tả backend.
- **E là Chủ lực**, thi tuyển riêng từ C, hướng HSG Tỉnh/tuyển sinh chuyên Tin; 3–4 học sinh, 2 giờ/buổi. E không phải PreVOI. PreVOI giữ riêng trong quản lý; giáo trình/học phí E cần trung tâm cung cấp. K là kèm riêng/tùy chọn, không đồng nghĩa HSGQG.
- Giữ nháp/công bố, snapshot, revision và kỳ đã chốt. Không chuyển chặng từ ranking hoặc tính lại lịch sử bằng giá tuyển sinh.
- Cron nhắc nhận xét/tag tháng và tổng hợp admin; admin chốt sổ thủ công. Không tự công bố, chốt sổ hay thêm thư báo cáo phụ huynh.
- Đội ngũ cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu; chỉ dùng thành tích đã duyệt. Không thêm cam kết đầu ra, số liệu hoặc hồ sơ giả.

## Điểm giao diện đã chốt gần nhất

Nhận diện Archivo, logo/nền C+SAT dạng nét KVANT SVG; kem, cobalt, lime, cam, góc cắt và art terminal. Glass ở vùng phù hợp; chuyển động nổi bật có nhịp, có bàn phím/no-JS/reduced motion. Chi tiết ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md) và [motion](UI_MOTION_WORKFLOW.md).

Trang chủ: bốn lý do giáo dục → đội ngũ → terminal giữa bốn nhánh hệ sinh thái → khóa học → sáu bước buổi học → phụ huynh → tư vấn. Kho bài & máy chấm có CTA CSATOJ. Lộ trình mở bằng “Lộ trình học lập trình cùng CSAT Tutor” và art trước bốn ảnh blur; cụm 9 icon nằm giữa bộ chọn và lớp A, rồi năm phần A/B/C/E/K. `/login` dùng switch Phụ huynh/Gia sư và ẩn dock/lời mời học liệu. Không phục hồi hero hoặc sơ đồ thẻ A/B/C đã bỏ.

## Ưu tiên tiếp theo

1. **SEC-01/02:** xác thực phụ huynh và mật khẩu khởi tạo gia sư. Lookup bằng số điện thoại chưa chứng minh sở hữu số; gia sư mới đang có mật khẩu ban đầu từ số điện thoại.
2. **DB-01, PROFILE-01, PARENT-01:** đối chiếu lại schema, hoàn thiện migration/Storage và nghiệm thu staging; giữ lịch sử trước mọi phát hành.
3. **MAIL-01/02/03:** sửa lỗi quá hạn tổng hợp admin và retry sau worker crash; cấu hình Resend, gửi mẫu được phép rồi bật từng luồng.
4. **OPS/QA/ARCH:** xác minh CI/deployment thực, làm browser runner dùng chung và tách dần module lớn theo nghiệp vụ.
5. **Tích hợp/nội dung:** adapter form tư vấn, API CSATOJ, quản trị bài viết/thành tích và giáo trình mở rộng khi có hợp đồng/nguồn duyệt.

ID và tiêu chí hoàn thành chỉ duy trì trong PROJECT_STATUS, không tự coi danh sách trên là quyền thực hiện production.

## Dấu vết local cần giữ

- Đầu đợt bàn giao có ghi chú gỡ skill riêng trong PROJECT_STATUS và bốn PNG nguồn ở `public/images/ảnh khóa học/`, chưa tracked, mỗi tệp khoảng 4,7 MB. Chưa chọn/tối ưu/tích hợp; không stage nguyên thư mục ảnh bằng `git add .`. Đợt này giữ nguyên các nguồn.
- Skill riêng của project đã được gỡ; skill chung được cung cấp qua catalog của công cụ. Không đưa skill, secret hoặc cấu hình tài khoản vào repository.
- Preview cổng 3101 dùng bản build local/cấu hình giả của lượt UI trước. Server có thể dừng khi đổi phiên. Lệnh preview dùng chung trong repo là `node scripts/preview-public-site.cjs` ở cổng 3100; không phụ thuộc script trong `scratch/` để onboarding.

## Prompt mở cuộc hội thoại mới

```text
Tiếp tục CSAT Portal tại repository này. Đọc docs/HANDOFF.md và các tài liệu bắt buộc;
chọn FRONTEND_WORKFLOW hoặc BACKEND_WORKFLOW theo nhiệm vụ, chỉ đọc mã/tài liệu liên quan.
Nhiệm vụ: [mục tiêu cụ thể]. Tiêu chí hoàn thành: [hành vi quan sát được].
Kiểm tra git status/diff và đối chiếu triển khai trước khi sửa; giữ công việc có sẵn.
Frontend dùng design, ui-styling, ui-ux-pro-max khi có; giữ nhận diện và nội dung đã duyệt.
Không coi test local hoặc commit là trạng thái production. Dùng dữ liệu giả/môi trường thử.
Ghi rõ kiểm thử đã chạy, phần chưa chạy và việc còn lại; cập nhật tài liệu nguồn chuẩn.
```
