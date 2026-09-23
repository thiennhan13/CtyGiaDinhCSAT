# Kế hoạch email CSAT — tư vấn và nhắc nhận xét tháng

Ngày đối chiếu: 14/09/2026. Trạng thái: đã được duyệt và đã thực hiện phần mã nguồn local; chờ cấu hình Resend/Vercel và phát hành production.

## 1. Phạm vi và quyết định

- Đã xác nhận: “thông tin phụ huynh” là thông tin từ form tư vấn gửi về trung tâm. Không bổ sung email gửi tới phụ huynh, thư quảng cáo hoặc thư xác nhận tự động cho người điền form.
- Đã chọn: Resend gửi từ tên miền CSAT; csattutor@gmail.com nhận yêu cầu tư vấn, tổng hợp tháng và phản hồi của gia sư.
- Đề xuất mặc định: triển khai hai luồng, giữ lịch Vercel ngày 28; ngoại lệ do admin xử lý. Không yêu cầu Pro về mặt kỹ thuật cho đợt này; chưa quyết định mua hoặc đổi hosting.
- Không tự chốt sổ, tự công bố nhận xét, tự gắn tag hoặc suy luận năng lực. Một nhận xét/học sinh/lớp/tháng theo nghiệp vụ hiện tại; không yêu cầu nhập lại theo từng buổi.
- Mọi thao tác production, áp dụng migration, gửi thử thật và deploy chỉ thực hiện sau khi được phép. Viết kế hoạch không đồng nghĩa được phép bật gửi.

## 2. Hiện trạng đã kiểm chứng từ mã nguồn

| Luồng | Đã có | Khoảng trống |
|---|---|---|
| Form tư vấn → admin | API lưu yêu cầu và outbox cùng transaction; UUID chống trùng; hạn chế spam; gửi Resend; admin xem/đổi trạng thái/retry | Bản local và migration 18 chưa phát hành trong phiên này; chưa xác minh sender/DNS, cấu hình và hoạt động production; cần trạng thái lỗi dễ hiểu và thao tác đối chiếu |
| Ngày 28 → gia sư | Cron `0 1 28 * *`; Bearer secret; production-only; snapshot tháng; gộp một thư/gia sư; lease và khóa chống trùng | Lỗi chữ `Gửi nhận xétutor_record`; chưa nhắc tag rõ; chỉ có một lượt cron; nút retry không tạo được đợt bị bỏ lỡ |
| Tổng hợp → admin | Nội dung theo lớp/gia sư; tiến độ tại thời điểm lập đợt; trạng thái email | Chỉ xét đợt thuộc tháng hiện tại, có thể bỏ sót sau chuyển tháng; chờ hàng đợi gia sư; chưa thể hiện rõ snapshot và tình hình hiện tại |

Chi tiết cần sửa: review-email chưa kiểm tra kết quả `finish.updated`; job failed đủ 3 lần không luôn chuyển ngay manual_review; vòng xử lý có trần 35 thư/45 giây nhưng cần dành thời gian cho fetch cuối và ghi kết quả. API cron hiện đi qua proxy có gọi Supabase Auth dù route dùng Bearer riêng; nên bỏ bước tra phiên cho đúng route cron, vẫn xác thực tại handler.

Không dùng kết quả audit production cũ làm bằng chứng cấu hình đang bật hôm nay. Đợt đánh giá này không đọc lại dữ liệu production, không gửi email, không áp dụng migration.

## 3. Đánh giá giải pháp

| Phương án | Ưu điểm | Đánh đổi | Đề xuất |
|---|---|---|---|
| Resend + gửi form ngay + Vercel ngày 28 + xử lý ngoại lệ thủ công | Tận dụng triển khai hiện có; ít thành phần; không phụ thuộc gói cron tần suất cao | Admin kiểm tra tư vấn mỗi ngày làm việc, kiểm tra đợt tháng sau 09:00 ngày 28 | Chọn cho phiên bản đầu |
| Chỉ Portal và admin gửi nhắc thủ công qua Gmail/kênh đang dùng | Ít cấu hình, có thể dùng khi hệ thống email đang tắt | Dễ quên, tốn công, nhật ký phân tán; form vẫn phải lưu database | Phương án dự phòng; không tự động gửi tin qua kênh khác |
| Vercel Pro và worker chạy định kỳ | Có thể tự xử lý thư chờ trong ngày; ít phụ thuộc thao tác admin | Chi phí hosting; vẫn phải chống trùng, giới hạn thử lại và giám sát | Xem xét nếu thường có thư tồn hoặc không bố trí được admin kiểm tra |
| Supabase Cron gọi worker dùng Resend | Dùng hạ tầng Supabase đang có, đặt lịch thường xuyên; có nhật ký job | Thêm pg_cron/pg_net/Vault hoặc Edge Function, quyền và công việc bảo trì; phải kiểm tra gói/tài nguyên thực tế | Lựa chọn thay thế nếu cần tự động retry mà không dựa vào cron Vercel |
| Thay Resend bằng Gmail SMTP/OAuth | Gửi đúng từ csattutor@gmail.com | Phải thay bộ gửi, xác thực Google và giả định chống gửi trùng; không có lợi thế rõ cho phạm vi này | Không chọn, theo quyết định Resend đã xác nhận |

