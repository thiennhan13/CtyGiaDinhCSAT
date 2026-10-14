# Workflow backend

Phạm vi: xác thực/phân quyền, API/Server Actions, read model, RPC, database, Storage, email và tích hợp. Đọc [ARCHITECTURE](ARCHITECTURE.md) để hiểu luồng; [PROJECT_STATUS](PROJECT_STATUS.md) là nguồn trạng thái và backlog; [SECURITY](../SECURITY.md) quy định dữ liệu/secret.

## Ranh giới và entry point

| Tầng | Trách nhiệm | Nơi đọc |
|---|---|---|
| Route/proxy | Điều hướng, phiên; không thay kiểm tra quyền nghiệp vụ | `proxy.ts`, `lib/auth-routing.ts` |
| API/Server Action | Validate input, phiên/Origin/phạm vi; gọi transaction/RPC và ánh xạ lỗi | `app/api/`, action trong `features/`, `lib/business-api.ts` |
| Hợp đồng/read model | Validation, type, lỗi, JSON trả về frontend | `lib/parent-learning.ts`, `student-reviews.ts`, `tutor-profile.ts`, `consultations.ts` |
| Supabase client | Client theo môi trường/vai trò; service role chỉ server | `lib/supabase/client.ts`, `server.ts`, `service.ts` |
| Database | Quyền/RLS, transaction, revision, audit, snapshot | `database/migrations/`, `verification/`, `tests/` |
| Tích hợp | Gửi thư, xử lý avatar, cleanup có guard | `lib/review-email.ts`, `consultation-email.ts`, `tutor-profile-api.ts`, `tutor-avatar.ts`; công cụ trong `scripts/` |

Một luồng ghi phải đi từ validation và kiểm tra quyền đến ghi atomic/snapshot/audit. Không tạo helper ghi/xóa trực tiếp song song để bỏ qua RPC đang có. Service role vượt RLS nên API dùng nó phải kiểm tra quyền và phạm vi độc lập; UUID, menu ẩn và cookie riêng không chứng minh quyền.

## Hợp đồng giữa frontend và backend

Quyết định tên gọi đã duyệt: hai phần C/D được giới thiệu chung là lớp C, và các lớp nâng cao tương lai cũng dùng tên C. Migration25 bổ sung phân loại quản lý và lịch sử có revision, giữ tên/loại lớp cũ, enum `advanced`, scope CD, C01–D07, template/snapshot và lịch sử. Mapping nhận diện theo loại lớp, trường chưa rõ để admin đối soát; không suy từ tên lớp hoặc tự chuyển giáo án đã công bố. Đối chiếu [catalog](PUBLIC_COURSE_CATALOG.md).

Trước khi sửa: xác định caller, input, RPC/bảng bị tác động, người được phép đọc/ghi, bản nháp/công bố và ca lỗi. Ghi rõ thay đổi tương thích hoặc adapter cần có; giữ chữ ký RPC khi chỉ bổ sung trường JSON. Thiếu dữ liệu trả `null` có nghĩa, không giả số liệu để đáp ứng layout.

Form đăng ký trong mã mới gọi `/api/consultations` → `submit_registration` (24), không tạo outbox/email. Học liệu giữ luồng sao chép/liên hệ. Mã chương trình A/B/AB/C/E/PREVOI/K (25) và Auth phụ huynh (26) xem [BACKEND_COMPLETION](BACKEND_COMPLETION.md); AB hiển thị A+B, PREVOI dùng giáo án riêng, không E. API CSATOJ chưa triển khai: cần hợp đồng/mapping, kiểm tra liên kết, timeout/cache/rate limit; không gọi từ UI bằng key bí mật hoặc suy ra năng lực từ ranking.

## Database và dữ liệu đang vận hành

1. Đọc [database README](../database/README.md), migration precondition, caller/RPC và test liên quan. Kiểm tra môi trường bằng registry **và** cấu trúc/grants/verification; không chỉ lấy số migration lớn nhất.
2. Mã hiện có migration 01–26. Production 14/10/2026 ghi nhận 05–18, 20 và 23–26; đã cấp và đối soát 44 Auth parent theo ủy quyền. Ba luồng đủ migration 18 → 24, 23 → 25 và 23 → 26; ứng dụng mới còn chờ deploy/nghiệm thu. Phần email/hồ sơ 19 → 21 → 22 giữ backlog riêng. Không chạy lại hoặc sửa migration đã phát hành; registry không ghi 01–04 không có nghĩa cần chạy chúng lại. Nếu áp 19/21/22 sau 24–26, kiểm thử schema kết hợp và quyền/projection trước.
3. Dùng database thử tách biệt và fixture giả; kiểm thử nâng cấp cùng chuỗi, bảo toàn lịch sử, draft/published, quyền và concurrency khi có tranh chấp. Migration đã phát hành giữ nguyên; sửa bằng migration mới sau số cuối thực tế lúc làm.
4. Không chạy master schema hoặc gói upgrade lịch sử trên DB đã có dữ liệu. Baseline master hiện đến 10; khởi tạo project trống làm theo database README, không coi master là schema mới nhất.
5. Maintenance dữ liệu phải có căn cứ, phạm vi, preview, guard/audit và quyền. Script bổ sung số phụ huynh từ số học sinh là thao tác một lần, không phải quy tắc tự động cho hồ sơ mới.

