# Chuyển CSAT Portal sang Google và CSATOJ grants

Mã gồm migration30–32, OAuth/claim, dữ liệu OJ accounts, chứng chỉ gia sư, thu toàn bộ dư nợ và công cụ reset. Đã áp19/21/22/29–32 trên Supabase hiện tại03/11 sau backup/phục hồi/rehearsal; mã tương thích đã deploy04/11, smoke Google entry/callback đạt. Phiên/claim Google, OJ/Storage thật còn chờ nghiệm thu. Activity reset giữ lớp đã chạy trước đó. Bằng chứng và các cổng nghiệm thu ở [PROJECT_STATUS](PROJECT_STATUS.md); thao tác còn lại ở [checklist sau deploy](PORTAL_DEPLOYMENT_STEP_BY_STEP.md).

[Hướng dẫn thao tác từng bước](PORTAL_DEPLOYMENT_STEP_BY_STEP.md) dùng cho người vận hành: tạo project thử, chạy SQL theo registry, cấu hình Google/Supabase/Vercel/OJ và nhập gói18 hồ sơ đã chuẩn bị. Không bỏ qua cổng nghiệm thu/backup/restore của runbook này.

Chủ trung tâm đã xác nhận chưa có môi trường thử, ưu tiên hoàn thiện mã và hướng dẫn. Các bước cấu hình tài khoản thật, nghiệm thu Supabase/OJ, backup/restore production và reset dưới đây là checklist thực hiện khi có môi trường; chưa được đánh dấu đạt.

Ngày03/11 đã áp đủ19/21/22/29–32 trên project hiện tại; Google provider bật nhưng chưa đăng nhập thật. Website công khai vẫn form phone/callback404 tại lần kiểm, nên cần deploy ứng dụng tương thích sau chuyển đổi quyền DB. Hướng dẫn thao tác Google Cloud/Supabase/Vercel, chạy local và chuẩn bị nội dung gia sư ở [LOCAL_DATABASE_GOOGLE_TUTOR_SETUP](LOCAL_DATABASE_GOOGLE_TUTOR_SETUP.md); kết quả môi trường ở PROJECT_STATUS. Không suy trạng thái deployment từ file env trên máy.

## Kiểm tra local có thể chạy ngay

Dùng Node.js 24 (`node --version`), cài dependency theo lockfile của root và `database/tests`. Chạy `npm run check:repo`, `npm run test:repo`, `npm run test:db`, `npm run typecheck`, `npm run lint:strict`, `npm run build`. Suite database giới hạn hai file đồng thời để tránh nhiều PGlite/PostgreSQL tranh RAM trên Windows; các ca tranh chấp vẫn chạy nhiều connection thật trong từng test.

`node scripts/run-oj-ui.cjs` mở Edge headless và Next loopback với transport giả, chặn request browser ra ngoài origin kiểm thử; không cần Google hoặc secret thật. Kiểm đổi mã, hạng/thu hồi, không polling, onboarding phone, thu tiền, chứng chỉ và responsive; ảnh/log ở `scratch/oj-ui`, không đưa vào Git/runtime. PostgreSQL native dùng fixture riêng để kiểm concurrent claims/receipts/grants và phục hồi sau reset; không trỏ test vào database thật.

## Thứ tự triển khai và hợp đồng

1. Đọc registry thật của môi trường đích. Baseline master chỉ đến10; dựng Supabase thử trống rồi áp11–29 theo precondition, tiếp theo30 →31 →32. Migration28 cũ là tùy chọn;32 thu hồi các RPC cũ nếu tồn tại. Không chạy master/gói upgrade trên database có dữ liệu.
2. Migration30 cưỡng chế một parent/một student và tạo `parent_identity_links`. Nhiều–nhiều hiện hữu phải được đối soát hoặc reset đã được duyệt trước30; migration tự dừng thay vì chọn đại một con. `admin_save_student` và `admin_save_parent` đồng bộ số trong transaction, revision/audit; form và API học sinh đều gọi RPC, không dùng service role ghi bảng trực tiếp. API update/delete yêu cầu revision; delete là ẩn hồ sơ, giữ lịch sử và khóa quyền phụ huynh. Import cũ dùng chung khóa claim và unique; bản xem trước chặn số xuất hiện ở nhiều học sinh dù cùng tên phụ huynh. Phone chuẩn trong `parent_accounts` là nguồn quyền; không so đuôi số.
3. `POST /api/parents/auth` kiểm Origin, CAPTCHA và budget rồi bắt đầu Google OAuth qua Supabase SSR/PKCE. `/auth/callback` đổi code, redirect cố định `/parents`; lỗi về `/login?error=google`. Proxy làm mới phiên, logout kết thúc phiên local. Không gán role mới; staff role hiện có vẫn giữ.
4. `POST /api/parents/link` chỉ nhận phone. `claim_parent_phone` kiểm Google trong metadata do Auth quản lý, chuẩn hóa 0/+84/0084, khóa transaction, trả lại liên kết cũ khi cùng chủ. `PHONE_ALREADY_LINKED` trả409, không lộ email/con. `LINK_BLOCKED` không thể tự mở khóa. Parent đọc qua `parent_portal`, chuyên đề và API OJ từ quyền DB hiện hành. Token lookup cũ không còn quyền.
5. Admin đổi/chặn liên kết tại quản lý phụ huynh: email phải thuộc tài khoản đã đăng nhập Google, revision và lý do bắt buộc. Thay Auth UID trong cùng transaction, không hợp nhất/xóa Auth. Trang quản lý hiện đồng thời hiện học sinh, phone, email Google, username/profile/state OJ.
6. Migration31 thêm `certificates`, giữ giá trị khi client cũ không gửi trường. Thành tích/chứng chỉ: mỗi dòng một mục, tối đa2000 ký tự; trường đại học200; giới thiệu2000. Lưu hiển thị ngay qua read model; chỉ admin sửa thông tin nền. Không upload chứng chỉ.
7. Migration31 bổ sung `/tutor/payments` và RPC thu tiền: chỉ chứng từ có billing items, xác định lớp thuộc phân công hiện hành, toàn bộ dư nợ dương. Khóa chung với nghiệp vụ lớp/kế toán; expected balance, request UUID và actor chống trùng. Đổi gia sư thu hồi quyền thu của người cũ, giữ ledger. Admin vẫn chốt, đính chính, hoàn và đảo; parent/admin đọc cùng ledger.
8. Migration32 tách mapping student/organization/contest; grant revision OJ khác local revision. Adapter server-only gọi exchange/receipt/accounts, không gọi bindings/parent-batch. Roster lịch sử và grant peers chỉ có ở service RPC sau xác thực actor, không đưa ra parent browser. Thiếu lịch sử roster hoặc grant làm roster không đầy đủ.