Supabase Cron không giải quyết điều kiện sử dụng Hobby nếu website thương mại vẫn đặt trên Vercel. Không chạy đồng thời hai scheduler chính, không tự thêm dịch vụ ngoài để né giới hạn gói. Không chọn lịch kiểm tra mỗi ngày như giải pháp duy nhất cho lỗi chưa rõ kết quả: lần thử sau có thể đã ngoài cửa sổ chống trùng của Resend.

## 4. Thiết kế phiên bản đầu

### 4.1 Thông tin tư vấn

- Giữ `POST /api/consultations`, lưu dữ liệu trước, một outbox cho một request_id. Thành công của form nghĩa là yêu cầu đã lưu; không hứa email đã tới Gmail.
- Giữ gửi ngay sau lưu với thời hạn xử lý có giới hạn; không dùng tác vụ nền không được nền tảng bảo đảm. Dành thời gian trả phản hồi và ghi trạng thái trong giới hạn route/client. Nếu thời gian gửi hết, yêu cầu vẫn nằm trong admin để tiếp tục xử lý.
- Người nhận cố định csattutor@gmail.com. Subject giữ mã yêu cầu; nội dung giữ tên, vai trò, liên hệ, cấp học, mục tiêu, hướng tư vấn, lời nhắn và thời điểm tiếp nhận. Bổ sung link tới trang quản lý tư vấn được bảo vệ; không nhúng thông tin cá nhân hoặc token đăng nhập vào URL.
- Reply-To dùng email hợp lệ do người điền cung cấp; nếu không có thì bỏ Reply-To. Đây là địa chỉ do người dùng khai, không phải địa chỉ đã xác minh quyền sở hữu.
- Giữ quy tắc cùng UUID/cùng nội dung không tạo lại, UUID/nội dung khác báo xung đột; email lỗi không yêu cầu phụ huynh nộp lại thông tin đã lưu.
- Admin thấy số yêu cầu mới/chưa liên hệ, bộ lọc tình trạng email, lỗi cấu hình, thời điểm được thử lại và thư cần kiểm tra. Trạng thái chăm sóc khách hàng độc lập trạng thái email.
- Không thêm cron tư vấn trong phiên bản đầu. Admin kiểm tra danh sách đầu mỗi ngày làm việc và trước khi kết thúc ngày; khi mail lỗi có thể liên hệ trực tiếp từ dữ liệu đã lưu.

### 4.2 Nhắc gia sư ngày 28

