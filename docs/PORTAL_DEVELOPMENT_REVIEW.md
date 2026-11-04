# Đối chiếu hiện trạng và hướng phát triển Portal

> Bản nghiên cứu trước triển khai. Mã local nay có migration30–32 và các luồng Google/grants/thu tiền/chứng chỉ. Hiện trạng và hướng dẫn thao tác được cập nhật tại [runbook chuyển đổi](PORTAL_GOOGLE_GRANTS_ROLLOUT.md) và [PROJECT_STATUS](PROJECT_STATUS.md); các mục “chưa có/chưa chốt” dưới đây chỉ mô tả baseline nghiên cứu.

Phạm vi: nghiên cứu tài liệu, đối chiếu caller/API/RPC/migration và kiểm chứng chọn lọc. Không triển khai Google, chuyển API OJ, reset database hoặc phát hành trong đợt này. Trạng thái môi trường và kết quả chạy nằm tại [PROJECT_STATUS](PROJECT_STATUS.md); quyết định sản phẩm nằm tại [DECISIONS](DECISIONS.md).

Chủ trung tâm đã đồng ý các hướng phát triển và chốt phụ huynh Google tự liên kết khi nhập số khớp hồ sơ; không OTP/admin duyệt/mã mời. Chi tiết schema, các caller cần chuyển và những ràng buộc còn thiếu ở [bản đồ danh tính/database](PARENT_IDENTITY_DATABASE_DESIGN.md).

## Cấu trúc cần giữ

Portal là một ứng dụng Next.js 16.3.8/React 19/TypeScript/Tailwind 4, Supabase Auth + PostgreSQL/RLS/RPC, triển khai Vercel, yêu cầu Node 24. Frontend/backend là hai luồng công việc trong cùng repo. OJ là hệ thống riêng, giao tiếp server-to-server.

| Phần | Nguồn chính | Vai trò |
|---|---|---|
| Website công khai | `app/`, `components/marketing/`, `lib/public-*.ts` | Giới thiệu, tuyển sinh, khóa học, Tự học; catalog và nội dung đã duyệt |
| Cổng phụ huynh | `app/parents/`, `components/learning/`, `lib/parent-learning.ts` | Nhiều con/lớp, nhận xét công bố, lộ trình, chuyên đề, buổi học, học phí |
| Danh tính/quyền | `lib/parent-auth.ts`, `lib/auth-routing.ts`, `proxy.ts`, `app/api/parents/auth/` | Hiện phụ huynh dùng lookup; admin/gia sư dùng Auth |
| Nghiệp vụ | `features/`, `app/api/`, `lib/business-api.ts` | Validate, kiểm quyền/Origin, điều phối RPC |
| Database | `database/migrations/`, `database/tests/` | Transaction, revision, snapshot, audit, lịch sử hiệu lực |
| OJ local cũ | `lib/csat-oj*.ts`, `components/oj/`, `app/api/oj/`, `app/api/parents/oj/` | Có adapter/UI/tests nhưng chưa theo hợp đồng grants mới |

Không cần viết lại toàn hệ thống. Tách module lớn khi sửa đúng nghiệp vụ; giữ nguồn catalog/giáo trình, nháp–công bố, quyền và lịch sử.

## Khoảng cách giữa yêu cầu mới và mã hiện có

| Yêu cầu | Đã đối chiếu trong mã | Công việc tiếp theo |
|---|---|---|
| Phụ huynh đăng nhập Google | `parentSession()` đọc hash cookie, gọi `parent_phone_session_valid`; chưa có OAuth Google/callback/tự liên kết Auth theo số trong mã ứng dụng | Thêm Auth Google, nhập số khớp hồ sơ để tự liên kết; chuẩn hóa nguồn liên hệ, chuyển mọi reader riêng tư và thu hồi đường lookup cũ trong đợt chuyển đổi |
| Nhập mã OJ để liên kết học sinh | `/api/oj/links` hiện resolve username/organization rồi ghi `bindings/*` | Thay bằng `connections/exchange/`, pending operation/UUID, receipt, grant ID/revision và unique hai chiều |
| Tài khoản, số bài, ranking, contest | Parent API hiện gọi `parent-batch/`; panel có luyện tập, kết quả theo buổi, hai hạng | Chuyển sang `accounts/*`, thêm identity/summary/organizations/lịch sử có cursor và kết quả lớp theo roster |
| Cập nhật dữ liệu OJ | Panel hiện poll toàn payload 10 giây, 429 chờ cố định 60 giây | Tách summary/lịch sử/kết quả buổi; gộp request sau kiểm quyền, backoff và Retry-After; chọn nhịp theo pilot |
| Quản lý lớp/điểm danh/tính phí | Đã có `manage_class`, lịch sử đơn giá/gia sư, `take_attendance_safe`, preview/chốt kỳ và payment ledger | Nghiệm thu theo tình huống vận hành; chuẩn hóa UI/contract trên nền hiện có |
| Gia sư chọn đã thu tiền | API payments yêu cầu admin; `payment_accounts` và `record_payment_event` đều gọi `require_admin()` | Bổ sung quyền thu theo lớp/phân công ở API/RPC, audit người thu; không chỉ bật nút hoặc sửa status trực tiếp |
| Reset database | Baseline master chỉ đến migration10; thư mục migration đã đến29 | Đã chốt xóa dữ liệu nghiệp vụ để nhập lại, giữ toàn bộ Supabase Auth; project/Storage và kế hoạch thực thi chưa xác định, chưa xóa |

