# Trạng thái hiện tại và việc tiếp theo

Tài liệu này duy trì trạng thái và bằng chứng; quyết định thiết kế ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md), nghiệp vụ tuyển sinh ở [catalog](PUBLIC_COURSE_CATALOG.md). Ba luồng backend và hướng dẫn chuyển đổi ở [BACKEND_COMPLETION](BACKEND_COMPLETION.md). Không nối thêm nhật ký theo từng lượt sửa.

## Phạm vi đang làm

Ưu tiên kiểm chứng ba luồng backend đã được duyệt: đăng ký public qua intake v2 không outbox/email; mã chương trình A/B/AB/C/E/PREVOI/K (AB hiển thị A+B); Supabase Auth phụ huynh bằng phone/password với cấp tài khoản có đối soát. Production đã có migration18/24/25/26 và đã cấp 44 tài khoản phụ huynh theo ủy quyền; ứng dụng backend mới chưa deploy. Giữ tên lớp, giáo án, nháp/công bố, C01–D07/scope CD và lịch sử tài chính. PreVOI/HSGQG/Ôn thi VOI dùng giáo án riêng, không E.

Chưa có Supabase staging; người dùng đã chốt **nghiệm thu còn chờ**. Người dùng tự chạy SQL và sau đó ủy quyền cấp tài khoản thật, đối soát ngày 14/10/2026; chưa ủy quyền deploy trong lượt này. Migration26 đã đóng lookup chỉ bằng số và thu hồi phiên cũ, nên cần tiếp tục phát hành ứng dụng tương thích trước khi mở lại đăng nhập phụ huynh; email tắt.

| Backend trong mã | Điều kiện còn lại |
|---|---|
| Đăng ký lưu API/RPC, idempotency/rate limit/consent, admin trạng thái có revision/audit | Staging end-to-end, migration18/24 và bật tiếp nhận riêng; học liệu giữ sao chép/liên hệ |
| Mã chương trình, tạo lớp tương thích và lịch sử phân loại | Đối soát mã null; nghiệm thu bảo toàn lớp/giáo án trên staging; E/K không tự có giáo trình |
| Auth phụ huynh, phiên gắn Auth, đổi mật khẩu tùy chọn; script dry-run/apply đúng project và trang admin đối soát | Supabase Auth thật, cấp tài khoản/retry, thu hồi phiên và bàn giao thông tin đăng nhập an toàn; SEC-02 vẫn mở |

Đã biên soạn đủ **54 bài cho 43 chủ đề A/B/C** theo kế hoạch đã duyệt; E/K bổ sung sau. Giữ trang phụ huynh tóm tắt; chỉ mở bài thuộc giáo án chuẩn đã công bố trong phạm vi phiên. Bài có bảng/sơ đồ/code với namespace std ngầm định, hai câu tự kiểm tra mở đáp án, nguồn đọc thêm ngắn và video liên quan đã xác minh. Nội dung vẫn lưu Markdown trong repo; đã chốt không dùng DB/CMS cho nội dung. Renderer import riêng C++/theme, cache phần thân bài trên worker và vẫn kiểm tra quyền mỗi request. Migration 23 thêm số buổi lớp để hiển thị chặng định hướng đã áp production 08/10/2026, không kéo theo email/avatar. Chi tiết và số liệu dung lượng ở [chuyên đề phụ huynh](PARENT_TOPICS.md).