Giữ lớp/tham gia/gia sư/đơn giá theo ngày hiệu lực, buổi học và học phí snapshot. Kỳ đã chốt dùng điều chỉnh/đính chính; không reset/xóa hoặc tính lại bằng giá hiện hành. Chặng đang học được xác nhận chủ động; chặng đang xem chỉ là UI.

## Những luồng cần giữ hoặc hoàn thiện

| Luồng | Quy tắc và điểm còn lại |
|---|---|
| Admin/gia sư Auth | Supabase Auth + role/ownership/phân công; SEC-01 cần thay mật khẩu khởi tạo từ số điện thoại và kế hoạch xử lý tài khoản cũ |
| Phụ huynh | Supabase Auth phone/password → cookie/hash gắn user/session → RPC kiểm tra liên kết. Migration26 đóng login cũ ngay; cấp tài khoản và deploy trong bảo trì. SEC-02 còn thiếu chứng minh sở hữu số do mật khẩu chung/đổi tùy chọn |
| Nhận xét/lộ trình | Draft/published, revision và history; không tự công bố hay suy ra thành thạo |
| Hồ sơ/avatar | Gia sư sở hữu/admin lưu hiển thị ngay; ngoại lệ thông tin nền chỉ admin. Ảnh Sharp 512×512 → Storage → RPC; lỗi giữ ảnh cũ, cleanup không xóa ảnh đang dùng |
| Đăng ký | Intake v2 lưu request, không tạo outbox/email; admin đổi trạng thái có revision/audit. Giữ dữ liệu và hàng đợi của luồng tư vấn cũ |
| Cron/email | Ngày 28, `0 1 28 * *` UTC = 08:00 Việt Nam; secret và môi trường gửi được kiểm tra. Nhắc tháng gộp gia sư, tổng hợp admin, không chốt sổ/công bố |

MAIL-01 (tổng hợp admin mới tạo bị tuổi đợt cũ làm quá hạn) và MAIL-02 (reclaim sau worker crash chưa giữ đủ khoảng cách 5 phút) vẫn có trong migration 21. Sửa và nghiệm thu trước bật. Resend là phương án gửi đã duyệt, Gmail trung tâm nhận/phản hồi; không cần Gmail API/mật khẩu Gmail. Không thêm retry scheduler hoặc thư báo cáo phụ huynh ngoài phạm vi được duyệt. Quy tắc payload/idempotency/lease và cách vận hành đọc [FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md).

## Kiểm thử và phát hành

```sh
npm run test:db
npm run typecheck
npm run lint
npm run build
```

`database/tests/` gồm PGlite/API và PostgreSQL native; ca Windows kiểm chứng concurrency/restore. Không coi skip là pass: ghi rõ nền tảng, ca đã chạy và môi trường. Hồi quy tiêu biểu: ngoài quyền/chéo học sinh, ghi đồng thời, payload giữ nguyên sau lần gửi đầu, worker crash, tháng đổi, dữ liệu học phí thiếu/điều chỉnh/hoàn và Storage lỗi.

Trước PR chạy thêm guard và guard tests theo [CONTRIBUTING](../CONTRIBUTING.md). Avatar phải thử Supabase Storage thật trong project thử, Auth phải thử luồng phù hợp, restore phải kiểm chứng trên môi trường tách biệt; mock/build không thay thế những bằng chứng đó.

Production theo [runbook ba luồng](BACKEND_COMPLETION.md) và [setup](SETUP_VERCEL_SUPABASE.md): staging trước → backup/restore thử → preflight → bảo trì/schema → postflight → provisioning có đối soát → deploy tương thích với email tắt → smoke. Migration26 không tương thích login phụ huynh cũ; không để khoảng trống schema/deploy ngoài bảo trì. Người dùng tự chạy SQL production; chưa có staging nên nghiệm thu còn chờ. Không tự thao tác dashboard, cấp Auth thật, gửi thư, reset tài khoản hoặc push/deploy chỉ vì test xanh.

Nếu lỗi, dừng gửi, giữ lịch sử/outbox và chọn phiên bản ứng dụng tương thích. Sửa dữ liệu bằng migration bù; không restore đè làm mất phát sinh mới. Cập nhật mục trạng thái tương ứng trong PROJECT_STATUS: phạm vi/mã, môi trường, bằng chứng, phần chưa chạy và điều kiện còn thiếu. Giữ ngày cho kiểm chứng môi trường; không nối nhật ký từng lượt sửa.