Migration 28 đang là bản OJ cũ chưa được theo dõi trong Git; 29 đã tồn tại và phụ thuộc 27, độc lập 28. Không coi 28 là số cuối, không coi số file chứng minh đã áp môi trường. Trước thay schema phải xác minh registry/phụ thuộc; không sửa migration đã phát hành.

## Hợp đồng CSATOJ phải dùng

Nguồn bàn giao ở repo `csat-oj`, đọc đúng thứ tự `docs/PORTAL_HANDOFF.md` → `docs/PORTAL_CONNECTION_API.md` → `docs/PORTAL_ACCOUNT_API.md`. Bộ đang đọc ghi cập nhật 31/10/2026; HEAD OJ local là `7ec5c16c`, các docs bàn giao có thay đổi chưa commit. Trạng thái CI được ghi trong docs OJ, chưa xác minh lại CI/VPS trong đợt này.

Luồng đích:

1. Admin OJ tạo mã một lần, hạn 10 phút. Admin Portal chọn học sinh có sẵn rồi nhập mã.
2. Portal lưu pending operation + UUID trước HTTP; exchange bằng manage key. Mapping lưu student ID, instance/profile ID, grant ID/revision và trạng thái; username chỉ để hiển thị.
3. Timeout hoặc OJ thành công/Portal lỗi DB: đối soát receipt với cùng UUID; receipt 404 không đủ kết luận thất bại. Không lưu mã bản rõ hoặc tự nâng revision.
4. Phụ huynh đăng nhập Google, nhập số điện thoại để tự liên kết với đúng một học sinh. Chỉ một tài khoản phụ huynh/một số/một con; Google khác dùng số đã liên kết phải báo lỗi, cùng chủ thử lại trả kết quả cũ. Quyết định mới thay hướng nhiều–nhiều và mã mời còn ghi trong docs OJ; không thay API OJ. Thu hồi phụ huynh không tự thu hồi grant OJ của con.
5. Backend kiểm quyền trước/sau fetch, gửi read key và revision đã xác nhận cho `accounts/<id>/...`. Lớp–organization, buổi–contest và roster lịch sử nằm tại Portal.

Mode grants không có API liệt kê mọi contest của organization để chọn trước; không tiếp tục gọi resolver/list/bindings/parent-batch cũ. Tạm dùng ID/key contest do admin cung cấp, sau đó kiểm khả dụng theo hợp đồng. Không suy roster buổi từ membership organization hiện tại.

| Số liệu/trạng thái | Quy tắc hiển thị |
|---|---|
| Bài đã thử / bài AC / lượt nộp | Ba chỉ số khác nhau; AC hoàn tất, khử trùng bài theo hợp đồng OJ |
| Practice / learning total / site | Phạm vi khác nhau; không cộng chồng. Tổng `limited` phải ghi chưa đầy đủ |
| Rating / hạng site / hạng lớp / hạng contest | Tách nhãn và mẫu số; không suy thành thạo hoặc chuyển chặng |
| Lịch sử contest | Mỗi item là lượt tham gia; phân biệt đăng ký, LIVE, thi ảo và spectate; giữ filter khi truyền cursor |
| Frozen / withheld / null | Không đổi thành 0 hoặc kết luận không học. Thi ảo không nhận hạng LIVE |
| Mất quyền / revision conflict | Xóa dữ liệu đang hiển thị và chặn mapping; admin xác nhận lại |
| Lỗi mạng / 429 | Thông báo và retry có kiểm soát; chỉ giữ dữ liệu cũ có timestamp khi quyền còn hợp lệ |

Giới hạn mặc định OJ là 120 read request/phút cho toàn Portal và 30 manage request/phút. Không webhook/WebSocket; cần đo tải nhiều phụ huynh. Không tiếp tục cộng tổng bài cả tháng theo `problem_sets` của API cũ: `class-results.totals` mới khử trùng trong tập contest được gửi (tối đa 20), chưa tự giải quyết tổng tháng vượt giới hạn.

## Luồng frontend phụ huynh

Giữ Archivo/palette và shell hiện có. Website công khai dùng neobrutalism/playful edtech; Portal ưu tiên đọc dữ liệu và thao tác, không áp hero marketing vào báo cáo.

