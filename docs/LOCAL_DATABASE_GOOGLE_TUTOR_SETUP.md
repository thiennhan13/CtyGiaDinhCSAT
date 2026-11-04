# Chạy local, cấu hình Google và chuẩn bị hồ sơ gia sư

Cập nhật04/11:19/21/22/29–32 đã áp Supabase hiện tại sau backup/phục hồi/rehearsal và kiểm lại đạt; thông tin thiếu schema bên dưới là kết quả lịch sử. Không chạy lại migration đã có. Mã Google tương thích đã deploy, smoke entry/callback đạt; chưa nghiệm thu phiên/claim thật. Lookup DB cũ bị thu hồi. Bucket/avatar và nhập hồ sơ chưa thực hiện; xem [checklist](PORTAL_DEPLOYMENT_STEP_BY_STEP.md).

Chủ trung tâm đã chốt dùng Supabase hiện tại, sao lưu về máy, giữ lớp và thông tin hiện có; chỉ xóa chốt sổ/buổi/điểm danh/phát sinh. Phạm vi và công cụ mới ở runbook; không dùng reset rộng trước đây.

Hướng dẫn thao tác theo màn hình, thứ tự SQL, điều kiện đạt từng bước và xử lý lỗi: [PORTAL_DEPLOYMENT_STEP_BY_STEP](PORTAL_DEPLOYMENT_STEP_BY_STEP.md). Ngày03/11 đã kiểm lại registry (chưa thay đổi), chuẩn bị gói18 hồ sơ/ảnh từ file chủ trung tâm gửi; xem PROJECT_STATUS và bước8 của hướng dẫn mới. Chưa ghi database/Storage.

## Trạng thái đã kiểm tra ngày 31/10/2026

Đã dùng cấu hình trên máy để kết nối PostgreSQL trong transaction READ ONLY và gọi Auth settings/Data API chỉ đọc. Cả database và Data API kết nối thành công. Đây là Supabase từ xa đang ghi trong `.env`, **không phải database chạy ở localhost**; chưa đối chiếu lại cấu hình deployment Vercel để khẳng định production đang dùng cùng project. Không áp SQL, sửa gia sư, tạo bucket hoặc reset trong lượt kiểm tra này.

| Phần | Kết quả |
|---|---|
| Registry | Có05–18,20,23–27; thiếu19,21,22,29–32;28 cũ cũng chưa có nhưng không bắt buộc cho adapter mới |
| Gia sư | 22 bản ghi; giữ nguyên ID và Supabase Auth |
| Hồ sơ | `tutor_public_profiles` mới có `tutor_id`, `introduction`, `updated_at`; chưa có RPC `save_tutor_profile` |
| Avatar | Chưa có `tutor_avatar_assets` và bucket `tutor-avatars` |
| Google | Auth settings trả `external.google=true`: provider đang bật; chưa kiểm Client ID/redirect hoặc đăng nhập thật |
| CSATOJ | Mã adapter đã có; cấu hình local chưa có instance/read key/manage key, chưa gọi OJ thật; database chưa có mapping/grants32 |

SQL kiểm tra lại, chỉ trả cấu trúc/thống kê: [google_tutor_readiness.sql](../database/verification/20261031_google_tutor_readiness.sql). Các kết quả tổng hợp này không chứng minh đã phát hành ứng dụng mới.

## Chạy ứng dụng ở local

1. Dùng Node24 theo `.nvmrc`; kiểm `node --version` phải là24.x.
2. Giữ secret trong `.env`/secret manager. File `.env.development.local` trên máy chỉ cần ghi đè:

   ```dotenv
   APP_ORIGIN="http://localhost:3000"
   ```

   Next development nạp file này trước `.env`. Nó không đổi cấu hình production build. Không đưa file env vào Git; không sao chép service key vào biến `NEXT_PUBLIC_*`.
3. Chạy `npm run dev -- --hostname localhost --port 3000`, mở `http://localhost:3000/login`. Dùng nhất quán `localhost`, không đổi qua `127.0.0.1` giữa luồng PKCE. Tắt server rồi chạy lại khi đổi env.
4. Cấu hình hiện có vẫn trỏ Supabase từ xa; thao tác Lưu trong local cũng là ghi vào project đó. Chỉ xem trước ở trạng thái hiện tại; dùng project thử riêng cho kiểm thử ghi. Chưa có Docker/Supabase CLI hoặc `supabase/config.toml` trên máy trong lượt kiểm tra này.
5. Turnstile vẫn bật. Để đăng nhập local bằng widget thật, cấu hình hostname `localhost` trong widget dành cho phát triển và dùng cặp key tương ứng. Không tắt CAPTCHA production hoặc bật Supabase CAPTCHA dùng lại token đã được ứng dụng tiêu thụ. Xem [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md).

