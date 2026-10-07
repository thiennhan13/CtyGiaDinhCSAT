# Trạng thái hiện tại và việc tiếp theo

Rà soát tài liệu: **07/10/2026**. Tài liệu này duy trì trạng thái và bằng chứng; quyết định thiết kế ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md), nghiệp vụ tuyển sinh ở [catalog](PUBLIC_COURSE_CATALOG.md). Không nối thêm nhật ký theo từng lượt chỉnh UI.

## Phạm vi đang làm

Ưu tiên hoàn thiện frontend công khai theo chỉ dẫn của chủ trung tâm. Backend/API, schema và logic vận hành có backlog riêng; thay đổi website không tự chuyển đổi lớp hoặc bật tiếp nhận/gửi thư.

Working tree trên main chứa thay đổi frontend và docs chưa commit sau mã đã push 5f7f93d. Đây là thông tin local, phải kiểm tra lại Git khi tiếp nhận. Chưa xác minh CI/deployment mới; kết quả build local không chứng minh production đã cập nhật.

## Frontend hiện có

| Phần | Trạng thái mã hiện tại | Việc còn lại |
|---|---|---|
| Giới thiệu | Hero/đội ngũ, bốn lý do học thi đấu, hệ sinh thái terminal bốn nhánh, sáu bước buổi học, phụ huynh và tư vấn | Hoàn thiện tiếp theo góp ý; không thêm chỉ số chưa có nguồn |
| Tìm hiểu lộ trình | Năm lớp A/B/C/E/K, selector, ảnh nền tĩnh, tag, roadmap; E nổi bật trong một khối, K ba ô ngang khi đủ chỗ | Nội dung mới phải bám catalog/giáo trình; không phục hồi A+B công khai |
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
| Thành tích hiện hành | Browser bản build loopback: 80 bố cục / 1.594 assertion; 320–1920 px, hai theme/hai motion, no-JS, ảnh vuông, art tăng 10%/căn tâm, hover, navigation/history; đã xem ảnh desktop/mobile |
| Chi tiết lớp | QA responsive nền: 135 bố cục / 1.134 assertion; chỉnh thứ tự mục tiêu/câu lịch/blob: 75 bố cục / 992 assertion. Bao gồm ngang/dọc, no-JS, bàn phím, curriculum A9/B15/C19 |
| Tổng quan lộ trình | Hồi quy 12 bố cục / 657 assertion: client navigation/CSS load order, ảnh/hashtag/reveal/điều hướng mục |
| Bộ nghiệp vụ nền | Node 24.19.0: 238/238 database/API, không skip, gồm PostgreSQL native/concurrency/restore trên DB tách biệt. Đã bỏ 18 lượt chạy lặp do import helper; giữ đủ ca kiểm thử gốc |
| Tài nguyên Thành tích | Tải đủ 15 ảnh ở DPR2: 375 px 218.028 byte; 1440 px 526.262 byte, không gồm HTML/CSS/font. Không đo lưu lượng người dùng thực |

Rà soát chuẩn bị phát hành: Node 24.19.0, guard 450 tệp không phát hiện lỗi, liên kết Markdown hợp lệ, 6/6 test guard và diff check đạt. Public smoke local trên Edge: 40 nhóm / 32 bố cục, 477 assertion giao diện đạt; không lỗi JS/asset/request ghi. Theo quyết định chủ trung tâm, đã gỡ Chromium thử nghiệm khỏi local; local dùng Edge, CI dùng Chromium riêng trên runner. CI bổ sung Playwright khóa version/Chromium smoke, lint strict; chưa chạy workflow trên GitHub. Script preview giữ môi trường provider, dùng placeholder và tắt gửi. Không kiểm tra production, commit/push hoặc deploy trong lượt này.

Báo cáo/ảnh QA giữ trong scratch ngoài Git; các đường dẫn đó chỉ là dấu vết trên máy, không là dependency onboarding. Không có JS/asset lỗi hoặc request ghi không mong muốn trong các nhóm browser nêu trên. Sau thay đổi mới phải chạy kiểm tra phù hợp; không cộng dồn số assertion thành chứng nhận toàn hệ thống.

## Production đã biết

**Lần đọc production gần nhất: 01/10/2026, chỉ đọc. Chưa đối chiếu lại.** Giữ một mốc này để tránh hiểu kết quả local là trạng thái triển khai hiện tại.

- Registry ghi nhận 05–17 và 20; còn thiếu 18/19/21/22.
- Chưa có bảng tư vấn/đối soát email/vòng đời avatar đầy đủ; hồ sơ mở rộng và RPC phụ huynh chưa đủ trường mới.
- Chưa có bucket tutor-avatars; email tháng tắt, chưa cấu hình đầy đủ người nhận tổng hợp admin.
- RLS bật ở bảng public thường; vẫn cần kiểm tra policy/RPC và xác minh danh tính phụ huynh.
- Nền quản lý/điểm danh/kế toán và khung A+B/C+D đã có; không chạy lại migration 20 hoặc suy ra registry thiếu 01–04 thì phải nạp lại.

Phải xác minh lại registry, cấu trúc, grants và deployment trước phát hành. Không dùng tài liệu rollout cũ làm lệnh thực thi.