Mã ứng dụng `3b3258d` đã commit/push và Vercel báo Production success 08/10/2026: [deployment](https://cty-gia-dinh-csat-l4ebi3yul-thiennhan13s-projects.vercel.app), domain [portal.csatoj.vn](https://portal.csatoj.vn). Thư viện 54 bài và renderer đã phát hành; E/K vẫn chờ nội dung. CI phát hành [GitHub Actions](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/runs/37751875033) đã xanh: Quality Node24 (build, public smoke, private topics) và PostgreSQL17/Node24. Kết quả kiểm tra thật và giới hạn bên dưới.

## Frontend hiện có

Favicon bo góc đã cập nhật trong mã local: SVG và PNG/ICO, giữ logo CSAT, metadata đổi phiên bản URL để làm mới cache. Node24: typecheck, lint phần sửa, guard/diff và Edge kiểm tra metadata/tải đủ ba định dạng đạt; góc PNG và ba frame ICO trong suốt. Chưa phát hành thay đổi favicon lên production; không chạy lại build/database cho thay đổi tài nguyên này.

| Phần | Trạng thái mã hiện tại | Việc còn lại |
|---|---|---|
| Giới thiệu | Hero/đội ngũ, bốn lý do học thi đấu, hệ sinh thái terminal bốn nhánh, sáu bước buổi học, phụ huynh và tư vấn | Hoàn thiện tiếp theo góp ý; không thêm chỉ số chưa có nguồn |
| Tìm hiểu lộ trình | Năm lớp A/B/C/E/K, selector, ảnh nền tĩnh, tag, roadmap; A/B/C giữ các ô nội dung học, bỏ dòng “Kiến thức nối tiếp · Tư duy phát triển”; E nổi bật trong một khối, K ba ô ngang khi đủ chỗ | Nội dung mới phải bám catalog/giáo trình; không phục hồi A+B công khai |
| Chi tiết lớp | Poster flexible, breadcrumb một hàng, ba khối facts, chặng editorial có mũi tên; mục tiêu cuối khoá trước tư vấn, blob theo lớp | Tiếp tục UI theo chỉ dẫn; giáo trình chi tiết E chưa được cung cấp |
| Đăng ký học | Bố cục thẻ 3/2/1 cột, khóa mặc định, xem lại/consent và gửi API intake v2 trong mã mới | Chưa nghiệm thu staging/production; học phí E và nội dung K trao đổi cùng CSAT |
| Thành tích | Bố cục 3 đã duyệt, HTML tĩnh, 15 mục có căn cứ và WebP responsive; ảnh vuông cạnh nhãn, lưới 3/2/1, hero/art co giãn | Hai poster trùng tên/trường chờ xác nhận; chưa có quản trị database |
| Đội ngũ/bài đăng | Đội ngũ dùng chung component; bài viết lấy danh mục frontend | Quản trị bài viết là tích hợp tương lai |
| Học liệu | Video writing tối ưu, form chuẩn bị nhu cầu, liên hệ hoạt động | Chưa có gửi tài liệu tự động hoặc danh sách tải được duyệt |
| Liên lạc | Switch Phụ huynh/Gia sư dùng handler hiện hành; không dock/lời mời học liệu tại login | Giới hạn xác thực thuộc SEC-01/02, không được coi sửa UI là đã giải quyết |

## Bằng chứng kiểm chứng

Sau bổ sung RLS migration26: 6/6 kiểm thử database có ca cấp nhầm GRANT nhưng RLS vẫn chặn client, 22/22 API/provisioning và 1/1 PostgreSQL17 native/concurrency/restore với fixture giả đạt trên Node24. Guard 544 tệp và diff check đạt. PostgreSQL native được chạy lại ngoài sandbox sau lỗi initdb của môi trường hạn chế. Không chạy lại build/browser/typecheck vì lượt này chỉ sửa SQL, test và tài liệu; Supabase Auth thật và restore bản backup production vẫn chưa nghiệm thu.

Kiểm chứng backend hiện tại trên Node24: guard 544 tệp không có findings; repo tests 11/11, database/API 256/256 không skip/cancel (có PostgreSQL17 native, concurrency, backup/restore và pre/postflight trên cả hai thứ tự migration tùy chọn), typecheck, lint strict, build cuối và diff check đạt. Browser QA có 32 nhóm/3.752 assertions và đăng ký public 2 nhóm/119 assertions. Smoke bản build cuối trên Edge155 đạt 14 nhóm/167 assertions ở 375/768/1440 px: đăng ký/retry/consent/idempotency, mật khẩu/retry, dữ liệu admin cũ, conflict/revision, phân loại A+B→K và chặn phiên lookup-only/sai role; không lỗi browser hoặc request bất ngờ. Đây là fixture local; tại lần kiểm thử đó provisioning thật chưa chạy. Production đã cấp tài khoản theo đối soát bên dưới, còn nghiệm thu đăng nhập/đổi mật khẩu và deploy. Kết quả lịch sử dưới đây không thay bằng chứng của bản backend mới.

Các kết quả dưới đây thuộc những bản local đã kiểm chứng trước đợt backend này; không phải số liệu production hoặc chứng nhận WCAG. Runtime hiện hành đã chốt Node 24; các báo cáo UI chi tiết trước đây được chạy trên Node 26, cần phân biệt với kiểm chứng mới.

| Phạm vi | Môi trường và kết quả |
|---|---|
| Runtime hiện hành | Node.js 24.19.0: TypeScript, lint strict và build 70 trang với placeholder Supabase/email tắt đạt; cài sạch `npm ci` và build lại đạt. .nvmrc/engines/CI dùng 24 |
| Chuyên đề phụ huynh, local 08/10/2026 | Node 24.19.0/Next16.3.8: guard 525 tệp, 11/11 repo tests, 243/243 database/API không skip, typecheck/lint strict/build đạt. 54 Markdown trong Next tracing; 89 khối C++ compile đạt, chạy thuật toán thực đối chiếu độc lập đạt. Edge 20 nhóm/3.600 assertions, HTML nội bộ toàn thư viện ngoài Git. Phạm vi, số liệu và giới hạn tại [chuyên đề](PARENT_TOPICS.md) |
| Thành tích hiện hành | Browser bản build loopback: 80 bố cục / 1.594 assertion; 320–1920 px, hai theme/hai motion, no-JS, ảnh vuông, art tăng 10%/căn tâm, hover, navigation/history; đã xem ảnh desktop/mobile |
| Chi tiết lớp | QA responsive nền: 135 bố cục / 1.134 assertion; chỉnh thứ tự mục tiêu/câu lịch/blob: 75 bố cục / 992 assertion. Bao gồm ngang/dọc, no-JS, bàn phím, curriculum A9/B15/C19 |
| Tổng quan lộ trình | Hồi quy 12 bố cục / 657 assertion: client navigation/CSS load order, ảnh/hashtag/reveal/điều hướng mục |
| Bộ nghiệp vụ nền | Node 24.19.0: 238/238 database/API, không skip, gồm PostgreSQL native/concurrency/restore trên DB tách biệt. Đã bỏ 18 lượt chạy lặp do import helper; giữ đủ ca kiểm thử gốc |
| Tài nguyên Thành tích | Tải đủ 15 ảnh ở DPR2: 375 px 218.028 byte; 1440 px 526.262 byte, không gồm HTML/CSS/font. Không đo lưu lượng người dùng thực |

Rà soát chuẩn bị phát hành: Node 24.19.0, guard 450 tệp không phát hiện lỗi, liên kết Markdown hợp lệ, 6/6 test guard và diff check đạt. Public smoke local trên Edge: 40 nhóm / 32 bố cục, 477 assertion giao diện đạt; không lỗi JS/asset/request ghi. Theo quyết định chủ trung tâm, đã gỡ Chromium thử nghiệm khỏi local; local dùng Edge, CI dùng Chromium riêng trên runner. CI bổ sung Playwright khóa version/Chromium smoke, lint strict và private topics. CI trước phát hành lỗi do kiểm tra option trước khi portal mount; đã thêm đợi hiển thị, smoke Edge mới đạt. CI mã ứng dụng 3b3258d đã chạy thành công trên GitHub, gồm private topics và PostgreSQL native. Script preview giữ môi trường provider, dùng placeholder và tắt gửi. Smoke phát hành mới: Edge public 40 nhóm/478 assertions đạt. Không dùng kết quả này để suy nghiệm thu toàn bộ nghiệp vụ production.

Báo cáo/ảnh QA giữ trong scratch ngoài Git; các đường dẫn đó chỉ là dấu vết trên máy, không là dependency onboarding. Không có JS/asset lỗi hoặc request ghi không mong muốn trong các nhóm browser nêu trên. Sau thay đổi mới phải chạy kiểm tra phù hợp; không cộng dồn số assertion thành chứng nhận toàn hệ thống.

## Production đã biết

**Đối soát production gần nhất: 14/10/2026, 10:36 giờ Việt Nam.** Registry 05–18,20,23–26; người dùng đã chạy 18/24/25/26. Theo ủy quyền mới, đã cấp và liên kết 44 Auth parent bằng Node24; chưa deploy ứng dụng backend mới. Postflight đạt quyền RPC/RLS, không liên kết sai hoặc Auth parent mồ côi. Sáu thân hàm của 24/25 đã được đối chiếu khớp mã local trong lượt review trước.

- Registry còn thiếu 19/21/22 thuộc backlog; không chạy lại 18/24/25/26. Migration26 đã phát hành, mọi sửa đổi tiếp theo phải dùng migration mới. Cả 29 lớp đã có mã: 12 AB, 13 C, 4 K; không có sai ánh xạ ban đầu, revision lỗi hoặc thiếu lịch sử phân loại.
- Có 51 liên hệ phụ huynh, 44 Auth parent đã liên kết đúng cho 44/54 học sinh trong phạm vi. Còn 10 học sinh thiếu liên hệ hợp lệ, chưa cấp tài khoản và không tự lấy số học sinh thay thế. Dry-run sau cấp: 44 alreadyLinked, 0 pending, 0 failed; không reset tài khoản có sẵn.
- Đối chiếu digest trước/sau provisioning: toàn bộ 28 bảng nghiệp vụ trong preflight giữ nguyên sau khi loại cột mới đã quy định; 23 Auth user ngoài vai trò parent giữ nguyên toàn bộ bản ghi. Không có Auth parent thiếu mật khẩu, bị khóa, mồ côi hoặc liên kết sai. Báo cáo tổng hợp local ngoài Git: `scratch/parent-provision-before.json` và `scratch/parent-provision-after.json`; không xuất danh sách liên hệ cá nhân. Chưa thử đăng nhập/đổi mật khẩu thật trên ứng dụng mới.
- Bảng tư vấn/intake và lịch sử trạng thái đã có; hiện 0 đơn, 0 outbox. Phần vận hành email/vòng đời avatar và hồ sơ mở rộng vẫn chờ 19/21/22.
- Chưa có bucket tutor-avatars; email tháng tắt, chưa cấu hình đầy đủ người nhận tổng hợp admin.
- RLS bật ở bảng public thường; vẫn cần kiểm tra policy/RPC và xác minh danh tính phụ huynh.
- Backup trước migration được lưu trên máy chủ trung tâm tại `F:\csat_backup\supabase-20261014101727-054a0d`: archive 855.999 byte đã đọc kiểm tra toàn bộ và có SHA-256; gồm Auth, Storage có 0 tệp. Bản này chưa chứa 44 Auth parent vừa cấp; chưa thử restore, không coi đây là nghiệm thu khôi phục.
- Nền quản lý/điểm danh/kế toán và khung A+B/C+D đã có; không chạy lại migration 20 hoặc suy ra registry thiếu 01–04 thì phải nạp lại.

Smoke production 08/10/2026: 10 route công khai trả HTTP200, 6 bố cục Edge (375/1440px) không lỗi JS, ảnh lỗi, tràn ngang hoặc request ghi. Bài private chuyển về login khi thiếu phiên; cookie giả không có phiên bị từ chối, không trả thân bài, giữ private/no-store/noindex và ngoài sitemap. Không tra cứu số điện thoại hoặc tải hồ sơ thật để QA. Luồng phụ huynh hợp lệ, nhiều con/lớp và bản in được kiểm chứng bằng fixture local/CI; chưa nghiệm thu lại bằng tài khoản thật trên production.

Migration23: snapshot cấu trúc/quyền RPC và SQL rollback nằm trong scratch ngoài Git; không tải backup hồ sơ. Transaction kiểm tra projection cũ được giữ nguyên, các bảng ứng dụng giữ số lượng bản ghi, quyền service-only và phiên sai vẫn bị từ chối trước commit. 25 giáo án công bố hiện có khớp khung chuẩn (12 basic/13 advanced), chỉ đối chiếu tổng hợp. Phần email/avatar chưa được triển khai theo chuỗi18/19/21/22. Đối chiếu lại trước đợt thay đổi tiếp; không dùng rollout cũ làm lệnh mặc định.

## Quyết định và nội dung còn chờ

- Hai poster Thành tích bắt đầu 791129869 (vest) và 791684061 (áo tốt nghiệp) có cùng tên/trường nhưng chân dung khác nhau. Cả hai chưa đưa vào runtime; cần chủ trung tâm chọn ảnh hoặc xác nhận hai học sinh khác nhau.
- E chưa có danh mục giáo trình/học phí được duyệt; giữ ba trọng tâm định hướng, không tự bổ sung.
- API CSATOJ và quản trị bài viết/thành tích chưa triển khai. Intake v2/form đăng ký đã nối trong mã theo phạm vi duyệt; nghiệm thu staging/production còn chờ. Cơ chế K chọn nguồn chéo chương trình vẫn là đề xuất kỹ thuật chờ duyệt.
- Đã chốt Node.js 24 cho local, CI và deploy; CI sử dụng Node24; runtime production khai báo 24.x qua engines, chưa đọc riêng phiên bản patch của Function hosted. E xét năng lực và bài thi riêng, không bắt buộc học xong C.
- Theo quyết định chủ trung tâm, giữ nguyên route đăng ký trong đợt này; việc phân loại public route và bỏ truy vấn xác thực không cần thiết được xem lại cùng đợt cập nhật đăng ký tiếp theo. Đã xử lý theo duyệt: đồng bộ ignore/guard ảnh nguồn courses/students, bỏ 18 lượt test chạy lặp, sửa đoạn định hướng E cũ và chuyển WebP E-v2 không dùng ra kho nội bộ. Ảnh nguồn giữ nguyên trên máy.

## Backlog backend và phát hành

| ID | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| SEC-01 | Mật khẩu khởi tạo gia sư đang là số điện thoại | Duyệt và kiểm chứng luồng mời/reset, secret ngẫu nhiên, xử lý tài khoản cũ; không reset/gửi hàng loạt ngoài quyền |
| SEC-02 | Mã mới có Auth password và thu hồi phiên nhưng mật khẩu khởi tạo dùng chung/đổi tùy chọn chưa chứng minh sở hữu số | Nghiệm thu Auth thật, chống dò/phiên/liên kết, bàn giao an toàn và xác minh danh tính; không coi phone_confirm admin là OTP |
| DB-01 | Schema tương thích bản deploy | Ba luồng: 18→24, 23→25/26; staging, backup/restore và bảo trì schema→provision→deploy. 19/21/22 là email/hồ sơ riêng, không bắt buộc; không chạy lại 20/23 |
| PROFILE-01 | Hồ sơ/avatar gia sư thật | Bucket/policy và thử upload/thay/gỡ/lỗi DB–Storage trên staging; không mất hoặc xóa ảnh đang dùng |
| PARENT-01 | Nghiệm thu cổng phụ huynh | Published, nhiều con/lớp, nhận xét/đính chính, phí null/đã chốt/tạm tính/hoàn, mobile/dark/keyboard/print |
| MAIL-01 | Thư tổng hợp admin mới bị tuổi đợt cũ làm quá hạn | Tính hạn theo vòng đời loại thư; thử đợt >7 ngày và qua tháng |
| MAIL-02 | Retry sau worker crash chưa giữ đủ khoảng cách | Lưu mốc claim/reclaim; thử 3–5 phút, lease cũ không ghi đè lease mới |
| MAIL-03 | Resend/cấu hình gửi | Domain verified, key server-only, gửi tắt mặc định; mẫu giả được phép, phân biệt accepted và thực nhận |
| OPS-01 | Workflow nhóm/runtime/phát hành | Đồng bộ lựa chọn Node với CI/engines/host; CI 3b3258d hosted đã xanh; tiếp tục xác minh ruleset/reviewer và Preview không dùng secret production |
| ARCH-01 | Chuẩn hóa module theo luồng | Tách trang quản lý lớp lớn; nhất quán query/action/validation, giữ hợp đồng và test trước/sau |
| QA-01 | Nghiệm thu browser QA dùng chung | Public runner đã khóa Playwright và có smoke trong CI; public/private topic smoke đã xanh trên GitHub; tiếp tục chuẩn hóa các runner Portal còn lại và QA staging |
| DATA-01 | Đối soát lịch sử/liên hệ | Kho nội bộ, chứng cứ/quyền/audit cho từng sửa; không tự sửa hàng loạt |
| OJ-01 | API CSATOJ | Mapping ID, quyền, timeout/cache/rate limit; thiếu là null, ranking không suy thành năng lực |
| CONTENT-01 | Giáo trình mở rộng | Nội dung trung tâm duyệt, version mới; tách định hướng khỏi giáo trình chính thức |

## Cách cập nhật tài liệu

Thay trực tiếp trạng thái tương ứng và quyết định hiện hành; không thêm một mục ngày tháng cho mỗi thay đổi nhỏ. Một bản ghi kiểm chứng gọn cần phạm vi/mã, môi trường, kết quả thật, phần chưa thử và việc còn lại; chỉ giữ ngày khi cần xác định độ mới của bằng chứng môi trường. Không gọi local/CI/commit là nghiệm thu production. Lịch sử chi tiết thuộc Git và hồ sơ vận hành nội bộ.

Các quy trình nguồn: [frontend](FRONTEND_WORKFLOW.md), [backend](BACKEND_WORKFLOW.md), [phát hành](SETUP_VERCEL_SUPABASE.md), [tích hợp](FUTURE_INTEGRATIONS.md), [bảo mật](../SECURITY.md).