Giao diện mới chưa thể lưu đủ hồ sơ trên schema hiện tại. Không dùng SQL UPDATE trực tiếp để bỏ qua RPC/revision.

## Chuẩn bị migration

Thứ tự theo registry đã đọc: **19 →21 →22 →29 →30 →31 →32**. Không chạy lại các file đã có, không chạy master schema hoặc28 cũ để nối OJ mới. Đọc [database README](../database/README.md) và [runbook phát hành](PORTAL_GOOGLE_GRANTS_ROLLOUT.md) trước khi thực hiện.

- 19/21 là dependency schema của22; không cần bật gửi email để có hồ sơ gia sư.
- 22 cung cấp hồ sơ đầy đủ/RPC/revision/avatar registry;31 thêm chứng chỉ nhưng cần30 trước. Không chỉ chạy31 trên schema hiện tại.
- 30 đổi quyền Google và thu hồi lookup cũ; phải phối hợp với phiên bản ứng dụng trong cửa sổ chuyển đổi. Kiểm tra chỉ đọc hiện có0 phụ huynh/nhiều liên kết và0 học sinh/nhiều liên kết; phải kiểm lại ngay trước migration. Dữ liệu phụ huynh nhiều–nhiều làm migration dừng; phải đối soát, không tự chọn một liên kết để xóa. Đợt activity reset03/11 giữ học sinh/phụ huynh/liên kết nên không được dùng để giải quyết xung đột danh tính.
- Bucket/policy avatar dùng file riêng [storage setup](../database/verification/20260923_tutor_avatar_storage_setup.sql), **file có ghi dữ liệu/cấu hình**, chỉ sau22 tại môi trường được phép. Nó không chạy tự động theo deploy.
- Chưa có môi trường thử: có thể chuẩn bị nội dung gia sư và cấu hình OAuth trước; migration/reset project đang dùng vẫn cần nghiệm thu và backup/restore theo runbook.

## Google OAuth: tạo hoặc kiểm lại client

Provider đang bật nên trước tiên mở Supabase Dashboard → Authentication → Sign In / Providers → Google để xem cấu hình đang dùng. Nếu đã có OAuth client đúng, kiểm/sửa client đó; không bắt buộc đăng ký lại.

Nếu chưa có client thuộc quyền quản lý của trung tâm:

1. Vào [Google Cloud Console](https://console.cloud.google.com/), chọn/tạo project của CSAT. Mở Google Auth Platform.
2. **Branding:** tên ứng dụng CSAT Portal, email hỗ trợ và email liên hệ quản trị; khai homepage/chính sách theo yêu cầu của console bằng URL thực do trung tâm sở hữu. Không điền URL chính sách chưa tồn tại.
3. **Audience:** External để phụ huynh dùng Gmail cá nhân. Trong giai đoạn Testing, thêm Gmail của người thử vào Test users. Khi mở cho phụ huynh rộng rãi, chuyển Publishing status sang In production và hoàn thành yêu cầu xác minh Google hiển thị nếu có.
4. **Data Access:** chỉ cần `openid`, `userinfo.email`, `userinfo.profile`; không yêu cầu quyền Drive/Gmail hoặc dữ liệu học tập Google.
5. **Clients → Create client → Web application.** Authorized JavaScript origins: `http://localhost:3000` cho client thử, và origin Portal thật cho client production. Tách client thử/production khi triển khai môi trường thử riêng.
6. **Authorized redirect URIs:** sao chép chính xác Callback URL từ Google provider của Supabase, dạng `https://<project-ref>.supabase.co/auth/v1/callback`. Đây là callback Google → Supabase; không điền `/auth/callback` của Next vào ô này. Nếu dùng Supabase local stack thật thì callback là `http://127.0.0.1:54321/auth/v1/callback`; trường hợp hiện tại đang dùng Supabase hosted.
7. Tạo client, lưu Client ID và Client Secret vào **Supabase Google provider** rồi bật/lưu. Không cần đặt Google Client Secret vào Vercel hoặc frontend. Không gửi secret qua chat.

Theo [hướng dẫn Google của Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) và [OAuth web server của Google](https://developers.google.com/identity/protocols/oauth2/web-server).

## Supabase và Vercel: callback về Portal

Supabase → Authentication → URL Configuration:

- **Site URL:** origin Portal chính thức, chẳng hạn `https://portal.csatoj.vn` nếu đây là tên miền đang phục vụ. Khi dùng project thử riêng, đặt origin thử của project đó.
- **Redirect URLs:** thêm chính xác `http://localhost:3000/auth/callback` để chạy local; thêm `https://portal.csatoj.vn/auth/callback` cho Portal chính thức sau khi xác minh tên miền. Preview dùng URL cụ thể và project thử; không wildcard production.

Vercel: runtime Node24; `APP_ORIGIN` là origin tương ứng môi trường, không có dấu `/` cuối; Supabase URL/anon key/service role đúng cùng project; Turnstile đúng hostname. Giữ CSATOJ tắt đến khi đủ cấu hình và nghiệm thu. Thay env Vercel cần redeploy để có hiệu lực.

Hai callback phục vụ hai chặng khác nhau:

```text
Portal /login → Supabase → Google
Google → Supabase /auth/v1/callback
Supabase → Portal /auth/callback → /parents
Phụ huynh nhập số → DB claim thành công → quyền xem một học sinh
```

Theo [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). Google provider bật chưa chứng minh callback đúng; nghiệm thu sau migration30 và ứng dụng tương thích.

## Liên kết phụ huynh và CSATOJ

Sau chuyển đổi: admin tạo học sinh và hồ sơ phụ huynh đúng số. Phụ huynh đăng nhập Google, nhập số0/+84/0084 tương đương; database tự cấp một liên kết khi khớp. Google khác nhận số đã có chủ trả lỗi, không chuyển quyền. Admin sửa/chuyển/khóa cần revision và lý do. Google xác thực Gmail, không xác minh sở hữu số tự nhập.

OJ là bước riêng: quản trị OJ cấp instance ID, read key và manage key riêng; cấu hình server `CSAT_OJ_ORIGIN`, `CSAT_OJ_INSTANCE_ID`, `CSAT_OJ_READ_KEY`, `CSAT_OJ_MANAGE_KEY`. Sau schema32 và nghiệm thu mới bật `CSAT_OJ_ENABLED=true`. Admin OJ tạo mã tài khoản học sinh; admin Portal vào `/admin/oj`, chọn học sinh và đổi mã. Timeout dùng đối soát receipt cùng UUID. Admin/gia sư gắn organization ID cho lớp và contest ID cho buổi. Xem [hợp đồng/tích hợp OJ](CSATOJ_INTEGRATION.md).

## Chuẩn bị thông tin gia sư ngay

Mẫu trống trên máy nằm trong `scratch/tutor-profile-preparation/profiles.csv` (ngoài Git). Đây là bảng thu thập nội dung, **chưa có chức năng import CSV tự động**. Mỗi dòng một gia sư, giữ tutor ID hiện có; có thể tra ID từ trang chi tiết admin khi được phép. Không tạo lại Auth hoặc tutor để cập nhật hồ sơ.

| Cột | Cách chuẩn bị |
|---|---|
| `tutor_id`, `name_reference` | ID hiện có và tên để đối chiếu; tên tham chiếu không tự đổi tên đăng nhập |
| `university`, `major` | Trường và ngành, mỗi trường tối đa200 ký tự |
| `achievements` | Mỗi thành tích một dòng trong cùng ô; tổng tối đa2.000 ký tự |
| `certificates` | Mỗi chứng chỉ một dòng trong cùng ô; tổng tối đa2.000 ký tự |
| `introduction` | Nội dung thật, tối đa2.000 ký tự; khuyến nghị2–4 câu |
| `background` | Nội dung nền ngoại lệ nếu cần, tối đa300 ký tự; chỉ admin sửa |
| `avatar_file_reference` | Tên file ảnh trên máy để chuẩn bị, không phải URL/path ghi thẳng vào DB |

Trong Excel, dùng Alt+Enter cho nhiều mục trong một ô; giữ định dạng CSV UTF-8 khi lưu. Dữ liệu đã điền chứa hồ sơ thật, chỉ lưu kho nội bộ; không commit hoặc gửi vào CI. Không tự tạo thành tích/chứng chỉ/giới thiệu thay gia sư.

Khi schema và Storage sẵn sàng: admin vào `/admin/tutors` → chọn gia sư → sửa hồ sơ, hoặc gia sư vào `/tutor/profile`. Nhập nội dung từ bảng rồi Lưu qua form để giữ revision/audit. Mục trống được ẩn; phụ huynh tải lại trang để thấy bản đã lưu. Avatar upload qua form; chứng chỉ chỉ nhập văn bản, chưa upload tài liệu. Xem [quy tắc hồ sơ](TUTOR_PROFILES_20260923.md).