- Giữ `GET /api/cron/monthly-reviews`, lịch `0 1 28 * *` UTC; xác thực CRON_SECRET, production-only, no-store, không lệ thuộc cookie đăng nhập.
- Chỉ tạo đợt tháng hiện tại ngày 28 từ 08:00 Việt Nam. Một đợt/tháng; gọi trùng hoặc đồng thời không sinh thêm thư. Cron không tự tạo lại các tháng cũ.
- Giữ tập đối tượng hiện có của learning_month_queue: học sinh thuộc roster buổi học trong tháng, đến ngày chạy, buổi không hủy; đối chiếu trạng thái theo học và phân công gia sư hiện tại. Không mô tả tập này là “đã điểm danh đi học” vì mã hiện tại không chỉ lấy các buổi đã hoàn thành.
- Một email/gia sư, chỉ liệt kê nhận xét missing/draft có quyền xử lý. Học sinh/lớp/gia sư không còn đủ điều kiện hoặc nháp của gia sư cũ chuyển phần admin kiểm tra, không tự chuyển sở hữu.
- Trước lần gửi đầu, rà lại phân công và tình trạng hoàn thành. Nếu mọi nhận xét đã hoàn tất thì bỏ qua thư; nếu thay đổi phân công làm payload không còn phù hợp thì chuyển kiểm tra thủ công. Không gửi dữ liệu của lớp cho gia sư đã hết quyền. Sau lần thử đầu, không sửa payload/recipient/from/reply-to cho cùng khóa chống trùng; thay đổi cần kiểm tra thủ công.
- Nhắc hoàn thiện nhận xét và chọn tag phù hợp có minh chứng. Không đặt chỉ tiêu số tag, không tự tạo minh chứng. Giữ tương thích: nhận xét chữ đã công bố vẫn hoàn thành, không bị yêu cầu viết lại vì thiếu tag.
- Nêu rõ gia sư lưu nháp khi đang soạn; thao tác “Gửi nhận xét” hiện công bố cho phụ huynh. Cron không bấm thay. Admin chốt sổ học phí riêng; thiếu nhận xét không tự chặn chốt sổ.
- Thư ghi thời điểm lập danh sách và link mở đúng tháng; có câu “Nếu đã hoàn tất sau thời điểm tổng hợp, bạn không cần nhập lại”. Reply-To về csattutor@gmail.com.

Mẫu phần hướng dẫn:

> Vui lòng hoàn thiện nhận xét tháng [MM/YYYY] cho các học sinh còn trong danh sách. Với tag sử dụng, hãy chọn dựa trên nội dung đã học và ghi biểu hiện hoặc bài làm cụ thể. Mỗi học sinh có một nhận xét theo từng lớp trong tháng; không cần nhập lại cho mỗi buổi học. Hãy kiểm tra nội dung trước khi chọn “Gửi nhận xét”. Admin thực hiện chốt sổ học phí riêng.

### 4.3 Tổng hợp admin và phục hồi

- Một thư tổng hợp cho csattutor@gmail.com mỗi đợt; các địa chỉ admin bổ sung chỉ dùng nếu được cấu hình rõ. Chuẩn hóa/loại trùng địa chỉ trước tạo đợt.
- Giữ số nhận xét theo snapshot lúc lập đợt, ghi chính xác thời điểm. Nội dung gồm đã công bố/nháp/chưa viết/cần kiểm tra phân công; phần email gồm được tiếp nhận/thất bại/bỏ qua/cần kiểm tra. Link Portal để xem tiến độ hiện tại.
- Tạo digest khi mọi thư gia sư đã thử ít nhất một lần hoặc đã có trạng thái bỏ qua/cần kiểm tra; không phải chờ tất cả gửi thành công. Sau mỗi lượt xử lý phải đối chiếu lại để không bỏ lỡ digest khi chạm giới hạn batch.
- Xét tất cả các đợt đã tạo nhưng thiếu digest, kể cả tháng trước; không chỉ lọc tháng hiện tại. Không tái tạo snapshot hoặc sửa email đã được tiếp nhận.
- Bổ sung trạng thái đợt “chưa tạo/đang xử lý/đã xử lý hết/cần kiểm tra”; phân biệt “đã xử lý hết” với “tất cả đã gửi thành công”. Sau 09:00 ngày 28, nếu thiếu đợt thì hiển thị cần khôi phục trên admin.
- Mở rộng API admin email bằng các action preview, prepare, drain; POST cũ không body vẫn tương đương drain. preview chỉ đọc; prepare có tháng và mã thao tác, yêu cầu phiên admin/same-origin, ghi người thao tác. Trước tạo lại phải có màn hình xem danh sách và xác nhận trong Portal, tái kiểm tra điều kiện ở server.
- Phục hồi đợt bị bỏ lỡ: tháng hiện tại từ ngày 28 đến cuối tháng hoặc tháng liền trước trong ngày 1–7. Nếu đợt đã tồn tại chỉ xử lý tiếp; không ghi đè. Không hỗ trợ tạo hàng loạt lịch sử. Danh sách khôi phục phản ánh dữ liệu tại lúc khôi phục, ghi thời điểm thật, không giả lập snapshot ngày 28.
- Thư chưa từng thử gửi quá 7 ngày kể từ lúc lập đợt cần kiểm tra thủ công, không tự gửi nhắc cũ khi cron tháng sau chạy. Thư đã thử vẫn áp dụng cửa sổ 23 giờ bên dưới. Các job chờ lịch sử được đối chiếu riêng, không âm thầm xóa.