## Cấu hình Google

Theo [Supabase Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) và [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking):

- Google Cloud: OAuth client Web, consent screen và tài khoản thử cho project thử; Authorized redirect URI là callback do Supabase provider hiển thị (`https://<project-ref>.supabase.co/auth/v1/callback`). Client ID/secret nhập trong Supabase Google provider, không đưa vào frontend hoặc repo.
- Supabase: bật Google, Site URL là origin Portal chính xác, Redirect URLs cho `<APP_ORIGIN>/auth/callback`. Preview dùng project thử và URL cụ thể đã cho phép, không wildcard production.
- Vercel: Node24, `APP_ORIGIN`, Supabase URL/anon key và service key server-only; Turnstile site/secret/hostname/action theo [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md). Không thêm CAPTCHA vào bước claim phone.
- Nghiệm thu mới/cũ, hủy callback, code hết hạn, refresh/logout; Google có email trùng Auth admin/gia sư phải giữ role/phân công. Không dùng metadata người dùng tự sửa để cấp vai trò. Google không xác minh phone tự khai; SEC-02 còn mở theo quyết định sản phẩm.

## Cấu hình và vận hành OJ

Đọc docs repo OJ theo thứ tự `PORTAL_HANDOFF.md` → `PORTAL_CONNECTION_API.md` → `PORTAL_ACCOUNT_API.md`. Bật OJ accounts/grants tại môi trường thử theo docs phía OJ. Portal server env: `CSAT_OJ_ENABLED`, `CSAT_OJ_ORIGIN` (HTTPS origin), `CSAT_OJ_INSTANCE_ID`, `CSAT_OJ_READ_KEY`, `CSAT_OJ_MANAGE_KEY` (hai key khác nhau, tối thiểu32 ký tự). Không đặt NEXT_PUBLIC, không dùng global sync key.

Admin chọn student rồi nhập mã43 ký tự từ admin OJ. Portal lưu operation UUIDv4 và SHA256 digest trước HTTP, không lưu mã rõ. Timeout/không rõ kết quả: **Đối soát receipt** cùng UUID;404 chưa khẳng định exchange thất bại. Receipt hết hạn hoặc conflict cần admin đối chiếu OJ rồi dừng thao tác và nhập mã mới. Không tự tăng grant revision. Pending/unavailable không được đọc. Thu hồi grant ở UI OJ; Portal không có endpoint revoke OJ.

Lớp nhập organization ID; buổi nhập tối đa20 contest IDs. Không có bộ chọn toàn bộ org/contest từ endpoint giả. Đọc summary khi phần OJ hiện trên màn hình; danh sách/chi tiết tải theo thao tác, không polling10giây. Quota DB dùng chung instance/read120 và manage30 mỗi phút, tôn trọng Retry-After. Khóa instance/schema/grant; kiểm quyền trước/sau HTTP; không cache công khai. `null`, withheld, frozen và not_participated được giữ nguyên, không diễn giải thành0 hoặc tự đánh dấu thành thạo.

## Làm sạch phát sinh, giữ lớp — lịch sử03/11, không còn là phạm vi mới nhất

Đợt04/11 đã được chủ trung tâm xác nhận riêng: giữ Auth/tutors/Storage/intake/catalog/audit, xóa lớp/học sinh/phụ huynh/phát sinh rồi nhập bộ mẫu. Đã thực hiện sau phục hồi/diễn tập; không chạy lại. [Bằng chứng và công cụ mới](DATABASE_REINITIALIZATION_20261104.md). Phần dưới mô tả công cụ activity reset03/11 để đối chiếu lịch sử, không phải chỉ dẫn thực hiện thêm.