## Quyết định và nội dung còn chờ

- Hai poster Thành tích bắt đầu 791129869 (vest) và 791684061 (áo tốt nghiệp) có cùng tên/trường nhưng chân dung khác nhau. Cả hai chưa đưa vào runtime; cần chủ trung tâm chọn ảnh hoặc xác nhận hai học sinh khác nhau.
- E chưa có danh mục giáo trình/học phí được duyệt; giữ ba trọng tâm định hướng, không tự bổ sung.
- API CSATOJ và quản trị bài viết/thành tích chưa triển khai. Backend tư vấn đã có; chưa triển khai hợp đồng intake mở rộng và kết nối form public. Hợp đồng intake mới và cơ chế K chọn nguồn chéo chương trình là đề xuất kỹ thuật chờ duyệt, không phải quyết định triển khai.
- Đã chốt Node.js 24 cho local, CI và deploy; chưa xác minh runtime hosted. E xét năng lực và bài thi riêng, không bắt buộc học xong C.
- Theo quyết định chủ trung tâm, giữ nguyên route đăng ký trong đợt này; việc phân loại public route và bỏ truy vấn xác thực không cần thiết được xem lại cùng đợt cập nhật đăng ký tiếp theo. Đã xử lý theo duyệt: đồng bộ ignore/guard ảnh nguồn courses/students, bỏ 18 lượt test chạy lặp, sửa đoạn định hướng E cũ và chuyển WebP E-v2 không dùng ra kho nội bộ. Ảnh nguồn giữ nguyên trên máy.

## Backlog backend và phát hành

| ID | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| SEC-01 | Mật khẩu khởi tạo gia sư đang là số điện thoại | Duyệt và kiểm chứng luồng mời/reset, secret ngẫu nhiên, xử lý tài khoản cũ; không reset/gửi hàng loạt ngoài quyền |
| SEC-02 | Tra cứu phụ huynh chưa chứng minh sở hữu số | Duyệt xác minh danh tính, chống dò/thu hồi phiên/kiểm tra liên kết, kế hoạch chuyển đổi người dùng |
| DB-01 | Schema tương thích bản deploy | Đối chiếu lại; nếu trạng thái còn như trên thì 18 → 19 → 21 → 22, không chạy lại 20; backup/restore, verification, grants/RLS và smoke theo vai trò |
| PROFILE-01 | Hồ sơ/avatar gia sư thật | Bucket/policy và thử upload/thay/gỡ/lỗi DB–Storage trên staging; không mất hoặc xóa ảnh đang dùng |
| PARENT-01 | Nghiệm thu cổng phụ huynh | Published, nhiều con/lớp, nhận xét/đính chính, phí null/đã chốt/tạm tính/hoàn, mobile/dark/keyboard/print |
| MAIL-01 | Thư tổng hợp admin mới bị tuổi đợt cũ làm quá hạn | Tính hạn theo vòng đời loại thư; thử đợt >7 ngày và qua tháng |
| MAIL-02 | Retry sau worker crash chưa giữ đủ khoảng cách | Lưu mốc claim/reclaim; thử 3–5 phút, lease cũ không ghi đè lease mới |
| MAIL-03 | Resend/cấu hình gửi | Domain verified, key server-only, gửi tắt mặc định; mẫu giả được phép, phân biệt accepted và thực nhận |
| OPS-01 | Workflow nhóm/runtime/phát hành | Đồng bộ lựa chọn Node với CI/engines/host; CI hosted xanh, ruleset/reviewer, Preview không dùng secret production |
| ARCH-01 | Chuẩn hóa module theo luồng | Tách trang quản lý lớp lớn; nhất quán query/action/validation, giữ hợp đồng và test trước/sau |
| QA-01 | Nghiệm thu browser QA dùng chung | Public runner đã khóa Playwright và có smoke trong CI; cần kết quả GitHub thực, tiếp tục chuẩn hóa runner Portal/fixture và QA staging |
| DATA-01 | Đối soát lịch sử/liên hệ | Kho nội bộ, chứng cứ/quyền/audit cho từng sửa; không tự sửa hàng loạt |
| OJ-01 | API CSATOJ | Mapping ID, quyền, timeout/cache/rate limit; thiếu là null, ranking không suy thành năng lực |
| CONTENT-01 | Giáo trình mở rộng | Nội dung trung tâm duyệt, version mới; tách định hướng khỏi giáo trình chính thức |

## Cách cập nhật tài liệu

Thay trực tiếp trạng thái tương ứng và quyết định hiện hành; không thêm một mục ngày tháng cho mỗi thay đổi nhỏ. Một bản ghi kiểm chứng gọn cần phạm vi/mã, môi trường, kết quả thật, phần chưa thử và việc còn lại; chỉ giữ ngày khi cần xác định độ mới của bằng chứng môi trường. Không gọi local/CI/commit là nghiệm thu production. Lịch sử chi tiết thuộc Git và hồ sơ vận hành nội bộ.

Các quy trình nguồn: [frontend](FRONTEND_WORKFLOW.md), [backend](BACKEND_WORKFLOW.md), [phát hành](SETUP_VERCEL_SUPABASE.md), [tích hợp](FUTURE_INTEGRATIONS.md), [bảo mật](../SECURITY.md).