### 4.4 Hàng đợi và chẩn đoán

- Giữ riêng hai outbox nghiệp vụ; dùng chung nguyên tắc gửi/đọc lỗi ở tầng TypeScript khi phù hợp, không gộp bảng chỉ để giảm số tệp.
- accepted = Resend tiếp nhận, chưa xác nhận đến hộp thư hay đã đọc. Giao diện tiếng Việt: Đang chờ / Đang gửi / Nhà cung cấp đã tiếp nhận / Gửi lỗi / Cần kiểm tra / Bỏ qua (nếu luồng có).
- Tối đa 3 lần thử; chờ ít nhất 5 phút giữa các lần; khóa xử lý 3 phút; cùng payload và idempotency key trong cửa sổ cho phép. Đủ 3 lần lỗi hoặc quá 23 giờ kể từ lần thử đầu chuyển cần kiểm tra, không tạo ID mới để vượt giới hạn.
- Kiểm tra kết quả finish và lease; không báo gửi thành công nếu chưa lưu được kết quả. Dành ngân sách thời gian cho ghi DB, dừng nhận thêm job khi không đủ thời gian cho một lượt gửi và hoàn tất. Phần còn lại vẫn trong outbox.
- Với thư cần kiểm tra, admin đối chiếu Portal và Resend. Bổ sung thao tác ghi kết quả đối chiếu/note riêng, có người và thời gian; không sửa lịch sử đã gửi, không làm thao tác này tự phát sinh thư mới. Đã liên hệ qua kênh khác có thể đánh dấu đã xử lý để không còn cảnh báo mở.
- Log chỉ ghi mã đợt/job, tổng số, thời lượng và mã lỗi; không ghi nội dung form, số điện thoại, email đầy đủ hoặc bí mật. Portal hiện thông tin cho admin theo quyền có sẵn.
- Không triển khai webhook/open tracking trong đợt đầu; nếu cần biết bounced/delivered có thể bổ sung webhook Resend xác minh chữ ký ở đợt sau.

## 5. Cấu hình Resend, Gmail và Vercel

1. Dùng tài khoản Resend thuộc trung tâm. Thêm tên miền gửi đề xuất `notify.csatoj.vn`.
2. Tại nhà cung cấp DNS có thẩm quyền, thêm chính xác tên/loại/giá trị bản ghi xác minh và gửi mà Resend cung cấp. Không thay bản ghi website hoặc MX đang dùng của tên miền gốc. Chờ trạng thái Verified; không tự đoán giá trị SPF/DKIM.
3. Chọn sender `CSAT <thongbao@notify.csatoj.vn>`. Không cần mua hộp thư cho địa chỉ này khi các thư nhắc có Reply-To về Gmail trung tâm. Không cấu hình nhận thư/inbound ở đợt này.
4. Tạo API key Resend quyền gửi trên domain cần dùng; lưu trong Vercel Project → Settings → Environment Variables, phạm vi Production. Không đưa secret vào NEXT_PUBLIC, git, ảnh chụp hoặc chat.

| Biến | Giá trị/cách dùng |
|---|---|
| APP_ORIGIN | https://portal.csatoj.vn |
| CSAT_EMAIL_FROM | CSAT <thongbao@notify.csatoj.vn> sau Verified |
| CSAT_EMAIL_REPLY_TO | csattutor@gmail.com — đã có code hỗ trợ cho thư nhắc/tổng hợp |
| RESEND_API_KEY | Khóa gửi của Resend |
| CRON_SECRET | Secret ngẫu nhiên mạnh, tối thiểu 32 ký tự; Vercel tự đưa vào Bearer header |
| CONSULTATIONS_HASH_KEY | Secret riêng cho chống spam form, ổn định giữa các instance |
| CONSULTATIONS_ENABLED | false khi chuẩn bị; true khi được phép nhận yêu cầu |
| CONSULTATIONS_EMAIL_ENABLED | false khi chuẩn bị; true sau khi được phép bật thư tư vấn |

VERCEL_ENV do Vercel cung cấp, không đặt thủ công để vượt chặn preview. Giữ cấu hình Supabase đúng môi trường; service role chỉ phía server. Trong /admin/learning đặt admin_emails = [csattutor@gmail.com], email_enabled = false lúc chuẩn bị, chỉ bật sau kiểm thử được phép.

