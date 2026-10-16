# Tiến độ và việc tiếp theo

Đầu mối cho trạng thái triển khai, bằng chứng và backlog. [Quyết định](DECISIONS.md) và [kiến trúc](ARCHITECTURE.md) mô tả hướng đi và hợp đồng; không thay bằng chứng môi trường. Đây là tổng hợp các lần kiểm chứng đã ghi nhận, không phải kiểm tra production liên tục.

## Trạng thái theo chức năng

| Phần | Đã có | Còn thiếu / giới hạn |
|---|---|---|
| Website công khai | Giới thiệu, A/B/C/E/K, chi tiết, đăng ký, thành tích, đội ngũ, bài viết, học liệu; thiết kế neobrutalism/playful edtech | Học liệu chưa tự gửi; CMS không thuộc phạm vi; hai poster thành tích trùng tên/trường chưa công bố |
| Trang Tự học | Đã phát hành `/tu-hoc` và mục Tự học riêng trên menu chính; URL cũ chuyển hướng 308: 43 chủ đề/13 chặng, tìm không dấu, lọc A/B/C, nền tảng/nhánh học tiếp và liên kết CSATOJ; [đối chiếu nguồn](KNOWLEDGE_MAP.md) | Đã deploy ngày 16/10/2026; không đổi quyền bài phụ huynh hoặc tích hợp API OJ; PDF đối chiếu các phần liên quan, chưa review toàn sách |
| Đăng ký & tư vấn | Production bật nhận đơn, lưu chung qua intake v2; admin tìm/lọc/phân trang và cập nhật revision/audit | Chưa nghiệm thu một đơn hợp lệ đến admin bằng phiên thật; email đơn mới chưa triển khai |
| Chương trình lớp | Mã A/B/AB/C/E/PREVOI/K, giữ tên/giáo án/lịch sử; C gồm C01–D07 | E/K/PreVOI chờ nội dung; K phối nguồn/version vẫn là đề xuất |
| Phụ huynh | Tra cứu số điện thoại, phiên lookup 12 giờ, quyền học sinh–lớp và bản công bố; migration 27 đã có | Chưa nghiệm thu phiên thật đầy đủ; liên hệ thiếu cần admin bổ sung; không xác minh sở hữu số (SEC-02) |
| Chuyên đề | Đã phát hành 43 chủ đề/54 bài Markdown riêng tư; đã bổ sung chuẩn hóa Luyện tập, 13 đoạn kiểm chứng/phản ví dụ, 43 tag CSATOJ, giao diện roadmap/bài đọc neo-brutalism; [đối chiếu từng bài](PARENT_LESSON_AUDIT.md) | Gói nội dung/UI mới đã deploy; chưa có E/K; không CMS; nghiệm thu hồ sơ thật và chất lượng từng bài OJ còn chờ |
| Đăng nhập/CAPTCHA | Turnstile cho hai vai trò, Siteverify tại API; widget thật nhận kết quả, thiếu token bị chặn | Chưa gửi token hợp lệ qua Siteverify cùng tài khoản thật để nghiệm thu toàn luồng |
| Bảo vệ và giảm tải | Header, server-only guard, Sharp/SheetJS, Excel tải theo thao tác; Bot Protection Log | CSP chưa enforce; chưa Challenge/WAF rule; còn advisory dev/build |
| SEO/hiệu năng | Metadata, canonical, schema, sitemap, robots, llms, ảnh chia sẻ và tối ưu JS/CSS/ảnh đã phát hành | Chủ trung tâm quản lý Search Console; chưa kiểm chứng index/CWV thực, LCP lộ trình còn cần cải thiện |
| Hồ sơ/avatar | Mã và kiểm thử fixture có sẵn | Migration 22/bucket/policy và Supabase Storage thật chưa nghiệm thu |
| Email | Có nền outbox/cron; chủ trung tâm đã thêm `portal.csatoj.vn` vào Resend, DNS gửi đã có | Chưa xác nhận Verified/Sending enabled và Gmail nhận; guard gửi thử còn domain cũ; MAIL-01/02 chưa sửa; intake v2 chưa tạo thông báo |
| CSATOJ | Repo OJ đã có API sync contest; Portal có kiểu `ParentOJMetrics` | Portal chưa có adapter/mapping; API nguồn cần bổ sung hợp đồng định danh, phân trang và quyền trước tích hợp; chưa kiểm chứng endpoint hosted |

