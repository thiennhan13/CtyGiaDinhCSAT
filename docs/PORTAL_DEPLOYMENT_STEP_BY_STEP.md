# Triển khai Portal: từng bước từ cấu hình đến nhập hồ sơ

## Việc cần hoàn thành sau push04/11

Google OAuth đã được chủ trung tâm cấu hình với Supabase. Kiểm chỉ đọc04/11 xác nhận provider bật, schema đến32 và quyền/ràng buộc đạt. Mã tương thích đã commit/push/deploy; tên miền chính có Google entry/callback, kiểm không Auth/CAPTCHA đạt. Chủ trung tâm đã thử Google → nhập số → thấy đúng học sinh trên production. Còn kiểm refresh/logout/đăng nhập lại, Gmail thứ hai bị từ chối cùng số và chuyển/khóa quyền; OJ/Storage vẫn cần nghiệm thu. Không chạy lại migration hoặc reset. Bằng chứng ở [PROJECT_STATUS](PROJECT_STATUS.md).

Mã cập nhật entry tiếp tục phiên đã lưu khi mở lại `/login`; kiểm sau deploy bằng browser thường trên cùng hostname: đóng/mở lại, vào Trang liên lạc phải về `/parents` mà không cần Google/CAPTCHA mới; bấm Đóng tra cứu rồi vào lại phải thấy form. Phiên còn hợp lệ hoặc refresh được mới tiếp tục; xóa cookie/thu hồi phiên cần đăng nhập lại. Nút mới là **Đăng nhập bằng Google**, icon Google, cao tối thiểu64px, phía trên Cloudflare; CAPTCHA vẫn phải hoàn tất trước khi nút hoạt động.

1. **Kiểm deployment mới:** Vercel project `cty-gia-dinh-csat`, Production branch `main`, domain `portal.csatoj.vn`. Chọn deployment đúng commit và đợi Ready; Node.js24 theo engines. `/login` phải có “Tiếp tục với Google”; `/auth/callback` thiếu code phải chuyển về `/login?error=google`, không404. Không đổi project Supabase khi redeploy.
2. **Kiểm ba địa chỉ đăng nhập:** Vercel Production `APP_ORIGIN=https://portal.csatoj.vn`; Supabase Authentication → URL Configuration: Site URL `https://portal.csatoj.vn`, Redirect URLs có chính xác `https://portal.csatoj.vn/auth/callback`; Google Web client có Authorized redirect URI `https://bndjvzrssogwdhoumvgb.supabase.co/auth/v1/callback`. Google Client Secret chỉ nằm trong Supabase provider. Nếu sửa env Vercel, redeploy để có hiệu lực. Đối chiếu [Google provider](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) và [redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).
3. **Thử phụ huynh thật có kiểm soát:** mở `/login`, giải CAPTCHA, chọn Google, phải về `/parents` và thấy bước nhập số. Nhập số đã có trong hồ sơ phụ huynh; kiểm đúng một học sinh, đổi tháng/lớp, refresh rồi đăng xuất. Gmail thứ hai dùng cùng số phải báo đã liên kết, không tiết lộ Gmail/con. Admin xem trạng thái ở `/admin/parents`; không tự chuyển quyền để thử. Kiểm tài khoản gia sư/admin cũ vẫn vào đúng khu vực. Khi Google client còn Testing, Gmail thử phải thuộc Test users; mở Audience phù hợp trước khi mời phụ huynh rộng rãi.
4. **Hoàn thiện ảnh/hồ sơ gia sư:** hiện0 profile và chưa có bucket/policy. Chạy riêng [avatar storage setup](../database/verification/20260923_tutor_avatar_storage_setup.sql) trên đúng project trong phạm vi được phép, rồi [verification profile/avatar](../database/verification/20260923_tutor_profiles.sql). Nghiệm thu upload/thay/gỡ, lỗi giữ ảnh cũ, quyền/revision. Sau đó nhập10 hồ sơ đã khớp và ảnh từ gói nội bộ qua admin. Giữ nguyên8 hồ sơ chờ admin, không tạo Auth/đổi email tự động. Chi tiết bước8 bên dưới.
5. **Cấu hình CSATOJ:** adapter đã có nhưng chưa có mapping/instance/read/manage trong cấu hình local đã kiểm. Quản trị OJ cấp instance UUID và hai key riêng; đặt server env `CSAT_OJ_ORIGIN`, `CSAT_OJ_INSTANCE_ID`, `CSAT_OJ_READ_KEY`, `CSAT_OJ_MANAGE_KEY`, rồi bật `CSAT_OJ_ENABLED=true` và redeploy sau nghiệm thu. Admin dùng `/admin/oj` đổi mã, gắn organization lớp/contest buổi; thử một lớp/hai contest và thu hồi grant. Không gửi key qua chat. Xem bước6 và [hợp đồng OJ](CSATOJ_INTEGRATION.md).
6. **Pilot nghiệp vụ:** tạo buổi mới, đối soát roster, điểm danh, công bố nhận xét/lộ trình; admin chốt đúng kỳ, gia sư thu toàn bộ dư nợ hợp lệ, phụ huynh/admin đọc cùng ledger. Không dùng kỳ/hồ sơ thật để thử hoàn/đảo hoặc tạo khoản giả. Theo dõi mã lỗi, không log phone/token/mã OJ. Email phụ huynh và thanh toán ngân hàng nằm ngoài phạm vi.

