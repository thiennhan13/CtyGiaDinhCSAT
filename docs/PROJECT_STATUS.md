# Trạng thái hiện tại và việc tiếp theo

Rà soát tài liệu: **08/10/2026**. Tài liệu này duy trì trạng thái và bằng chứng; quyết định thiết kế ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md), nghiệp vụ tuyển sinh ở [catalog](PUBLIC_COURSE_CATALOG.md). Không nối thêm nhật ký theo từng lượt chỉnh UI.

## Phạm vi đang làm

Ưu tiên hoàn thiện frontend công khai theo chỉ dẫn của chủ trung tâm. Backend/API, schema và logic vận hành có backlog riêng; thay đổi website không tự chuyển đổi lớp hoặc bật tiếp nhận/gửi thư.

Đã biên soạn đủ **54 bài cho 43 chủ đề A/B/C** theo kế hoạch đã duyệt; E/K bổ sung sau. Giữ trang phụ huynh tóm tắt; chỉ mở bài thuộc giáo án chuẩn đã công bố trong phạm vi phiên. Bài có bảng/sơ đồ/code với namespace std ngầm định, hai câu tự kiểm tra mở đáp án, nguồn đọc thêm ngắn và video liên quan đã xác minh. Nội dung vẫn lưu Markdown trong repo; đã chốt không dùng DB/CMS cho nội dung. Renderer import riêng C++/theme, cache phần thân bài trên worker và vẫn kiểm tra quyền mỗi request. Migration 23 thêm số buổi lớp để hiển thị chặng định hướng đã áp production 08/10/2026, không kéo theo email/avatar. Chi tiết và số liệu dung lượng ở [chuyên đề phụ huynh](PARENT_TOPICS.md).