5. Bản production có cấu hình mới chỉ có hiệu lực sau deployment tương ứng; thực hiện khi được phép. Vercel Project → Settings → Cron Jobs phải hiện đúng route/lịch. Chưa bấm Run để thử khi có thể gửi cả danh sách.
6. Gửi thử có kiểm soát đến csattutor@gmail.com bằng dữ liệu giả và danh sách người nhận cố định sau khi được cho phép; kiểm tra tên gửi, Reply-To, dấu tiếng Việt, link, Gmail Spam và nhật ký. Công cụ thử không tạo đợt nhắc thật hoặc lấy danh sách gia sư thật.
7. Thiết lập bộ lọc/nhãn Gmail cho yêu cầu tư vấn và tổng hợp tháng nếu chủ tài khoản muốn; không tự đánh dấu tất cả thư là đã đọc. Việc dùng Resend không yêu cầu cài plugin Gmail hoặc cấp quyền đọc hộp thư cho Portal.

## 6. Kiểm thử và thứ tự phát hành

### Kiểm thử bắt buộc

- Form: DB lỗi không báo đã nhận; DB thành công/email lỗi vẫn giữ yêu cầu; nhấn lại không trùng; email không bắt buộc; chống spam; người không phải admin không đọc được dữ liệu.
- Cron: sai/thiếu secret trả 401; preview không gửi; kiểm tra cả đường đi qua proxy; ngày 27/28/29, tháng 2 và chuyển năm theo giờ Việt Nam; gọi đồng thời chỉ một đợt và một thư/gia sư.
- Nghiệp vụ: một gia sư nhiều lớp; học sinh nhiều lớp; hoàn thành trước ngày 28; thiếu email; thay gia sư; lớp đóng; nháp của người cũ; nhận xét chữ đã công bố; tập buổi hủy/đến ngày chạy đúng logic hiện hành.
- Phục hồi: cron bỏ lỡ hoàn toàn; prepare đồng thời cron; nhắc chuyển tháng; quá giới hạn phục hồi; hơn 35 thư; digest phát sinh sau batch cuối; snapshot không đổi khi retry.
- Nhà cung cấp: 429/5xx, timeout sau khi có thể đã nhận, lỗi lưu finish, lease hết hạn, lỗi đủ 3 lần, mốc 23 giờ, job quá cũ, nhiều luồng cùng gửi. Các ca này dùng Resend giả lập.
- Lịch sử: so sánh nhận xét đã công bố, kỳ đã chốt, số dư và các bảng nghiệp vụ trước/sau; không phát sinh publish/close từ email.
- Build, TypeScript, lint phần sửa và regression liên quan. Kiểm thử concurrency trên PostgreSQL tách biệt; không tạo dữ liệu test trong production.

### Thứ tự

1. Duyệt nội dung/quy tắc trong tài liệu này. Hoàn thiện local phần cron, chẩn đoán và đối chiếu; soạn migration bổ sung sau phiên bản hiện có, không sửa migration 13 đã áp dụng. Kiểm tra migration 18 thực tế trước phát hành, không suy ra trạng thái DB từ tên tệp.
2. Hoàn thiện form tư vấn đã có; chạy kiểm thử giả lập và chuẩn bị bản xem trước nội dung email. Tạo tài liệu verification và thao tác khôi phục.
3. Khi được phép: xác nhận backup/đích production, áp dụng đúng migration chưa có, deploy với các công tắc email tắt. Không gộp thay đổi nội dung đào tạo hoặc tài chính vào đợt này.
4. Khi được phép gửi thử: kiểm tra riêng một thư tư vấn và một mẫu nhắc vào Gmail trung tâm; sau đó bật luồng tư vấn trước.
5. Bật nhắc tháng sau khi đã kiểm tra email gia sư, người nhận admin và cron. Lần ngày 28 đầu tiên admin kiểm tra sau 09:00; chỉ tiếp tục gửi thư đủ điều kiện, không tạo lại đợt.
6. Sau một chu kỳ: xem yêu cầu tư vấn chưa liên hệ, số thư lỗi/cần kiểm tra, thời gian admin xử lý, số thư trong ngày cao điểm; chỉ bổ sung worker tự động khi chi phí vận hành thủ công thực sự đáng kể.

Dừng/rollback: tắt công tắc email tương ứng trước, giữ tiếp nhận form nếu DB khỏe và admin vẫn xử lý được; tắt cron nếu cần. Giữ yêu cầu/outbox/lịch sử và migration bổ sung, không rollback bằng xóa bảng hay reset trạng thái đã gửi.