Các bước lịch sử bên dưới giải thích dựng môi trường và chuỗi migration; không phải yêu cầu chạy lại trên Supabase hiện tại. Provider bật/build xanh/deployment Ready chưa thay nghiệm thu tài khoản và dữ liệu thật.

## Đang ở đâu — kiểm ngày 03/11/2026

Quyết định mới nhất: dùng Supabase hiện tại; sao lưu về máy, giữ lớp/cấu hình/thành viên/đơn giá/giáo trình lớp và mọi hồ sơ, chỉ xóa chốt sổ/buổi/điểm danh/phát sinh. Kế hoạch xóa rộng trước đó hết hiệu lực; xem [runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md).

Đã áp19/21/22/29/30/31/32 trên Supabase hiện tại03/11 sau backup/phục hồi/rehearsal; không chạy lại. Google provider bật nhưng ứng dụng mới chưa deploy/nghiệm thu đăng nhập. OJ chưa cấu hình instance/read/manage key. Deploy Vercel không tự chạy SQL. Đã thực hiện activity reset giữ lớp ngày03/11 sau backup/phục hồi80 bảng; migration thực hiện ở đợt riêng sau đó; chưa upload hoặc cập nhật hồ sơ thật.

File 18 gia sư đã được tách thành gói nội bộ trong `scratch/tutor-profile-preparation/20261103/`: đủ18 hồ sơ/ảnh;10 khớp tên/email. Chủ trung tâm xác nhận7 hồ sơ mới và yêu cầu **chưa nhập các tài khoản chưa khớp, để admin xử lý sau**; cả7 người mới và1 hồ sơ cần xác minh danh tính được giữ chờ. Các mã GS trong nguồn không thay tutor ID của Portal. Xem bước8 để nhập nhóm đã khớp khi đủ điều kiện.

## Bước 1 — Xác định Supabase hiện tại; môi trường thử cho tính năng

**Bạn thao tác:**

1. Mở Vercel → project Portal → Settings → Environment Variables. Xem `NEXT_PUBLIC_SUPABASE_URL` của Production để xác định project thật đang dùng; ghi project ref vào biên bản nội bộ. Không gửi secret qua chat. `.env` trên máy không chứng minh đích production.
2. Mở Supabase Dashboard, chọn đúng project theo ref đó; chạy truy vấn chỉ đọc:

   ```sql
   SELECT version FROM csat_internal.schema_migrations ORDER BY version;
   ```