Mã ứng dụng `3b3258d` đã commit/push và Vercel báo Production success 08/10/2026: [deployment](https://cty-gia-dinh-csat-l4ebi3yul-thiennhan13s-projects.vercel.app), domain [portal.csatoj.vn](https://portal.csatoj.vn). Thư viện 54 bài và renderer đã phát hành; E/K vẫn chờ nội dung. CI phát hành [GitHub Actions](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/runs/37751875033) đã xanh: Quality Node24 (build, public smoke, private topics) và PostgreSQL17/Node24. Kết quả kiểm tra thật và giới hạn bên dưới.

## Frontend hiện có

Favicon bo góc đã cập nhật trong mã local: SVG và PNG/ICO, giữ logo CSAT, metadata đổi phiên bản URL để làm mới cache. Node24: typecheck, lint phần sửa, guard/diff và Edge kiểm tra metadata/tải đủ ba định dạng đạt; góc PNG và ba frame ICO trong suốt. Chưa phát hành thay đổi favicon lên production; không chạy lại build/database cho thay đổi tài nguyên này.

| Phần | Trạng thái mã hiện tại | Việc còn lại |
|---|---|---|
| Giới thiệu | Hero/đội ngũ, bốn lý do học thi đấu, hệ sinh thái terminal bốn nhánh, sáu bước buổi học, phụ huynh và tư vấn | Hoàn thiện tiếp theo góp ý; không thêm chỉ số chưa có nguồn |
| Tìm hiểu lộ trình | Năm lớp A/B/C/E/K, selector, ảnh nền tĩnh, tag, roadmap; A/B/C giữ các ô nội dung học, bỏ dòng “Kiến thức nối tiếp · Tư duy phát triển”; E nổi bật trong một khối, K ba ô ngang khi đủ chỗ | Nội dung mới phải bám catalog/giáo trình; không phục hồi A+B công khai |
| Chi tiết lớp | Poster flexible, breadcrumb một hàng, ba khối facts, chặng editorial có mũi tên; mục tiêu cuối khoá trước tư vấn, blob theo lớp | Tiếp tục UI theo chỉ dẫn; giáo trình chi tiết E chưa được cung cấp |
| Đăng ký học | Bố cục thẻ 3/2/1 cột, ảnh mở được, khóa quan tâm mặc định theo trang lớp; form xem lại/sao chép | Chưa nối API tư vấn; học phí E và nội dung tùy chỉnh K trao đổi cùng CSAT |
| Thành tích | Bố cục 3 đã duyệt, HTML tĩnh, 15 mục có căn cứ và WebP responsive; ảnh vuông cạnh nhãn, lưới 3/2/1, hero/art co giãn | Hai poster trùng tên/trường chờ xác nhận; chưa có quản trị database |
| Đội ngũ/bài đăng | Đội ngũ dùng chung component; bài viết lấy danh mục frontend | Quản trị bài viết là tích hợp tương lai |
| Học liệu | Video writing tối ưu, form chuẩn bị nhu cầu, liên hệ hoạt động | Chưa có gửi tài liệu tự động hoặc danh sách tải được duyệt |
| Liên lạc | Switch Phụ huynh/Gia sư dùng handler hiện hành; không dock/lời mời học liệu tại login | Giới hạn xác thực thuộc SEC-01/02, không được coi sửa UI là đã giải quyết |

## Bằng chứng kiểm chứng

Các kết quả dưới đây thuộc mã local; không phải số liệu production hoặc chứng nhận WCAG. Runtime hiện hành đã chốt Node 24; các báo cáo UI chi tiết trước đây được chạy trên Node 26, cần phân biệt với kiểm chứng mới.

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

**Đối chiếu production gần nhất: 08/10/2026.** Đã áp migration 23 và phát hành ứng dụng `3b3258d` theo yêu cầu của chủ trung tâm. Giữ một mốc này để tránh hiểu kết quả local là trạng thái triển khai hiện tại.

- Registry ghi nhận 05–17, 20 và 23; còn thiếu 18/19/21/22.
- Chưa có bảng tư vấn/đối soát email/vòng đời avatar đầy đủ; hồ sơ mở rộng và RPC phụ huynh chưa đủ trường mới.
- Chưa có bucket tutor-avatars; email tháng tắt, chưa cấu hình đầy đủ người nhận tổng hợp admin.
- RLS bật ở bảng public thường; vẫn cần kiểm tra policy/RPC và xác minh danh tính phụ huynh.
- Nền quản lý/điểm danh/kế toán và khung A+B/C+D đã có; không chạy lại migration 20 hoặc suy ra registry thiếu 01–04 thì phải nạp lại.

Smoke production 08/10/2026: 10 route công khai trả HTTP200, 6 bố cục Edge (375/1440px) không lỗi JS, ảnh lỗi, tràn ngang hoặc request ghi. Bài private chuyển về login khi thiếu phiên; cookie giả không có phiên bị từ chối, không trả thân bài, giữ private/no-store/noindex và ngoài sitemap. Không tra cứu số điện thoại hoặc tải hồ sơ thật để QA. Luồng phụ huynh hợp lệ, nhiều con/lớp và bản in được kiểm chứng bằng fixture local/CI; chưa nghiệm thu lại bằng tài khoản thật trên production.

Migration23: snapshot cấu trúc/quyền RPC và SQL rollback nằm trong scratch ngoài Git; không tải backup hồ sơ. Transaction kiểm tra projection cũ được giữ nguyên, các bảng ứng dụng giữ số lượng bản ghi, quyền service-only và phiên sai vẫn bị từ chối trước commit. 25 giáo án công bố hiện có khớp khung chuẩn (12 basic/13 advanced), chỉ đối chiếu tổng hợp. Phần email/avatar chưa được triển khai theo chuỗi18/19/21/22. Đối chiếu lại trước đợt thay đổi tiếp; không dùng rollout cũ làm lệnh mặc định.

## Quyết định và nội dung còn chờ

- Hai poster Thành tích bắt đầu 791129869 (vest) và 791684061 (áo tốt nghiệp) có cùng tên/trường nhưng chân dung khác nhau. Cả hai chưa đưa vào runtime; cần chủ trung tâm chọn ảnh hoặc xác nhận hai học sinh khác nhau.
- E chưa có danh mục giáo trình/học phí được duyệt; giữ ba trọng tâm định hướng, không tự bổ sung.
- API CSATOJ và quản trị bài viết/thành tích chưa triển khai. Backend tư vấn đã có; chưa triển khai hợp đồng intake mở rộng và kết nối form public. Hợp đồng intake mới và cơ chế K chọn nguồn chéo chương trình là đề xuất kỹ thuật chờ duyệt, không phải quyết định triển khai.
- Đã chốt Node.js 24 cho local, CI và deploy; CI sử dụng Node24; runtime production khai báo 24.x qua engines, chưa đọc riêng phiên bản patch của Function hosted. E xét năng lực và bài thi riêng, không bắt buộc học xong C.
- Theo quyết định chủ trung tâm, giữ nguyên route đăng ký trong đợt này; việc phân loại public route và bỏ truy vấn xác thực không cần thiết được xem lại cùng đợt cập nhật đăng ký tiếp theo. Đã xử lý theo duyệt: đồng bộ ignore/guard ảnh nguồn courses/students, bỏ 18 lượt test chạy lặp, sửa đoạn định hướng E cũ và chuyển WebP E-v2 không dùng ra kho nội bộ. Ảnh nguồn giữ nguyên trên máy.

## Backlog backend và phát hành

| ID | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| SEC-01 | Mật khẩu khởi tạo gia sư đang là số điện thoại | Duyệt và kiểm chứng luồng mời/reset, secret ngẫu nhiên, xử lý tài khoản cũ; không reset/gửi hàng loạt ngoài quyền |
| SEC-02 | Tra cứu phụ huynh chưa chứng minh sở hữu số | Duyệt xác minh danh tính, chống dò/thu hồi phiên/kiểm tra liên kết, kế hoạch chuyển đổi người dùng |
| DB-01 | Schema tương thích bản deploy | Đối chiếu lại; nếu trạng thái còn như trên thì 18 → 19 → 21 → 22 cho phần email/hồ sơ, không chạy lại 20/23; backup/restore, verification, grants/RLS và smoke theo vai trò |
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
