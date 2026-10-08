# Thiết lập Vercel–Supabase và phát hành CSAT Portal

## Phát hành giao diện công khai

Trang chủ/lộ trình/catalog mới dùng Next.js trực tiếp, không cần migration mới hoặc Resend. Theo yêu cầu cập nhật, hai form chỉ chạy frontend: nhập, xem lại và sao chép để nhắn Zalo/Facebook; chưa gọi API hoặc lưu dữ liệu. Giữ `CONSULTATIONS_ENABLED=false` và `CONSULTATIONS_EMAIL_ENABLED=false`. Lần nối sau cần adapter/validation/consent và QA, không chỉ bật biến môi trường. Tài nguyên, trạng thái chưa tích hợp và QA xem [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md).

Phát hành qua project Vercel hiện phục vụ `portal.csatoj.vn`. Trước deploy xác minh đúng project/domain, giữ nguyên các biến nghiệp vụ và không tạo project thứ hai. Nếu dùng CLI: đăng nhập tại máy, `vercel link` tới project hiện có rồi `vercel deploy --prod` sau khi kiểm thử bản cuối. Không đưa token vào chat hoặc lệnh được lưu trong tài liệu. `.vercelignore` loại tài nguyên nguồn lớn và tài liệu nội bộ. [Tham khảo Vercel CLI](https://vercel.com/docs/cli/deploy).

Sau deploy được phép: kiểm tra `/`, `/lo-trinh`, các lớp A/B/C/E/K, `/dang-ky-hoc`, `/thanh-tich` và liên kết đăng nhập; xác nhận menu/theme/ảnh/font và CTA tư vấn hoạt động. Ghi URL deployment, thời điểm và kết quả vào PROJECT_STATUS. Nếu lỗi giao diện, rollback deployment trước trên Vercel; không khôi phục hoặc sửa database để xử lý lỗi CSS.

Đây là hướng dẫn thực hiện, không xác nhận đã áp dụng trên production. Trạng thái và ngày kiểm chứng môi trường chỉ duy trì tại [PROJECT_STATUS](PROJECT_STATUS.md); mọi tác động thật cần quyền phù hợp.

Dùng tài liệu này làm đầu mối cấu hình cho bản kết hợp đến migration 23. Các tài liệu phát hành trước giữ vai trò lịch sử; không dùng riêng chuỗi migration 18–19 hoặc 18–21 cho bản ứng dụng mới. Danh sách việc sau này: [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md).

> Đối chiếu registry/cấu trúc/grants thực trước phát hành. Migration 20 và 23 đã được ghi nhận áp dụng; không chạy lại hoặc suy từ số lớn nhất rằng các migration trước đó đều có. Xem trạng thái production trong PROJECT_STATUS.

## 1. Chọn trạng thái phát hành lúc chưa có email/API

| Chức năng | Có thể dùng ngay sau khi cấu hình đúng | Phụ thuộc |
|---|---|---|
| Trang chủ, lộ trình | Có | Bản ứng dụng đã triển khai |
| Admin, gia sư, cổng phụ huynh | Có | Supabase đúng môi trường, migration và liên kết tài khoản/dữ liệu |
| Hồ sơ, giới thiệu, thành tích gia sư | Có | Migration 22 |
| Avatar | Có | Migration 22 và bucket/policy riêng bên dưới; không cần API CSATOJ |
| Form tư vấn lưu Portal | Backend đã có, frontend chưa nối | Adapter/consent/validation, migration 18, hash key và admin tiếp nhận |
| Thư tư vấn, nhắc tháng, tổng hợp admin | Chưa bật | Resend, domain gửi được xác minh, kiểm thử và sửa lỗi cron còn mở |
| Số bài/ranking CSATOJ | Chưa kết nối | Cần triển khai tích hợp; nhập API key đơn thuần chưa đủ |

Thiếu Resend không làm hỏng build hay các tính năng không gửi thư khi giữ công tắc tắt. Thiếu schema hoặc Supabase key lại ảnh hưởng các chức năng dùng database. Thiếu bucket khiến thao tác tải ảnh thất bại; lưu hồ sơ chữ không cần bucket.

Mặc định phát hành ban đầu: `CONSULTATIONS_ENABLED=false`, `CONSULTATIONS_EMAIL_ENABLED=false`, email tháng tắt trong admin. Form frontend hiện không gửi; có bước kiểm tra/sao chép và liên kết Zalo/Facebook. Muốn tiếp nhận tự động cần nối form với API, kiểm thử rồi bật riêng `CONSULTATIONS_ENABLED=true`; email giữ tắt và nhân sự kiểm tra `/admin/consultations` đầu/cuối ngày.

## 2. Vercel — cấu hình project

1. Mở đúng project phục vụ `portal.csatoj.vn`; kiểm tra repository, Production Branch và Root Directory. Không tạo project thứ hai nếu project hiện tại đã đúng.
2. Framework: **Next.js**; Root Directory là thư mục chứa `package.json` (repository này ở gốc); Install Command `npm ci`; Build Command `npm run build`; giữ Output Directory mặc định của Next.js, không cấu hình static export.
3. Dùng Node.js 24 cho local, CI và deploy theo `.nvmrc`/engines. Kiểm chứng dependency/CI/Preview trước phát hành được phép và đối chiếu runtime deployment; không tự đổi dashboard. [Node release schedule](https://github.com/nodejs/Release), [Node trên Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
4. Settings → Domains: xác nhận `portal.csatoj.vn` hợp lệ và HTTPS hoạt động. Giữ DNS website hiện có nếu đang đúng; bản ghi gửi email sẽ cấu hình riêng.
5. Kiểm tra giới hạn Functions đáp ứng route cron `maxDuration=60` và form tư vấn `maxDuration=30`; giữ Node.js runtime cho xử lý avatar bằng sharp. Không cần volume/ổ đĩa bền vững, SMTP server hay biến đổi ảnh Supabase.
6. Chọn gói phù hợp hoạt động trung tâm. Hobby dành cho sử dụng cá nhân phi thương mại; không lấy việc lịch cron chạy được làm bằng chứng gói phù hợp. [Điều kiện Hobby](https://vercel.com/docs/plans/hobby).
7. CI và Vercel có thể chạy độc lập. Cấu hình bảo vệ nhánh/điều kiện phát hành hoặc chỉ phát hành commit đã qua kiểm tra; không mặc định CI fail sẽ tự ngăn Vercel deploy. Workflow hiện dùng giá trị giả, không cần đưa secret production vào GitHub Actions chỉ để build.

### Biến môi trường Production

Vào Settings → Environment Variables, chọn **Production**. Nhập giá trị không kèm dấu ngoặc kép bên ngoài. Khóa bí mật lưu trực tiếp vào dashboard/kho mật khẩu, không gửi qua chat hoặc commit.

| Biến | Giá trị/cách lấy | Cần lúc nào |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL của Supabase production | Bắt buộc cho tính năng dữ liệu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khóa anon phù hợp project, theo cấu hình ứng dụng hiện tại | Bắt buộc; không điền service key vào đây |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa service_role cùng project | Bắt buộc cho API máy chủ; bí mật, không thêm NEXT_PUBLIC |
| `APP_ORIGIN` | `https://portal.csatoj.vn` | Đặt ngay, không dấu `/` cuối; kiểm tra Origin form và link email |
| `CRON_SECRET` | Chuỗi ngẫu nhiên riêng, ít nhất 32 ký tự | Đặt trước khi để lịch cron hoạt động; thiếu thì route trả 401 |
| `CONSULTATIONS_HASH_KEY` | Chuỗi ngẫu nhiên khác, ít nhất 32 ký tự | Trước khi bật nhận form; giữ ổn định giữa deployment |
| `CONSULTATIONS_ENABLED` | `false` lúc đầu | Đổi `true` khi đã kiểm thử lưu form và có người xử lý |
| `CONSULTATIONS_EMAIL_ENABLED` | `false` | Giữ tắt tới khi nghiệm thu gửi |
| `CSAT_EMAIL_FROM` | Sau này: `CSAT <thongbao@notify.csatoj.vn>` | Có thể chưa tạo khi chưa gửi |
| `CSAT_EMAIL_REPLY_TO` | `csattutor@gmail.com` | Đặt trước khi bật email tháng |
| `RESEND_API_KEY` | Chưa tạo khi chưa có Resend; sau này dùng khóa Sending access | Không dùng khóa giả để vượt kiểm tra cấu hình |

`VERCEL_ENV` do Vercel quản lý, không tự thêm/ghi đè. Sau thay đổi biến phải tạo deployment mới hoặc Redeploy; không chỉ lưu dashboard rồi kiểm tra deployment cũ. [Environment variables](https://vercel.com/docs/environment-variables).

### Preview và Development

- Dùng Supabase thử riêng và các khóa của project thử. Không sao chép service_role production vào Preview.
- `APP_ORIGIN` phải khớp URL của môi trường thử; với URL Preview thay đổi có thể bỏ biến này để API form kiểm tra theo origin của request URL. Không để APP_ORIGIN production rồi kỳ vọng form trên Preview gửi được.
- Hai công tắc tư vấn mặc định `false`; chỉ bật nhận form để kiểm thử dữ liệu giả trên database thử. Gửi email thật bị chặn bởi code trên Preview/Development.
- Không đưa Resend key production vào Preview. Không sửa VERCEL_ENV để lách chặn gửi.
- Build xanh không chứng minh kết nối database/Storage thật hoạt động; cần kiểm tra chức năng sau deploy thử.

## 3. Supabase — database và tài khoản

### Đối chiếu và backup trước khi thay đổi

Trong SQL Editor đúng project, kiểm tra chỉ đọc:

```sql
SELECT version FROM csat_internal.schema_migrations ORDER BY version;
```

Bằng chứng production có ngày và các migration còn thiếu xem PROJECT_STATUS. Đối chiếu lại trước thực hiện; nếu kết quả khác, dựa vào kết quả thực. Nếu chưa có registry hoặc thiếu migration nền, dừng đối chiếu quy trình khởi tạo; không chạy ngẫu nhiên migration 18 trở đi.

Tạo backup có thể phục hồi và lưu số lượng tổng hợp các dữ liệu liên quan trước khi chạy SQL. Backup database không chứa byte ảnh trong Storage; cần sao lưu tệp riêng sau khi dùng avatar. Không mặc định mọi gói đều có backup/PITR giống nhau. [Supabase backups](https://supabase.com/docs/guides/platform/backups).

### Thứ tự migration cho bản hiện tại

Chỉ chạy các file còn thiếu, từng file và kiểm chứng ngay sau đó. Vercel không tự áp dụng các file SQL này khi deploy.

| Thứ tự | File trong `database/migrations/` | SQL kiểm chứng trong `database/verification/` |
|---|---|---|
| 18 | `20260913_18_consultations.sql` | `20260913_consultations.sql` |
| 19 | `20260914_19_email_operations.sql` | `20260914_email_operations.sql` |
| 20 (đã ghi nhận áp dụng; không chạy lại) | `20260922_20_curriculum_frameworks.sql` | `20260922_curriculum_frameworks.sql` |
| 21 | `20260922_21_parent_email_completion.sql` | `20260922_parent_email_completion.sql` |
| 22 | `20260923_22_tutor_profiles.sql` | `20260923_tutor_profiles.sql` |
| 23 (đã áp; không chạy lại) | `20261008_23_parent_class_progress.sql` | `tests/parent-class-progress.test.cjs`; đối chiếu RPC/grants và dữ liệu tổng hợp |

23 chỉ phụ thuộc 20; có thể triển khai aggregate phụ huynh độc lập với email/avatar. 18 → 19 → 21 → 22 là phần còn lại; không lặp 20/23.

Không chạy lại migration đã có, không chạy master schema/reset lên database có dữ liệu. Migration 20 chuyển khung kiến thức lớp và lưu snapshot/lịch sử; đối chiếu Cơ bản A/B/A+B, Nâng cao C+D, bản nháp/công bố và chặng cần xác nhận. Không tự chuyển Luyện thi tùy chỉnh thành HSGQG.

Các file verification nêu trên dùng để kiểm tra; riêng file có tên `tutor_avatar_storage_setup.sql` bên dưới **là lệnh thay đổi**, không phải kiểm tra chỉ đọc.

### Auth và quyền truy cập

- Authentication → URL Configuration: Site URL `https://portal.csatoj.vn`. Chỉ thêm redirect URL thật cần cho luồng đã triển khai; dùng project thử cho URL local/Preview. Không tự thêm `/auth/callback` hay reset-password khi ứng dụng chưa có luồng đó. [Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- Gia sư hiện đăng nhập bằng mật khẩu qua Supabase Auth; hồ sơ gia sư phải liên kết đúng `auth_uid` và đang hoạt động. Kiểm tra tài khoản admin, phân công lớp, liên kết phụ huynh–học sinh trên dữ liệu được phép.
- Giữ RLS/RPC theo migration. Không tắt RLS để chữa lỗi giao diện, không cấp quyền ghi rộng cho anon/authenticated.
- Chưa cần cấu hình SMTP Supabase để gửi nhắc tháng/tư vấn: hai luồng này gọi Resend từ ứng dụng. Email mời tài khoản/khôi phục mật khẩu của Supabase Auth là luồng khác, đánh giá riêng nếu bổ sung.

## 4. Supabase Storage — avatar gia sư

Sau migration 22, chạy trên môi trường thử trước:

[database/verification/20260923_tutor_avatar_storage_setup.sql](../database/verification/20260923_tutor_avatar_storage_setup.sql).

Script tạo bucket và quyền; khi được phép production thì chạy cùng file trên project production. Không chỉ tạo bucket thủ công rồi bỏ qua policy.

| Thuộc tính | Cấu hình |
|---|---|
| ID/name | `tutor-avatars` |
| Public | `true` |
| File size limit | `204800` byte (200 KiB) |
| Allowed MIME types | `image/webp` |
| Ghi trực tiếp từ trình duyệt | Bị chặn cho anon/authenticated; upload đi qua API kiểm tra quyền |

Người dùng chọn JPG/PNG/WebP tối đa 3 MiB; máy chủ kiểm tra ảnh, xử lý 512×512 và nén trước khi tải lên bucket. Vì vậy giới hạn bucket 200 KiB khác giới hạn file đầu vào là đúng.

Public nghĩa ai có URL đều xem được ảnh; không có nghĩa ai cũng được upload/xóa. [Public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Nghiệm thu: tải/thay/gỡ ảnh qua form gia sư và admin; kiểm tra phụ huynh thấy đúng ảnh, không đọc hồ sơ ngoài liên kết; thử quyền trái phép; xác nhận ảnh cũ còn nguyên khi lưu lỗi. Verification phải có `invalid_avatar_links=0`, `anon_may_write=false`, `authenticated_may_cleanup=false`. Kiểm tra Storage/egress thực tế trong dashboard.

Đã kiểm thử local bằng môi trường giả; Storage Supabase thật còn chờ môi trường thử được phép. Hướng dẫn dọn ảnh và phục hồi: [TUTOR_PROFILES_20260923.md](TUTOR_PROFILES_20260923.md). Không thêm cron dọn ảnh.

## 5. Cron khi email đang tắt

Repository đã có `/api/cron/monthly-reviews`, lịch `0 1 28 * *` (UTC), tức 08:00 ngày 28 Việt Nam. Vercel tự đăng ký theo `vercel.json` trên deployment production; không tạo thêm lịch tương tự ở Supabase.

- Giữ email tháng tắt tại `/admin/learning` (`parent_portal_settings.email_enabled=false`). Có thể điền sẵn người nhận admin `csattutor@gmail.com` nhưng chưa bật checkbox.


- Nếu giữ cron enabled: đặt CRON_SECRET và áp dụng schema đầy đủ; luồng trả trạng thái disabled trước kiểm tra Resend khi công tắc DB tắt. Nếu chưa muốn lịch gọi, Disable Cron Jobs trong Vercel và ghi lại cần bật sau.
- Thiếu CRON_SECRET trả 401; có secret nhưng thiếu RPC/schema có thể trả 503. Đây là lỗi cấu hình cron, không phải yêu cầu phải có Gmail API.
- Không bấm Run để thử email toàn hệ thống. Sau này dùng công cụ thư mẫu riêng.
- Vercel không tự retry cron thất bại. Hobby có thể chạy trong khoảng 08:00–08:59; kiểm tra sau 09:00. [Quản lý cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [giới hạn lịch](https://vercel.com/docs/cron-jobs/usage-and-pricing).

**Chưa bật email tháng trước khi sửa hai lỗi còn mở trong migration 21**: tuổi đợt cũ làm tổng hợp admin mới tạo bị quá hạn; khôi phục lease sau gián đoạn có thể retry sớm hơn 5 phút. Xem tiêu chí sửa trong [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md).

## 6. Checklist phát hành không gửi email

- [ ] Xác nhận đúng project/branch; rà soát toàn bộ thay đổi local và commit phát hành, loại `.env`, prototype, Excel, scratch và dữ liệu thử.
- [ ] Môi trường thử dùng database riêng; migration đến 22 và bucket/policy được nghiệm thu thật.
- [ ] Kiểm thử bản cuối trên runtime lựa chọn: database/API, TypeScript, lint, production build, giao diện và upload.
- [ ] Được phép thao tác production; backup và đối chiếu trước/sau; chỉ áp dụng migration còn thiếu, tạo bucket/policy.
- [ ] Cấu hình Vercel Production như bảng; email tháng và CONSULTATIONS_EMAIL_ENABLED tắt.
- [ ] Deploy đúng commit; kiểm tra `/`, `/lo-trinh`, `/parents`, `/tutor/profile`, chi tiết gia sư admin và dữ liệu học phí/nhận xét.
- [ ] Nếu nhận form: bật CONSULTATIONS_ENABLED, Redeploy, thử yêu cầu do trung tâm quản lý; kiểm tra lưu admin dù không gửi thư.
- [ ] Ghi nhận deployment ID/commit, migration cuối, kết quả smoke test, người phụ trách vận hành và nơi lưu backup (không ghi secret).

Kết quả cũ 253 kiểm thử local đạt, TS/build đạt và browser QA đạt là bằng chứng của bản đã kiểm thử; không thay cho nghiệm thu Storage thật hoặc bản phát hành có thay đổi mới. Khi lỗi: giữ công tắc gửi tắt, rollback ứng dụng tương thích; không reset database hoặc xóa hàng đợi. Migration 22 đã chặn đường sửa giới thiệu cũ nên rollback về app cũ không khôi phục chức năng ghi hồ sơ đó.