3. Nếu cần nghiệm thu tính năng Google/OJ/Storage tách biệt, tạo project Supabase thử **riêng, trống**, chẳng hạn CSAT Portal Test. Lưu mật khẩu database trong nơi quản lý secret. Không dùng dữ liệu học sinh/gia sư thật làm fixture ở project thử.
4. Ghi riêng Project URL, anon key và service role của project thử. Chỉ service role ở server; không ghi vào `NEXT_PUBLIC_*`. Xem [setup](SETUP_VERCEL_SUPABASE.md) khi dashboard hiển thị nhiều loại key.

**Đạt khi:** xác định đúng project đang dùng, không dùng nhầm key. Quyết định mới03/11: dùng Supabase hiện tại, giữ lớp/thông tin, chỉ xóa chốt sổ/buổi/điểm danh/phát sinh sau backup đã phục hồi thử về máy; không bắt buộc tạo Supabase mới cho thao tác này. Các bước2–7 dưới đây là nhánh nghiệm thu tính năng, không phải yêu cầu phải tạo lại database hiện có.

## Bước 2 — Dựng schema trên Supabase thử trống

Supabase thử → SQL Editor → New query. Mở file SQL trong repo, sao chép toàn bộ nội dung vào query rồi Run. Mỗi file chạy riêng; lỗi thì dừng, không bỏ qua precondition.

1. Chạy [CSAT_master_schema.sql](../database/CSAT_master_schema.sql) **một lần, chỉ trên project thử trống**. Baseline này đến10.
2. Chạy từng migration11 →27 trong [thư mục migrations](../database/migrations), tăng dần theo số cuối tên file.
3. Bỏ28 cũ; chạy29 →30 →31 →32. Adapter mới không cần28.
4. Chạy [avatar storage setup](../database/verification/20260923_tutor_avatar_storage_setup.sql). Đây là SQL có ghi bucket/policy. Chỉ dùng sau22 ở project được phép.
5. Chạy [kiểm tra Google/gia sư](../database/verification/20261031_google_tutor_readiness.sql) và [kiểm tra profile/avatar](../database/verification/20260923_tutor_profiles.sql).

**Đạt khi:** registry có30/31/32 cùng dependency19/21/22/29; có cột `certificates`, RPC `save_tutor_profile`, bảng identity/grants và bucket `tutor-avatars`. `invalid_avatar_links=0`; quyền ghi/cleanup không bị mở cho anon. Xem [database README](../database/README.md) nếu registry khác dự kiến.

## Bước 3 — Đăng ký Google OAuth

Google provider của project đang cấu hình đã bật. Nếu trung tâm quản lý được OAuth client hiện có, kiểm lại client đó; không cần tạo trùng. Project thử nên có client thử riêng.