Cấu trúc đề xuất để phát triển tiếp: chọn con/lớp/thời gian → tổng quan tài khoản OJ và học tập → nhận xét/lộ trình/chuyên đề → buổi học/contest → học phí/liên hệ. Đây là đề xuất bố cục, chưa phải giao diện đã duyệt hoặc đã triển khai.

- Tài khoản: đăng nhập Google, nhập số, tự liên kết khi khớp hồ sơ hợp lệ, không khớp/chưa có con, bị khóa/thu hồi, đăng xuất. Cho dán số, nhãn/lỗi rõ, focus đúng; không dùng email hoặc tên Google để suy quan hệ. Số tự khai chưa được xác minh sở hữu.
- OJ: chưa liên kết, đang tải, chưa có hoạt động, dữ liệu giới hạn, mất quyền và lỗi cập nhật có hành động phù hợp. Hiển thị thời điểm cập nhật; danh sách contest có phân trang.
- Học phí: tách tạm tính, đã chốt, thanh toán ròng, còn đóng, dư/cần hoàn. Nhận xét/giáo án chỉ đọc bản công bố.
- QA: mobile 320/375 px, desktop, zoom 200%, light/dark, bàn phím/focus, reduced motion, dữ liệu dài/thiếu, đổi con trong khi request đang chạy, lỗi/retry và mất quyền.

Đã dùng `ui-ux-pro-max`: tìm `accessible authentication` trong domain UX cho xác thực có thể tiếp cận; tìm loading/error theo stack Next.js và đối chiếu tài liệu Next cài trong repo. Chỉ lấy hướng dẫn phù hợp; không đổi font/palette/dependency hoặc áp mẫu native lên web. Chưa làm browser QA giao diện mới trong đợt nghiên cứu.

## Google và phân quyền

Hướng kỹ thuật là tận dụng Supabase Auth hiện có cho Google, callback phía server và mapping quyền riêng tại Portal. Theo lựa chọn của chủ trung tâm, nhập số khớp hồ sơ hợp lệ tự cấp liên kết, không OTP/admin duyệt/mã mời; Google không xác minh số hoặc quan hệ với học sinh, SEC-02 vẫn mở. Cần rà `authRedirect` đang mặc định role thiếu thành tutor, refresh ở proxy, role middleware/RPC, hồ sơ Auth lịch sử và khả năng một tài khoản có nhiều vai trò trước khi mở Google signup.

Cấu hình chỉ ở Vercel chưa đủ: cần OAuth client/redirect URI tại Google, Google provider tại Supabase, Site URL/redirect allowlist và callback ứng dụng. Tham chiếu [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). Không đưa client secret vào frontend/chat. Tự khớp số để thêm quyền theo luồng đã chốt không đồng nghĩa được ghi đè, hợp nhất hoặc chiếm Auth lịch sử.

## Chuẩn hóa vận hành và thứ tự thực hiện

1. Chuẩn bị Supabase thử và fixture; đối chiếu schema thực, migration và phương án phục hồi. Reset dữ liệu nghiệp vụ để nhập lại đã được chốt, giữ toàn bộ Supabase Auth; cần project đích, phạm vi Storage, danh sách xóa/giữ và cách nối hồ sơ mới với Auth trước thao tác.
2. Hoàn thiện contract Google + tự liên kết theo số + quyền một–một; chuẩn hóa nguồn liên hệ, kiểm số đã có chủ/tranh chấp/thu hồi/chống đọc chéo. Thiết kế UI trạng thái bằng dữ liệu giả có thể tiến hành cùng giai đoạn này. Hồ sơ gia sư tái dùng thành tích/trường/giới thiệu, thêm chứng chỉ nhiều mục.
3. Chuyển adapter/mapping OJ sang grants/accounts; kiểm exchange/receipt/revision/concurrency, cursor, freeze/rejudge và quota. Không bật lại API cũ để vượt chặn.
4. Nối và nghiệm thu trang phụ huynh; pilot một lớp/hai contest, đối chiếu số bài/hạng và phiên thật trên môi trường thử.
5. Chuẩn hóa lớp–điểm danh–học phí và quyền gia sư ghi nhận thu. Cần xác định thu toàn bộ hay từng phần, phạm vi chứng từ khi đổi gia sư, ai sửa/đảo giao dịch. Đây là quyết định còn thiếu, không mặc định cấp quyền hoàn/đảo/chốt kỳ cho gia sư.
6. Trước PR thay mã chạy bộ kiểm tra bắt buộc; trước phát hành xác minh runtime, backup/restore, cấu hình hai phía và nghiệm thu xuyên hệ thống. Commit/push/migration/deploy là bước riêng theo quyền đã giao.

Reset là quyết định làm lại dữ liệu của chủ trung tâm; không thay việc cập nhật hợp đồng OJ, migration/quyền hoặc nghiệm thu. Chưa thực hiện reset; không xóa Supabase Auth, CSATOJ hoặc migration theo kế hoạch này.