## Bằng chứng gần nhất

Gói frontend được chủ trung tâm cho phép phát hành ngày 16/10/2026: Tự học, chuẩn hóa chuyên đề, menu icon màu (Tự học sau Bài đăng; giữ caption desktop, Lộ trình đậm), nền chung và khối Gia sư gọn. Local Node 24.19.0: build/typecheck/lint strict đạt, repo 24/24; toàn bộ browser phụ huynh 36 nhóm/4.079 assertions (gồm 54 bài và các hồi quy form/admin giả); public 19 nhóm/217 assertions, Tự học 128, CAPTCHA 30; menu 16 bố cục 375–1920 px không tràn/không đổi chiều cao, dark/print/zoom 200% đạt. Production `e20368a` đã Ready; kiểm HTTP/CSS tại tên miền thật đạt. CI đầu tiên dừng ở test sitemap cũ (15 thay vì 16 trang); test đã được cập nhật, chờ lượt CI mới. Không đổi API/migration/công tắc email; không chạy DB tests local cho gói thuần UI/nội dung.

Chỉ giữ ngày để phân biệt độ mới của kiểm chứng môi trường. Lịch sử từng lần sửa, log và dữ liệu đối soát chi tiết nằm trong Git/kho nội bộ.

| Môi trường / phạm vi | Bằng chứng | Kết luận có thể dùng |
|---|---|---|
| Frontend production · 16/10/2026 | Commit `e20368a`; [Vercel Ready](https://vercel.com/thiennhan13s-projects/cty-gia-dinh-csat/7bVfDyARD7CrWiYF9DhmwSXqQ4hm); [CI](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/runs/38881023159) đầu tiên dừng ở test sitemap cũ; bản vá test đang được xác minh. Tám URL công khai/SEO 200, HTML/CSS menu/nền mới đã có; URL cũ 308 giữ query; `/parents` và bài riêng tư thiếu phiên trả 307 về login | Đã phát hành Tự học, nội dung/chuyên đề, menu và nền phụ huynh. Không thay API/schema/env/email. Quyền chi tiết/54 bài kiểm bằng fixture, chưa nghiệm thu phiên phụ huynh thật. Node 24.19.0 local; hosted patch version chưa đọc được trực tiếp do công cụ browser bị tắt. Mốc rollback app trước: `f227122` |
| Chuẩn hóa chuyên đề local · 16/10/2026 | Node 24.19.0: build/typecheck/lint strict/guard đạt; repo 24/24. 89/89 khối C++ biên dịch, 78.321 ca thuật toán độc lập và 21 kiểm tra ví dụ đạt. Edge bản cuối: 36 nhóm/4.079 assertions, đủ 54 bài, không JS error/request ghi ngoài mock | Fixture tổng đã đạt, gồm quyền/series/ngữ cảnh, responsive/dark/bàn phím/no-JS/in và hồi quy form/admin. Các timeout login cũ được sửa bằng cấu hình CAPTCHA rõ ràng ở fixture; CAPTCHA giả riêng 30 assertions. Không chạy DB tests local vì không đổi contract. [Bằng chứng nội dung](PARENT_LESSON_AUDIT.md#bằng-chứng-qa-local) |
| Bản đồ tự học local · 16/10/2026 | Node 24.19.0: build placeholder/typecheck/lint strict đạt; repo guard 584 tệp không finding, diff check đạt. Repo 21/23 trong sandbox; 2 ca git init bị chặn, chạy lại file guard ngoài sandbox đạt 6/6. Sau khi tách Tự học, 8/8 tests bản đồ/SEO, build/typecheck/lint đạt; Edge trên bản build đạt 128 assertions: 320/375/768/1280/1281/1440 px, sáng/tối, tìm/lọc, liên kết, history, bàn phím, no-JS, menu riêng và chuyển hướng giữ query/hash; không JS error/asset lỗi/request ghi | QA bằng demo loopback `/tu-hoc`; trạng thái production ở hàng trên. Đã xem ảnh desktop và chủ đề mobile. Không chạy test DB vì không sửa backend/contract, chưa tạo PR. Chưa đo Lighthouse/CWV hoặc nghiệm thu toàn site |
| Ứng dụng production · 16/10/2026 | Gói `39fbb36`, bản vá `c6fc0cc`; [Vercel](https://vercel.com/thiennhan13s-projects/cty-gia-dinh-csat/3dSkoFywcEJtNmnmQQNd4N6eJUQ8) thành công; [CI](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/runs/38774167678) đạt cả Quality Node24 và PostgreSQL17 Windows | CAPTCHA/header/dependency/Excel đã phát hành; widget hai vai trò tự xác minh, API thiếu token trả 403 không cookie; các trang chính/sitemap/robots trả 200. Chưa đăng nhập thật |
| Local/CI của gói trên | Node24 build/typecheck/lint strict/guard đạt; database/API 270/270, repo 20/20; CAPTCHA Edge fixture 30 assertions; Portal fixture 17 nhóm/133 assertions | Dữ liệu giả, không thay Supabase staging hoặc tài khoản thật. Ca public glyph từng không ổn định đã chạy lại riêng đạt; không coi lần tổng đó xanh hoàn toàn |
| Database production · 15/10/2026 | Registry `csat_internal.schema_migrations`: 05–18, 20, 23–27; RPC phiên/lưu đơn service-only; RLS bật trên bốn bảng được kiểm tra | Không chạy lại migration đã có. 19/21/22 thuộc email/hồ sơ riêng; chưa kiểm toán toàn bộ schema/Storage |
| Dữ liệu vận hành · lần đối soát 14/10/2026 | Các lớp đã có mã; còn 10 học sinh trong phạm vi thiếu liên hệ hợp lệ | Số liệu là snapshot, cần đối soát lại trước sửa. Auth phụ huynh từng cấp được giữ làm lịch sử, không dùng cho đăng nhập hiện hành |
| SEO/hiệu năng production · 15/10/2026 | Bản `2171653`: 15 URL SEO đạt; Lighthouse ba lượt/trang: trang chủ 95 điểm, LCP 2,46 s; lộ trình 90 điểm, LCP 2,98 s; CLS 0 | Số đo lab, không phải INP/CWV thực hoặc cam kết điểm cho bản mới. [Chi tiết](PUBLIC_PERFORMANCE_QA.md) |
| Vận hành · 15/10/2026 | Bot Protection Log đã Publish; backup `F:\csat_backup\supabase-20261015210554-0e1b0d` kiểm archive/checksum đạt; audit runtime 0, dev/build còn 7 | Backup chưa restore thật/mã hóa/offsite; audit chỉ đúng thời điểm kiểm tra. [Quy trình vận hành](FREE_TIER_OPERATIONS.md) |
| Staging | Chưa có Supabase thử riêng; chủ trung tâm chấp nhận ghi nghiệm thu còn chờ | Không gắn nhãn staging đạt từ test PostgreSQL/fixture |
| Resend/Cloudflare · 16/10/2026 | Chủ trung tâm xác nhận domain Resend `portal.csatoj.vn`. DNS công khai: NS Cloudflare; TXT DKIM tại `resend._domainkey.portal.csatoj.vn`; `send.portal.csatoj.vn` CNAME đến `send.forge.rmta.net`, đích có SPF/MX | Có cấu hình DNS, chưa xác nhận trạng thái trong Resend, key/env deployment hoặc thư thực nhận. Truy vấn DMARC riêng tại `_dmarc.portal.csatoj.vn` và `_dmarc.csatoj.vn` đều NXDOMAIN; cần chốt chính sách trước phát hành email |
| Mã CSATOJ · 16/10/2026 | Đọc repo `D:\Cty_gia_đình_CSAT\csat-oj`, HEAD `c4138ee3`, working tree sạch; có bốn route `/api/v2/sync/contest/...`, kiểm global key và test nguồn | Cờ mặc định `VNOJ_ENABLE_SYNC_API=False`, CI đặt True. Chưa chạy Django/MySQL tests hoặc xác minh cấu hình/API hosted; không coi có mã là đã bật API. Chi tiết hợp đồng tại [FUTURE_INTEGRATIONS](FUTURE_INTEGRATIONS.md#5-tích-hợp-api-csatoj) |

Kiểm chứng lại ngày 16/10/2026 trên working tree tại `f227122`: dùng Node **24.19.0** có sẵn vì Node mặc định của shell là **26.10.0**. Guard 575 tệp không có finding; typecheck/lint strict/build placeholder đạt. Repo đạt 18/20 và DB/API đạt 267/270 ở lượt sandbox; các ca còn lại bị chặn `git init`/rename/initdb, chạy lại riêng ngoài sandbox đều đạt (guard 6/6, email mock 3/3, PostgreSQL17 concurrency/restore 1/1). Đây là tổng hợp lượt chạy và chạy lại, không phải một lượt suite xanh duy nhất. CAPTCHA Edge fixture đạt 30 assertions. Restore chỉ dùng database giả, không xác nhận backup production phục hồi được.

Public Edge QA trên bản build placeholder cùng lượt đạt **21 nhóm/16 layout/330 assertions**: bốn route chính ở 375/1440 px, light/dark, no-JS, menu bàn phím, selector/history, catalog và form. Đã xem ảnh hero desktop và selector mobile dark; không có JS error, asset lỗi hoặc request ghi ngoài mock. Chỉ là nhóm kiểm tra chọn lọc, chưa chạy lại toàn bộ public/reduced-motion/Portal QA. Báo cáo và ảnh local ở `scratch/public-release/`, không đưa vào runtime/Git.

Đọc lại sáu URL công khai `/`, `/lo-trinh`, `/dang-ky-hoc`, `/login`, `/sitemap.xml`, `/robots.txt` ngày 16/10/2026: HTTP 200, có CSP Report-Only và nosniff. Chưa đối soát lại registry/dữ liệu production, phiên thật, CI/deployment mới hoặc patch version Function hosted trong lượt này. Search Console đã kết nối theo chủ trung tâm; việc xác minh/gửi sitemap do chủ trung tâm phụ trách, chưa kiểm tra index trong Google.

## Thứ tự ưu tiên

1. Nghiệm thu CAPTCHA → đăng nhập thật cho phụ huynh và gia sư/admin; thử phiên, liên kết và quyền đọc chuyên đề.
2. Nghiệm thu một đơn đăng ký hợp lệ đến admin, thử retry và cập nhật trạng thái; tiếp tục giữ email tắt.
3. Tạo môi trường Supabase thử và môi trường phục hồi được phép; đối soát liên hệ thiếu, quyền và backup.
4. Triển khai từng phạm vi backend còn chờ sau khi duyệt: email, hồ sơ/avatar, CSATOJ. Tách module lớn khi sửa đúng nghiệp vụ, không refactor hàng loạt.
5. Tiếp tục nội dung E/K/PreVOI và tối ưu hiệu năng theo dữ liệu thật; giữ thiết kế, quyền và chức năng.

## Backlog có điều kiện hoàn thành

| ID | Công việc | Điều kiện đóng |
|---|---|---|
| AUTH-01 | Nghiệm thu login có Turnstile | Hai vai trò đăng nhập thật, retry/expiry/thu hồi; không lộ token/dữ liệu |
| INTAKE-01 | Nghiệm thu nhận đơn | Lưu một lần, admin thấy đúng nguồn/khóa, cập nhật có revision; không outbox/mail |
| UI-01 | Lỗi form đăng ký theo từng trường | `PublicConsultation` hiện chỉ dùng thông báo lỗi chung, chưa dùng `fields` của API 422. Gắn lỗi với trường, trạng thái invalid và focus phù hợp; giữ bản nhập/request ID, kiểm chứng bàn phím và retry bằng fixture |
| SEC-01 | Mật khẩu khởi tạo gia sư đang là số điện thoại | Duyệt và kiểm chứng cơ chế mời/đổi mật khẩu, xử lý tài khoản cũ; không reset hàng loạt |
| SEC-02 | Tra cứu số điện thoại không chứng minh danh tính | Giữ rủi ro minh bạch; chỉ đóng khi có quyết định và cơ chế xác minh phù hợp. CAPTCHA không giải quyết mục này |
| DB-01 | Staging và tương thích migration | Kiểm chuỗi tối thiểu/đầy đủ, quyền, projection, concurrency và bảo toàn dữ liệu |
| PROFILE-01 | Hồ sơ/avatar | Migration/bucket/policy và upload/thay/gỡ/lỗi DB–Storage trên Supabase thử |
| PARENT-01 | Portal thực tế | Nhiều con/lớp, published/thu hồi, nhận xét, phí thiếu/chốt/hoàn, mobile/keyboard/print |
| MAIL-01 | Tuổi thư tổng hợp admin | Hạn theo vòng đời loại thư, thử đợt >7 ngày và qua tháng |
| MAIL-02 | Retry sau worker crash | Reclaim giữ khoảng cách 5 phút; lease cũ không ghi đè mới |
| MAIL-03 | Gửi mail và đơn intake v2 | Xác nhận Resend cho `portal.csatoj.vn`, chốt địa chỉ From và cập nhật guard/test đang dùng `notify.csatoj.vn`; Gmail nhận thật; triển khai hợp đồng thông báo intake v2 riêng, không chỉ bật cờ cũ |
| OPS-01 | Phục hồi và vận hành | Restore thử, mã hóa/bản ngoài máy/lịch lưu được duyệt; xác minh ruleset và điều kiện hosting |
| DEP-01 | Advisory dev/build | Đối chiếu upstream/đường sử dụng, vá tương thích và kiểm thử; không downgrade cưỡng ép |
| DATA-01 | Liên hệ và dữ liệu vận hành | Admin xác nhận liên hệ/trạng thái, sửa có audit; không tự dùng số học sinh làm số phụ huynh |
| ARCH-01 | Module quản lý lớp lớn | Tách query/action/validation/UI theo nghiệp vụ, giữ quyền và test |
| OJ-01 | Nối API CSATOJ đã có ở repo nguồn | ID ổn định, mapping học sinh–lớp–contest có audit; chốt solved/total/rank/freeze; cursor không mất dữ liệu, key có phạm vi, timeout/cache/429; kiểm thử cả OJ và Portal trên môi trường thử; thiếu là null, ranking không suy thành thạo |
| CONTENT-01 | Nội dung mở rộng | Giáo trình/học phí E và nội dung K/PreVOI được duyệt; xác nhận hai poster thành tích đang loại khỏi runtime |

Không dùng backlog như ủy quyền triển khai. Khi cập nhật, thay trạng thái đúng dòng, ghi phạm vi/mã/môi trường/kết quả và phần chưa thử; không nối thêm nhật ký hoặc lặp toàn bộ log kiểm thử.
