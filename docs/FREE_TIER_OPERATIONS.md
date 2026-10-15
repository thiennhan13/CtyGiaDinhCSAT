# Phương án đối soát và vận hành với ngân sách miễn phí

**Phạm vi hiện hành:** chủ trung tâm xác nhận Usage thực tế ổn và duyệt triển khai bước 2–5: dependency/header/secret, quyền và backup, bot Log, giảm tải theo bằng chứng. Đã sửa mã local và bật Bot Protection Log trên Vercel; chưa deploy mã mới, chưa đổi database/DNS hoặc nâng gói. Giữ tra cứu phụ huynh hiện hành. Trạng thái bảo mật và rủi ro danh tính ở [PUBLIC_SECURITY](PUBLIC_SECURITY.md).

Quyết định bổ sung: chủ trung tâm đã duyệt Turnstile Free **chỉ cho đăng nhập**. Mã local và fixture đã có, chờ widget/key và phát hành theo [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md); không mở rộng CAPTCHA sang đăng ký/tư vấn.

## Điều kiện hosting cần chốt trước

[Vercel Hobby](https://vercel.com/docs/plans/hobby) chỉ dành cho cá nhân, phi thương mại. [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines) nêu quảng bá bán sản phẩm/dịch vụ cũng là sử dụng thương mại, không cần có thanh toán trực tiếp trên web. Với website tuyển sinh và quản lý học phí của trung tâm, có cơ sở để xem CSAT thuộc phạm vi này; chưa có xác nhận ngoại lệ từ Vercel.

Không thể kết luận phương án Vercel Hobby phù hợp lâu dài chỉ vì tải thấp. Nếu ngân sách bắt buộc bằng 0, cần nghiên cứu hosting cho phép mục đích sử dụng này và nghiệm thu tương thích trước khi chọn; chưa tự đổi nhà cung cấp hoặc nâng gói. Nếu muốn giữ Vercel, chủ trung tâm cần làm rõ điều kiện sử dụng/ngoại lệ với nhà cung cấp hoặc xem xét lại ngân sách.

Cloudflare Workers/OpenNext có thể là một hướng khảo sát, chưa phải đề xuất chuyển ngay. Tài liệu hỗ trợ [Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) không đồng nghĩa app hiện tại chạy nguyên trạng: Free giới hạn [100.000 request/ngày, 10 ms CPU/request](https://developers.cloudflare.com/workers/platform/limits/); phải thử renderer Shiki/Markdown, API/Auth, đọc file nội dung, Sharp native, ảnh, cron và Next.js 16.3.8. Runtime Workers không phải Node24 đầy đủ; đổi runtime cần quyết định riêng. Đặt Cloudflare proxy trước Vercel không giải quyết điều kiện Hobby và có thể làm sai tín hiệu Bot Protection.

## Đã đối soát và phần chưa biết

Kiểm tra ngày **15/10/2026, 20:53 giờ Việt Nam**, dùng Node24.19.0, TLS kiểm chứng CA và transaction `READ ONLY`; chỉ lấy dung lượng/catalog và số lượng tổng hợp, không đọc hồ sơ người học.

| Hạng mục | Bằng chứng | Giới hạn kết luận |
|---|---|---|
| Database | `pg_database_size` 17.681.555 byte, khoảng 17,7 MB; các bảng public khoảng 2,75 MB, auth 1,93 MB, csat_internal 0,36 MB | Là dung lượng PostgreSQL tại một thời điểm, không phải đồng hồ quota/billing Supabase |
| Bộ đếm/phiên | Hai bộ đếm đăng nhập đã hết hạn, không có phiên tra cứu tại thời điểm kiểm tra | Không chứng minh không có lưu lượng, cũng không xác nhận đăng nhập thực đã được nghiệm thu |
| Dọn dữ liệu tạm | RPC hiện có xóa bộ đếm/phiên hết hạn khi có request tiếp theo | Không cần thêm cron dọn ngay chỉ vì có hai dòng hết hạn; cần đo trước khi thêm index/job |
| Backup local | Bản mới `F:\csat_backup\supabase-20261015210554-0e1b0d`, archive 926.007 byte; manifest/checksum và giải mã toàn archive đạt; 0 object Storage | Chưa restore bản thật lên Supabase riêng; không đồng nhất kiểm archive với nghiệm thu phục hồi; chưa mã hóa/offsite/tự động lịch |
| Dependency | Runtime audit từ 24 xuống 0; toàn bộ còn 7 dev/build; Sharp 0.35.5, SheetJS 0.20.3 từ vendor; bỏ shadcn CLI nhưng giữ CSS nguyên bản | Registry audit không bao phủ đầy đủ gói CDN; giữ integrity và nguồn; chưa chứng nhận toàn hệ thống an toàn |
| Quyền/SEO production | Bằng chứng cùng ngày: RPC phụ huynh/lưu đơn service-only, bốn bảng kiểm tra có RLS; 15 URL SEO đạt | Chưa kiểm toán toàn bộ bảng/RPC/Storage, không thay staging hoặc nghiệm thu nghiệp vụ |
| Usage/Firewall | Chủ trung tâm xác nhận Usage ổn. Vercel ghi nhận DDoS mitigation hoạt động; đã Publish Bot Protection Log ngày 15/10/2026 | Log không chặn bot; chưa đủ dữ liệu để đặt ngưỡng chặn hoặc kết luận không có tấn công. Không bật custom rate rule/CAPTCHA/Attack Mode |

## Giới hạn phải đưa vào đối soát

Các giới hạn dưới đây đối chiếu tài liệu nhà cung cấp ngày **15/10/2026**, không phải số sử dụng của tài khoản. Kiểm tra lại dashboard trước triển khai vì quota có phạm vi project/team/organization khác nhau.

| Dịch vụ | Giới hạn miễn phí liên quan | Hệ quả cho CSAT |
|---|---|---|
| Vercel tài nguyên | 100 GB Fast Data Transfer; 10 GB Fast Origin Transfer; 1 triệu CDN requests; 1 triệu Function Invocations; 4 giờ Active CPU; 360 GB-giờ memory | Theo dõi riêng từng chỉ số; tối ưu trang tĩnh không loại bỏ chi phí API/SSR |
| Vercel ảnh/đo tốc độ | 5.000 Image Transformations; 300.000 cache reads; 100.000 cache writes; 10.000 Speed Insights events/30 ngày cho team | Biến thể kích thước/chất lượng ảnh cũng tiêu quota; giữ responsive và cache, không tắt tối ưu ảnh toàn cục |
| Vercel bảo vệ/log | DDoS mặc định; Bot Protection có Log/Challenge; tối đa ba custom rules, trong đó một rule rate limit/project với 1 triệu allowed requests; runtime log một giờ | Gộp endpoint trong một rate rule, giữ DB limit; không dựa vào persistent actions hoặc log drains trả phí |
| Vercel cron | Tối đa một lần/ngày cho mỗi cron, chính xác theo giờ | Cron tháng hiện có phù hợp tần suất; không dựa vào phút chính xác hoặc dùng nó làm retry mỗi năm phút |
| Supabase dữ liệu | 500 MB database/project; 1 GB Storage; 5 GB egress và 5 GB cached egress theo phạm vi quota nhà cung cấp | Không gộp thành 10 GB dùng tùy ý; xem Usage organization/project. Vượt database quota có thể vào read-only, ảnh hưởng cả gửi đơn và bộ đếm đăng nhập |
| Supabase vận hành | Tối đa hai project Free hoạt động; pause sau một tuần không hoạt động; API/DB log một ngày; không có backup hằng ngày khôi phục như Pro | Dành một project thử nếu quota tài khoản còn; tự backup/restore và lưu bằng chứng sự cố đã lược dữ liệu. Không dựng ping giả để né pause |
| Supabase Auth/ảnh | 50.000 MAU; Storage Image Transformations không nằm trong Free | Phụ huynh phone-only không dùng Auth nhưng vẫn tiêu API/DB; avatar tiếp tục cần giải pháp xử lý ảnh đã kiểm chứng |

Nguồn: [Hobby/quota](https://vercel.com/docs/plans/hobby), [Bot Protection](https://vercel.com/docs/bot-management), [WAF rate limit](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules), [cron](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase pricing](https://supabase.com/pricing), [billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [database size](https://supabase.com/docs/guides/platform/database-size), [backup](https://supabase.com/docs/guides/platform/backups).

## Phạm vi đã duyệt và tiêu chí đối soát

| Ưu tiên | Đối soát | Cách xử lý sau khi duyệt | Tiêu chí hoàn tất |
|---|---|---|---|
| 0 — nền tảng | Usage ổn theo xác nhận chủ trung tâm; điều kiện Hobby là vấn đề riêng | Không đăng ký dịch vụ trả phí hoặc đổi hosting tự động | Tiếp tục theo dõi quota; chủ trung tâm làm rõ điều kiện sử dụng |
| 1 — thư viện và ranh giới secret | Tái kiểm audit tại lúc sửa, truy call site và dependency tree | Đưa shadcn CLI khỏi runtime nếu không cần; nâng Sharp theo advisory/Node24/Next; lựa chọn bản phân phối hoặc thư viện XLSX được duy trì; thêm guard `server-only` cho module service | Không làm hỏng avatar/Next Image/Excel; client bundle không chứa service key; Node24 guard/test/typecheck/lint/build đạt |
| 1 — header | Kiểm kê Next script/style, video, Supabase, Speed Insights và nhu cầu iframe | Đề xuất `nosniff`, `X-Frame-Options: DENY` nếu không cần nhúng, `strict-origin-when-cross-origin`; CSP Report-Only có phạm vi trước khi enforce | Không đổi public static rendering thành dynamic chỉ để thêm nonce; giao diện/Auth/form/video hoạt động; lỗi report không chứa PII |
| 1 — quyền và phiên | Ma trận route/API/RPC/RLS, hồ sơ khóa/chéo học sinh/lớp, bản công bố và thu hồi phiên | Vá đúng đường truy cập nếu phát hiện; giữ private/no-store/noindex và kiểm quyền mỗi request | Fixture ngoài quyền đều bị từ chối; không cache dữ liệu phụ huynh chung; chưa đóng SEC-02 |
| 1 — backup/restore | Kiểm tra archive, phạm vi public/csat_internal/Auth/Storage, checksum và bản gần nhất | Tạo backup mới trước migration; thử restore trên project riêng, kiểm quyền/RPC/liên kết, sao chép Storage object riêng khi có | Biết phần nào phục hồi được, thời gian mất dữ liệu tối đa chấp nhận được; không restore đè production |
| 2 — bot | Quan sát request theo path/method, tỷ lệ lỗi, thiết bị/NAT và bot đã xác minh | Bot Protection Log trước. Một rule rate limit gộp POST `/api/auth/login`, `/api/parents/auth`, `/api/consultations`; ngưỡng khởi điểm để quan sát có thể 60/IP/phút, chỉ chặn sau hiệu chỉnh bằng lưu lượng thật | Không cản người dùng hợp lệ/Googlebot/SEO; giữ DB 10 identity + 50 source/15 phút cho đăng nhập, intake có budget riêng; có rollback rule |
| 2 — quota và tải DB | Theo dõi egress/CPU/ảnh, query chậm, response size, bảng tạm và audit | Giữ catalog/bài/ảnh công khai tĩnh; phân trang và giảm field/polling thừa theo bằng chứng; không cache nội dung riêng tư công khai hoặc xóa lịch sử học phí để giảm dung lượng | Đối chiếu trước/sau cùng tải hợp lệ; quyền và bố cục không đổi; không benchmark tải lên production |
| 3 — CAPTCHA | Đã duyệt chỉ cho đăng nhập, mã local có | Chủ tài khoản tạo widget Managed và lưu cấu hình; phát hành rồi nghiệm thu Cloudflare thật | Hết hạn/retry/không JS có phương thức liên hệ; không thêm CAPTCHA vào đăng ký/tư vấn |

SEC-02: người biết đúng số phụ huynh vẫn có thể xem dữ liệu liên kết. Bảo vệ tầng mạng không xác minh danh tính; giữ quyết định phone-only và ghi rủi ro minh bạch. Nếu chủ trung tâm muốn thay đổi sau này, duyệt riêng mã truy cập hoặc cơ chế xác minh. SEC-01: mật khẩu khởi tạo gia sư cần quy trình đổi/mời phù hợp; chưa reset hàng loạt.

## Cách đối soát quota và backup với chi phí thấp

1. Đọc dashboard Usage trong cùng kỳ: Vercel requests/transfer/CPU/invocations/images; Supabase database/Storage/egress/cached egress. Lưu tổng hợp đã lược thông tin riêng, không chụp màn hình env/secret. Ảnh/file trong repo không tính vào Supabase Storage nhưng vẫn tiêu lưu lượng hosting.
2. Đề xuất ngưỡng nội bộ 70% để xem nguyên nhân, 85% để giảm tải không thiết yếu và thống nhất phương án trước khi chạm giới hạn. Đây là ngưỡng vận hành đề xuất, chưa có alert tự động. Không tự ngắt đăng nhập, xóa lịch sử hay tắt tiếp nhận đơn để đạt ngưỡng.
3. Dựa vào tốc độ thay đổi dữ liệu để duyệt lịch backup. Có thể bắt đầu hằng ngày khi phát sinh thu phí/đơn/lịch học và trước mọi migration; đo dung lượng egress của backup để hiệu chỉnh. Giữ bản mã hóa tại máy và một bản ngoài máy được phân quyền; checksum không thay mã hóa. Thời gian lưu và xóa backup cũ cần chủ trung tâm chốt, chưa tự xóa.
4. Database dump không chứa bytes object Storage. Dump public/csat_internal cũng không tự khôi phục đầy đủ Auth. Phải có manifest phạm vi và thử phục hồi; không để backup/khóa giải mã vào GitHub Actions artifacts hoặc repo. Chưa dựng lịch tự động trong phạm vi lập phương án.
5. Chưa có staging: ưu tiên project Free thứ hai nếu tài khoản còn suất; chỉ dùng fixture giả. Kiểm thử PostgreSQL local tiếp tục hữu ích nhưng không thay nghiệm thu Supabase thật.
6. Khi sự cố xảy ra, lưu sớm lỗi/request ID/thời gian/path đã lược PII vì log miễn phí ngắn; không lưu body, số điện thoại, cookie hay token vào log. Không tự thêm dịch vụ log trả phí hoặc ghi mọi request vào database nhỏ.

## Kết quả triển khai và điều kiện phát hành

- Dependency/guard/header và deferred Excel đã hoàn thành mã local. Header CSP chỉ Report-Only, chưa enforce; không làm public route mất static rendering. Bốn export handler chỉ tải SheetJS khi bấm; workbook giữ định dạng/số liệu. Không đổi query/index chỉ vì quota: danh sách tiếp nhận và nhận xét đã có phân trang, chưa có bằng chứng truy vấn chậm cần sửa.
- Bot Protection Log đã áp ngay trên Vercel; AI Bots giữ Allow, không thêm Challenge hoặc bypass. Sau khi có lưu lượng đại diện, xem path/method/tỷ lệ hợp lệ trước khi tạo một custom rate rule hay chặn; ngưỡng 60/IP/phút trong bảng chỉ là đề xuất. Không tự đặt lịch theo dõi/notification ngoài yêu cầu.
- Backup mới bao gồm Auth/public/csat_internal và metadata Storage, manifest 0 object nên không có bytes object cần tải. Bản thật chưa được restore. Kiểm thử PostgreSQL dùng dữ liệu giả có backup/restore riêng, không thay nghiệm thu bản production. Không restore đè production; không tải dữ liệu thật lên project thử dùng fixture.
- Chạy Node24 guard, repo/database tests, typecheck, lint strict và build cho đợt sửa mã; Edge mobile/desktop kiểm menu, đăng ký, đăng nhập, ảnh, video, tải Excel, no-JS/reduced motion và link SEO. Avatar cần Storage thử thật; thử quyền/phiên trên Supabase riêng.
- Giữ tên/ID lớp, C01–D07, nháp/công bố, revision và lịch sử tài chính; không chạy lại migration đã phát hành. Nếu cần SQL, tạo migration mới theo số cuối lúc triển khai.
- Bằng chứng local Node24.19.0: guard, typecheck, lint strict, build đạt; database/API 266 ca đạt sau chạy lại ba ca bị sandbox chặn thao tác tệp/initdb. Repo 16 ca đạt sau chạy lại hai ca sandbox chặn Git fixture; thêm 4 kiểm thử round-trip Excel đạt. HTTP SEO/header 15 public URL, 4 liên kết bổ sung, 9 alias, 5 private path đạt. Edge public 28 nhóm/689 assertions có một ca hover glyph không ổn định; chạy riêng ca đó và đăng nhập đạt 2 nhóm/33 assertions. Ghi giới hạn này thay vì coi lần chạy tổng đã xanh hoàn toàn. Bằng chứng và phần QA bổ sung ở PROJECT_STATUS.
- Trước phát hành: xác nhận bộ mã đã duyệt, theo dõi CI, kiểm header/dependency đúng trên deployment mới. Không suy cấu hình Header local là đã có trên production. Chưa commit/push/deploy đợt vá này.

Phần còn chờ: Supabase staging/Storage thật, môi trường phục hồi được phép chứa bản sao dữ liệu thật, mã hóa/offsite/lịch và thời hạn lưu backup; quan sát bot trước khi chặn; bảy advisory dev/build; giải quyết điều kiện Hobby. Không cần chạy migration hoặc cấp lại tài khoản trong đợt này. CAPTCHA đăng nhập đã có mã local, chờ cấu hình và phát hành theo LOGIN_CAPTCHA.