## 7. Chi phí và giới hạn

- Resend Free hiện có 3.000 thư/tháng, tối đa 100/ngày. Với hai luồng này, số thư ngày 28 = số gia sư cần nhắc + số admin nhận tổng hợp + số yêu cầu tư vấn hợp lệ gửi mail trong ngày + thư khác cùng tài khoản. Đánh giá cả ngày cao điểm, không chỉ trung bình tháng.
- Ví dụ tính toán, không phải số lượng gửi đã đo: 21 gia sư cần nhắc + 1 admin + 10 yêu cầu tư vấn = 32 thư, trong mức 100/ngày. Nếu gần ngưỡng, kiểm tra quota thực tế và cân nhắc gói Resend, không tự tạo thêm tài khoản để vượt giới hạn.
- Hobby đủ kỹ thuật cho cron một lần/tháng, thời điểm trong khung giờ thay vì chính xác từng phút. Không coi Pro là bảo đảm không bỏ lỡ hoặc tự retry.
- Điều kiện Hobby giới hạn sử dụng cá nhân phi thương mại; cần chốt hosting phù hợp cho vận hành trung tâm trước phát hành chính thức. Chưa mua Pro theo kế hoạch này. Đổi scheduler không thay đổi điều kiện của nơi host website.

## Nguồn đối chiếu

- Mã chính: lib/review-email.ts; lib/consultation-email.ts; app/api/consultations/route.ts; app/api/admin/learning/emails/route.ts; database/migrations/20260910_13_monthly_workflows.sql; database/migrations/20260913_18_consultations.sql; lib/student-reviews.ts.
- [Resend pricing](https://resend.com/pricing)
- [Resend idempotency: 24 giờ](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Xác minh tên miền Resend](https://resend.com/docs/dashboard/domains/introduction)
- [Vercel cron: giới hạn lịch](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel cron: secret, log, lỗi và gọi trùng/bỏ lỡ](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Điều kiện Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Cron, HTTP và Vault](https://supabase.com/docs/guides/functions/schedule-functions)

## 8. Kết quả thực hiện local — 14/09/2026

- Đã bổ sung migration 19, không sửa migration cũ: xác nhận danh sách trước phục hồi, lưu người thao tác, kiểm tra lại phân công, chặn thư quá cũ và đủ số lần thử; tổng hợp admin qua chuyển tháng; nhật ký đối chiếu riêng.
- Đã sửa bộ gửi: Reply-To, kiểm tra finish.updated, ngân sách thời gian, chặn local/Preview, bỏ truy vấn cookie trên đúng route cron. Tắt công tắc không ngăn ghi kết quả của thư đã claim.
- Trang admin có xem trước/tạo đợt/xử lý tiếp, tiến độ đợt, thời điểm retry và ghi chú đối chiếu. Trang tư vấn có bộ lọc email, số yêu cầu mới/đang theo dõi, chẩn đoán thiếu biến và link quản trị trong thư.
- 225 kiểm thử qua; kiểm thử riêng email và SQL verification qua; PostgreSQL 17 kiểm tra prepare/claim đồng thời bằng hai kết nối và khôi phục backup. Production build, TypeScript, lint phần sửa qua. UI kiểm tra 8 tổ hợp trang/chế độ sáng-tối/kích thước, thao tác xem trước → tạo đợt → gửi, bộ lọc và đối chiếu qua, không tràn ngang hoặc lỗi JavaScript.
- Chưa áp dụng migration production, chưa deploy hoặc gửi email thật. Trung tâm xác nhận chưa có Resend. Workspace chưa liên kết Vercel CLI; công cụ browser không khởi động được trong phiên này. Không xem sự hiện diện file migration là bằng chứng production đã cập nhật.
- Hướng dẫn từng bước: [Cài Resend và Vercel](EMAIL_VERCEL_SETUP_20260914.md). Phát hành sau khi xác minh domain, khóa và đúng đích; bật tư vấn trước rồi nhắc tháng theo kế hoạch.


## Bản phát hành kết hợp 22/09/2026

Đợt kết hợp bổ sung migration 21 và kiểm thử chuỗi 18–21. Xem [Hướng dẫn phát hành và nghiệm thu](RELEASE_PARENT_EMAIL_20260922.md) để dùng thứ tự migration mới, công cụ thư mẫu cố định người nhận, dữ liệu phí từng buổi và trạng thái production mới nhất. Các thao tác production/gửi thật vẫn cần được cho phép.