Thay toàn bộ phạm vi reset rộng cũ. Chủ trung tâm đã chỉ định Supabase hiện tại, sao lưu về máy trước, **giữ lớp** nhưng xóa toàn bộ chốt sổ/điểm danh/phát sinh. Không cần tạo project Supabase mới chỉ để làm sạch; vẫn kiểm fixture và phục hồi bản sao trên PostgreSQL loopback riêng trước thao tác thật. Nghiệm thu Google/OJ/Storage cho phát hành tính năng là bước riêng.

Công cụ hiện hành: [portal-activity-reset.cjs](../scripts/portal-activity-reset.cjs). CLI `portal-reset.cjs --apply` cũ bị chặn; module cũ chỉ còn phục vụ kiểm thử hợp đồng lịch sử, không dùng cho đợt này.

| Xử lý | Dữ liệu |
|---|---|
| Giữ nguyên | Lớp, thành viên/ghi danh, lịch sử phân công/giá/chương trình, học sinh/phụ huynh/liên kết, Auth, gia sư/hồ sơ/ảnh/Storage, intake/lịch sử, thông báo, cấu hình/template/catalog/registry/audit và mapping OJ tài khoản/lớp |
| Xóa phát sinh | Buổi học, điểm danh/xác minh roster/giá buổi, chốt sổ/billing/chứng từ/giao dịch/điều chỉnh và snapshot chứng từ legacy, nhận xét/đính chính, email job review và contest mapping theo buổi |
| Giữ một phần | `learning_records` kind=class cùng history/snapshot tương ứng; xóa kind student/session. Idempotency giữ thao tác cấu hình lớp, xóa close_billing/payment_event/adjustment/add_sessions/cancel_sessions. Reconciliation giữ intake. |

Quy trình:

1. Đối chiếu ref URL Supabase/API/connection, chỉ dùng project đã chỉ định. Tạo backup public/csat_internal/Auth/Storage metadata trên máy, checksum; Storage có objects thì sao lưu byte tệp riêng. Không log credential hoặc row.
2. Phục hồi vào PostgreSQL loopback riêng, so count/digest từng bảng; diễn tập đúng công cụ reset trên bản sao. Ghi manifest `restoreVerified=true` chỉ sau kiểm đạt; local fixture không thay kiểm bản backup thật.
3. Preview trong transaction READ ONLY với `PORTAL_ACTIVITY_DATABASE_URL` và `--project=<ref>`; công cụ dùng TLS đầy đủ, có thể đặt `CSAT_DB_CA_FILE` cho CA đã xác minh. Không in URL.
4. Apply yêu cầu `--apply --project=<ref> --preview-token=<token> --backup-manifest=<path> --confirm=CLEAR_ACTIVITY_KEEP_CLASSES_AND_PEOPLE`. Backup phải đúng project/checksum và dữ liệu sắp xóa còn khớp bản sao đã phục hồi.
5. Transaction lấy khóa nghiệp vụ chung và khóa EXCLUSIVE bảng ứng dụng; Auth/Storage do Supabase quản lý chỉ lấy ACCESS SHARE, không yêu cầu quyền ghi. Xác minh lại preview/manifest. TRUNCATE danh sách tường minh RESTRICT, giữ các partition cấu hình bằng bảng tạm rồi phục hồi đúng ID/revision. Không CASCADE, không tắt RLS/trigger, không sửa cấu trúc hoặc sequence hiện hữu. Bảng chưa phân loại làm dừng.
6. So fingerprint của tất cả thông tin được giữ trước commit; mọi bảng phát sinh phải rỗng. Thêm một audit RESET riêng rồi commit. Lỗi ở bất kỳ bước nào rollback.
7. Kiểm lại qua connection mới: classes/people/configuration còn nguyên, sessions/attendance/billing trống, không có tác vụ cũ tạo lại dữ liệu. Không chạy đồng thời import/migration hoặc tác vụ ghi khác trong cửa sổ thao tác. Thông báo người dùng tạm ngừng thao tác; khóa DB bảo vệ transaction khỏi writer trực tiếp.

Đợt reset không tự áp migration30–32; migration đã được chủ trung tâm yêu cầu và áp ở đợt riêng sau đó. Không tạo/sửa Auth, không nhập8 hồ sơ chưa khớp hoặc deploy. Mọi bước cấu hình/phát hành tính năng vẫn có cổng nghiệm thu riêng.

## Cổng nghiệm thu còn phải làm trên môi trường thật

Supabase thử: Google + CAPTCHA hợp lệ, cùng email staff, refresh/logout, RLS với JWT thật, upload/thay/gỡ avatar, schema registry. OJ thử: exchange timeout/receipt, revoked/revision, hai contest, roster thiếu, cursor/429, frozen/withheld. Đích production: xác minh project/runtime/registry/config, backup/restore thật, nguồn dữ liệu nhập lại, pilot và đo lỗi bằng code/count. Không ghi phone, token, mã kết nối hoặc payload thật vào log.