1. Mở [Google Cloud Console](https://console.cloud.google.com/), chọn/tạo project của trung tâm.
2. Vào **Google Auth Platform → Branding**. Điền tên CSAT Portal, email hỗ trợ và email quản trị. Khi console yêu cầu website/chính sách, dùng URL thực đã công bố của trung tâm.
3. Vào **Audience → External**. Khi đang Testing, thêm Gmail thử trong Test users. Chỉ chuyển sang In production khi sẵn sàng mở cho phụ huynh; hoàn thành yêu cầu xác minh mà Google hiển thị nếu có.
4. Vào **Data Access**: dùng `openid`, `userinfo.email`, `userinfo.profile`. Không cần quyền Gmail/Drive.
5. Vào **Clients → Create client → Web application**.
6. **Authorized JavaScript origins** của client thử: `http://localhost:3000`; thêm origin Preview cố định nếu sử dụng. Client production dùng origin tên miền Portal thật.
7. Mở Supabase project thử → Authentication → Sign In / Providers → Google; sao chép **Callback URL**. Dán nguyên URL đó vào **Authorized redirect URIs** của Google, thường là `https://<project-ref-thử>.supabase.co/auth/v1/callback`.
8. Create. Lưu Client ID và Client Secret vào **Google provider trong Supabase project thử**, bật provider và Save. Không đặt Google Client Secret vào frontend/Vercel.

**Đạt khi:** OAuth client Web đúng project, callback Google trỏ Supabase đúng ref. [Tài liệu Supabase Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Bước 4 — Cho phép callback về local và chuẩn bị CAPTCHA

Supabase thử → Authentication → URL Configuration:

| Trường | Giá trị cho local |
|---|---|
| Site URL | `http://localhost:3000` nếu project thử hiện chỉ dùng local |
| Redirect URLs | Thêm chính xác `http://localhost:3000/auth/callback` |

Nếu sử dụng Preview cố định, thêm đúng `<ORIGIN_PREVIEW>/auth/callback`; khi chuyển Site URL sang Preview, vẫn giữ callback local trong allowlist. Production giữ Site URL là origin chính thức và callback chính xác; không dùng wildcard production.

**Hai URL cần phân biệt:** Google Console nhận `...supabase.co/auth/v1/callback`; Supabase Redirect URLs nhận `...Portal/auth/callback`. [Quy tắc Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

Cloudflare Turnstile: tạo/chọn widget dành cho phát triển, cho phép hostname `localhost`, lấy Site Key/Secret Key của widget đó. Giữ bật kiểm tra ở bước đăng nhập; không dùng lại token ở Supabase CAPTCHA. Hướng dẫn cụ thể ở [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md).

## Bước 5 — Chạy local bằng Supabase thử

1. Kiểm `node --version` là24.x. Mở terminal tại thư mục repo.
2. Trong `.env.development.local` ngoài Git, đặt các biến dưới đây bằng giá trị **project thử**. Nếu file đang có nội dung khác, giữ và chỉnh đúng biến, không ghi đè toàn bộ:

   ```dotenv
   APP_ORIGIN="http://localhost:3000"
   NEXT_PUBLIC_SUPABASE_URL="<PROJECT_URL_THỬ>"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY_THỬ>"
   SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_THỬ>"
   TURNSTILE_LOGIN_ENABLED="true"
   TURNSTILE_SITE_KEY="<SITE_KEY_LOCAL>"
   TURNSTILE_SECRET_KEY="<SECRET_KEY_LOCAL>"
   CSAT_OJ_ENABLED="false"
   CONSULTATIONS_EMAIL_ENABLED="false"
   PORTAL_MAINTENANCE="false"
   ```

3. Chạy `npm ci`, sau đó `npm run dev -- --hostname localhost --port 3000`.
4. Mở `http://localhost:3000/login`. Giữ nguyên hostname `localhost` trong toàn luồng, không đổi sang127.0.0.1.
5. Thử Google bằng Gmail đã thêm trong Test users. Phải trở về `/parents`; tài khoản chưa liên kết hiện bước nhập số, không tự có quyền gia sư.

**Đạt khi:** CAPTCHA hoạt động, Google quay đúng callback, refresh và logout đúng. Muốn thử nghiệp vụ admin, dùng tài khoản admin thử được cấp role từ dữ liệu Auth do quản trị kiểm soát theo [setup tài khoản](SETUP_VERCEL_SUPABASE.md), không cấp role từ metadata người dùng tự sửa.

## Bước 6 — Nối OJ trên môi trường thử

1. Quản trị OJ chuẩn bị instance thử, read key và manage key riêng theo [hợp đồng OJ](CSATOJ_INTEGRATION.md). Không dùng global sync key.
2. Đặt server env `CSAT_OJ_ORIGIN` (HTTPS origin), `CSAT_OJ_INSTANCE_ID`, `CSAT_OJ_READ_KEY`, `CSAT_OJ_MANAGE_KEY` cho local/Preview thử; sau khi đủ cấu hình đặt `CSAT_OJ_ENABLED=true`, khởi động lại ứng dụng.
3. Admin tạo học sinh giả tại Portal. Admin OJ tạo mã kết nối của tài khoản học sinh thử đó.
4. Portal → `/admin/oj` → chọn đúng học sinh → nhập mã. Nếu timeout, dùng đối soát receipt cùng thao tác; không đổi mã/lặp yêu cầu mới để thử mù.
5. Gắn organization ID cho lớp và hai contest ID cho buổi theo UI/quyền. Dùng phụ huynh thử đã liên kết để xem số bài, contest, hạng và tình trạng grant.

**Đạt khi:** admin/phụ huynh thấy cùng tài khoản; thu hồi grant làm mất dữ liệu OJ; OJ lỗi vẫn đọc được phần Portal. Không chạy test quota/thử lỗi bằng tài khoản học sinh thật.

## Bước 7 — Nghiệm thu thử và chuẩn bị phát hành

Kiểm một lớp giả/hai contest; một Google nhận đúng số; Google khác bị từ chối cùng số; chuyển/khóa thu hồi quyền cũ. Tạo gia sư giả, lưu thành tích/chứng chỉ, upload → thay → gỡ ảnh; kiểm revision và quyền sửa. Thử thu đủ dư nợ, request lặp và đổi gia sư. Chạy bộ kiểm local trong [runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md).

Vercel Preview dùng project thử; Settings → Environment Variables → Preview, đặt env tương ứng, `APP_ORIGIN` khớp origin Preview; Node24. Google/Supabase/Turnstile phải cho phép đúng origin/hostname của Preview. Kiểm lại deployment sau mỗi thay đổi env; không giả `VERCEL_ENV`.

**Đạt khi:** có bằng chứng nghiệp vụ và Storage thật trên môi trường thử. Test local xanh hoặc provider đã bật không thay bước này.

## Bước 8 — Đối chiếu và nhập 18 gia sư thật

Gói đã chuẩn bị trên máy: `scratch/tutor-profile-preparation/20261103/` (ngoài Git).

1. Mở `review.private.html`: xem18 ảnh/nội dung và trạng thái ghép từng người. `profiles-filled.private.csv` là bảng đã điền; `profile-inputs.private.json` là gói hồ sơ không chứa liên hệ riêng.
2. `profiles-ready-10.private.csv` chứa10 hồ sơ khớp tên/email. `profiles-deferred-8.private.csv` chứa8 hồ sơ chủ trung tâm yêu cầu chưa nhập:7 người đã xác nhận là gia sư mới và1 tên khớp nhưng email không khớp. Không tự tạo Auth, nhập hồ sơ, đổi email/tutor ID hoặc gắn ảnh cho8 người này; admin xử lý sau.
3. Nội dung theo file:15 đại học,3 để trống; IELTS được chuyển vào chứng chỉ. Không có phần giới thiệu riêng nên để trống. Background dùng trường THPT nguồn, không tự coi tất cả là cựu học sinh chuyên Phan. Ghi chú nguồn và liên hệ không được công bố trong thẻ phụ huynh.
4. Sau khi production đã có migration/profile API/bucket tương thích: đăng nhập admin → `/admin/tutors` → chọn đúng gia sư → phần hồ sơ. Chỉ nhập nhóm10 đã khớp từ CSV, chọn ảnh tương ứng trong `avatars/`, Lưu. Không có chức năng import JSON/CSV hàng loạt trong bản hiện tại.
5. Lưu từng người xong, tải lại để kiểm; có xung đột thì tải bản đã lưu và đối chiếu, không ép revision cũ. Xem một thẻ phụ huynh được phép và xác nhận không có liên hệ riêng.

**Đạt khi:** nhóm10 đã khớp được nhập đúng ID, ảnh upload qua registry, nội dung lưu thành công;8 hồ sơ còn lại giữ chờ admin đúng quyết định. Hiện cả gói chỉ ở trạng thái chuẩn bị, chưa ghi database/Storage. Nội dung công khai `/gia-su` là catalog khác; không tự ghi đè thành tích marketing từ hồ sơ này.

## Bước 9 — Production: cửa sổ chuyển đổi riêng

Chỉ sau nghiệm thu thử. Đọc [runbook chuyển đổi/reset](PORTAL_GOOGLE_GRANTS_ROLLOUT.md) trước thao tác; phần dưới không thay backup/restore hoặc cấp quyền reset.

1. Xác nhận project/ref từ deployment production; backup và thử phục hồi vào đích riêng. Backup database không chứa byte tệp Storage; có ảnh thì cần bản sao Storage riêng. [Supabase backups](https://supabase.com/docs/guides/platform/backups).
2. Chuẩn bị deployment tương thích có bảo trì `PORTAL_MAINTENANCE=true`; khi bắt đầu cửa sổ chuyển đổi, chặn ghi và dừng writer/cron bên ngoài. Kiểm503 thực tế, không chỉ nhìn env. Mã production cũ chưa có cờ này thì phải kích hoạt bản tương thích trước khi tin rằng đã bảo trì.
3. Đợt làm sạch được chủ trung tâm chốt03/11 giữ nguyên lớp và toàn bộ hồ sơ/liên kết/cấu hình; chỉ xóa chốt sổ/buổi/điểm danh/phát sinh bằng công cụ activity reset và backup đã phục hồi thử. Không dùng công cụ xóa rộng cũ hoặc reset để thêm18 gia sư. Xem runbook hiện hành; thao tác này độc lập phát hành Google/grants.
4. Các file dưới đây **đã áp trên Supabase hiện tại03/11**. Chỉ dùng danh sách để đối chiếu môi trường khác; không chạy lại file đã có. Dừng ngay khi lỗi và kiểm registry thật:

   | Thứ tự | File |
   |---|---|
   | 1 | [19_email_operations](../database/migrations/20260914_19_email_operations.sql) |
   | 2 | [21_parent_email_completion](../database/migrations/20260922_21_parent_email_completion.sql) |
   | 3 | [22_tutor_profiles](../database/migrations/20260923_22_tutor_profiles.sql) |
   | 4 | [29_login_identity_budget](../database/migrations/20261024_29_login_identity_budget.sql) |
   | 5 | [30_parent_google_identity](../database/migrations/20261031_30_parent_google_identity.sql) |
   | 6 | [31_profiles_and_tutor_receipts](../database/migrations/20261031_31_profiles_and_tutor_receipts.sql) |
   | 7 | [32_oj_account_grants](../database/migrations/20261031_32_oj_account_grants.sql) |

5. Chạy riêng bucket/policy avatar, verification SQL; cấu hình Google/Supabase redirect/Turnstile/OJ đúng production; deploy đúng mã đã nghiệm thu, Node24. Giữ email tắt.
6. `PORTAL_MAINTENANCE=true` chặn cả admin và Auth, nên không thể nhập hồ sơ hoặc thử Google qua UI trong trạng thái đó. Sau kiểm cấu trúc đạt, chuyển false/redeploy trong cửa sổ mở có người giám sát, thực hiện pilot ngay rồi nhập dữ liệu qua admin. Nếu lỗi, bật lại bảo trì; dùng quy trình phục hồi đã thử, không mở lookup cũ.
7. Kiểm Google/claim, học sinh/OJ, nhóm hồ sơ/ảnh được phép nhập, thu tiền/phân quyền; giữ8 hồ sơ chờ admin. Theo dõi mã lỗi/số lượng, không log số điện thoại/token/mã OJ.

**Đạt khi:** nghiệm thu môi trường thật và pilot đạt; khi đó mới ghi nhận đã phát hành. Chưa thực hiện bước production nào trong lượt chuẩn bị tài liệu/gói hồ sơ này.

## Gặp lỗi thì kiểm ở đâu?

| Hiện tượng | Kiểm tra |
|---|---|
| `redirect_uri_mismatch` | Callback URI trong Google phải đúng Supabase project ref và `/auth/v1/callback` |
| Google trả về nhầm domain | `APP_ORIGIN`, Supabase Redirect URLs và cookie cùng hostname |
| Google báo access blocked khi Testing | Đúng Gmail trong Test users, đúng OAuth client |
| CAPTCHA không sẵn sàng | Cặp key/hostname/action, không tắt kiểm tra để thử tiếp |
| Đăng nhập503 trước khi mở Google | Migration29/30, budget RPC, key server và cấu hình CAPTCHA |
| “Hồ sơ đang chờ cập nhật database” | Migration19/21/22/30/31 và schema cache; không ghi bảng trực tiếp |
| Avatar không lưu được | Bucket/policy, service key server-only, RPC/registry và giới hạn ảnh |
| OJ chưa kết nối/503 | Migration32, instance/origin/read/manage key, quota và receipt pending |
