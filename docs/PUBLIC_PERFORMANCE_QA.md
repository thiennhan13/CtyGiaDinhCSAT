# Baseline hiệu năng và QA công khai

## Phạm vi và bằng chứng

Kiểm chứng local ngày **15/10/2026**, mã ứng dụng `2190a6f`. Node **24.19.0**, Next.js **16.3.8**, Microsoft Edge **155.0.4283.45**. Dựng lại bản production build với Supabase loopback/khóa giả, email và tiếp nhận thật tắt. Không đọc/ghi database production, không deploy, không tạo đơn thật.

Phạm vi được duyệt: QA tập trung vào đăng ký, trang chủ, tổng quan lộ trình, một trang lớp và thành tích; baseline bốn trang đại diện. Không chạy lại toàn bộ ma trận trình duyệt/theme/màn hình hoặc thêm Lighthouse làm điều kiện chặn mọi commit.

## QA Edge

- Public browser runner: **18 nhóm, 529 assertions, 10 bố cục** đạt. Kiểm tra 375/1440px, menu/bàn phím/focus, khóa mặc định A/B/C/E/K, lựa chọn form, ảnh nền khi điều hướng client/thay thứ tự CSS, fallback không JavaScript và thành tích/reveal. Một số nhóm tái sử dụng bao gồm thêm tablet, dark hoặc reduced motion; đây không phải chứng nhận mọi trang ở mọi chế độ.
- Gửi đăng ký/tư vấn: **5 nhóm, 85 assertions** đạt; đăng ký tại 375/768/1440px và tư vấn ở tổng quan/chi tiết A. Kiểm tra consent, trạng thái đang gửi, chống nhấn lặp, giữ dữ liệu sau lỗi, retry giữ mã yêu cầu và nội dung thay đổi sinh mã mới, trạng thái thành công/focus. API gửi được mock trong trình duyệt; chưa chứng minh đơn được lưu vào Supabase thật.
- Kiểm tra bổ sung: chụp 10 viewport của năm phần ở 375/1440px; kiểm tra thứ tự Tab tên → điện thoại, Space chọn đồng ý, Tab tới nút gửi. Reflow dùng viewport 720×450 tương đương không gian CSS của desktop 1440×900 ở zoom 200%; chưa thử zoom trình duyệt thật hoặc thiết bị di động vật lý.
- Đã xem ảnh hero trang chủ/lộ trình, thẻ đăng ký, form/consent, chi tiết A, phần E và thành tích. Không thấy lỗi chức năng hoặc tràn ngang trong phạm vi đã chạy. Không có uncaught JavaScript, ảnh/font lỗi hoặc request ghi không được mock trong các runner.

Báo cáo local ngoài Git: `scratch/essential-public-report.json`, `scratch/parent-topics-qa/report-targeted.json`, `scratch/essential-visual/`. Các runner gốc nằm trong `scripts/tests/public-ui.browser.cjs`, `scripts/tests/backend-ui.browser.cjs` và `scripts/run-parent-topics-ui.cjs`.

## Cách đo baseline

Lighthouse **13.5.0**, cài riêng trong `scratch/performance-tools`; không thêm dependency runtime hoặc CI, không cài Chromium local. Dùng Edge headless có sẵn, mỗi lượt có profile mới, chạy tuần tự sau QA. Mỗi trang đo ba lần, lấy trung vị riêng cho từng chỉ số và giữ cả khoảng dao động.

- Bản `next build`/`next start` trên loopback, cache máy chủ đã được làm nóng bởi QA; không đo dev server.
- Mô phỏng mobile 412×823, DPR 1,75; RTT 150ms, thông lượng 1.638,4 Kbit/s, CPU slowdown 4×, throttling `simulate` mặc định của Lighthouse.
- Chặn HTTPS bên ngoài và Supabase fixture. Không có độ trễ CDN/Vercel hoặc dữ liệu người dùng thật.
- `/_vercel/speed-insights/script.js` trả 404 trên local vì không có dịch vụ Vercel tại đây. Phép đo không đại diện chi phí script hosted; không coi 404 local này là lỗi production.
- TBT là số đo phòng thử nghiệm, **không phải INP**. CLS bên dưới chỉ phản ánh lần tải được đo, không thay CLS toàn phiên. Chưa có kết luận Core Web Vitals thực tế.

## Kết quả baseline

Đủ **12/12 lượt**, không có runtime error hoặc run warning của Lighthouse. Trung vị từng chỉ số:

| Trang | Điểm hiệu năng (khoảng 3 lượt) | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` | 72 (60–86) | 3,94 s | 2,28 s | 538 ms | 0 |
| `/lo-trinh` | 75 (73–77) | 4,20 s | 1,67 s | 407 ms | 0 |
| `/dang-ky-hoc` | 76 (72–80) | 3,76 s | 1,67 s | 536 ms | 0 |
| `/thanh-tich` | 87 (86–91) | 3,45 s | 1,52 s | 223 ms | 0 |

Điểm trang chủ dao động mạnh; không dùng một lượt hoặc chênh lệch nhỏ để khẳng định cải thiện. LCP của cả bốn trang còn cao hơn mốc tham khảo 2,5 s, dù không ghi nhận dịch chuyển bố cục trong lần tải. Các con số này là baseline local mô phỏng, chưa phải kết luận Core Web Vitals đạt/không đạt trên production. HTML/JSON chi tiết giữ tại `scratch/performance-baseline/`, không đưa trace hoặc ảnh QA vào Git.

## Đối chiếu báo cáo PageSpeed và thay đổi đã thực hiện

Chủ trung tâm cung cấp ảnh PageSpeed: LCP 4,1 s, Speed Index 4,3 s, ước tính CSS chặn render 880 ms, ảnh bóng đèn lãng phí khoảng 26 KiB và JavaScript cũ khoảng 14 KiB. Đây là số liệu từ ảnh, chưa có URL báo cáo hoặc điều kiện từng lượt để so trực tiếp với local. Tổng thời lượng các request song song không phải phần LCP có thể tiết kiệm.

- Tách phần tĩnh của `HomeExperience` và `TutorShowcase` về server. `HomeLearningWidgets` giữ tabs/buổi học; `TutorHeroMotion` nhận nội dung server qua children; `CodeIcon` dùng được phía server. Giữ SSR/no-JS và tương tác đã duyệt.
- Tách CSS luyện tập/video sang `learning-practice.css` của Học liệu; theme E chỉ nhập tại phần E và danh mục đăng ký. Không purge selector theo ảnh chụp một trang. Giữ selector dùng chung và độ ưu tiên tỷ lệ video để tránh phụ thuộc thứ tự client navigation.
- `Reveal` dùng geometry từ callback IntersectionObserver thay vì từng instance đọc layout rồi ghi class trong hydration. Nội dung đã xuất hiện vẫn không bị phủ khi khởi tạo; giữ focus/reduced motion và cleanup.
- Bóng đèn có bản WebP **156×234, 6.676 byte**, đủ 3× cho kích thước desktop 52×78. Image và CSS mask dùng cùng URL tĩnh, tránh tải thêm ảnh gốc; ảnh vẫn lazy, kích thước hiển thị giữ 42/52 px. Hero dùng eager/fetchPriority high và sizes responsive. Theo [Next Image](https://nextjs.org/docs/app/api-reference/components/image), không chồng preload với fetchPriority; HTML server vẫn chứa ảnh ngay từ đầu.
- Rà soát thiết kế: bỏ blur ở bốn thẻ hệ sinh thái; nhãn số dùng ink để tăng tương phản; thêm h2 ẩn thị giác giữ cấu trúc heading; sửa hai câu tuyển E theo quyết định đủ năng lực và đạt bài thi riêng, không bắt buộc học C.

Cảnh báo khoảng 14 KiB JavaScript cũ thuộc polyfill do Next đóng gói, chưa có lý do an toàn để sửa bundle framework. Một phần JS không sử dụng trong Lighthouse đến từ prefetch đường dẫn khác, không phải toàn bộ đang hydrate trang chủ; giữ prefetch và chức năng menu. Không thêm preconnect cùng origin, không inline toàn bộ CSS bằng cấu hình thử nghiệm.

## Rà soát chuyên sâu và giới hạn

Ba agent chỉ đọc đã kiểm tra hiệu năng/cấu trúc, thiết kế/motion và ranh giới bảo mật. Các lỗi cascade phát sinh khi tách CSS (video 4:3, radius buổi học và thẻ luyện tập) được phát hiện và sửa trước nghiệm thu. Lượt review cuối không phát hiện hồi quy mới có bằng chứng. Không phát hiện lỗi bảo mật mới đủ bằng chứng trong API intake, proxy, quyền chuyên đề và thay đổi server/client; đây không phải kiểm toán toàn hệ thống hay xác nhận cấu hình production.

Giới hạn đã chấp nhận vẫn mở: phụ huynh tra cứu bằng số không xác minh sở hữu (SEC-02), mật khẩu khởi tạo gia sư, nghiệm thu migration27/mail/Storage. Không thay Auth, migration hoặc dữ liệu trong đợt tối ưu giao diện.

## Kết quả sau tối ưu local

Đo trên bản làm việc từ `2190a6f`, cùng Node24/Edge/Lighthouse và cấu hình mobile của baseline. Đủ **15 lượt**, gồm ba lượt cho mỗi trang mobile và ba lượt trang chủ desktop. Không có runtime error/run warning; CLS bằng 0 trong cả 15 lượt. Trung vị riêng từng chỉ số:

| Trang | Điểm mobile (khoảng) | LCP trước → sau | Speed Index sau | TBT sau |
|---|---|---|---|---|
| `/` | 89 (89–95) | 3,94 → 3,66 s | 1,66 s | 36,5 ms |
| `/lo-trinh` | 86 (86–86) | 4,20 → 4,14 s | 1,66 s | 78 ms |
| `/dang-ky-hoc` | 88 (87–89) | 3,76 → 3,84 s | 1,66 s | 64 ms |
| `/thanh-tich` | 92 (92–92) | 3,45 → 3,30 s | 1,51 s | 44 ms |

Trang chủ desktop dùng preset desktop chính thức của Lighthouse: trung vị 100 điểm (99–100), LCP 0,82 s, Speed Index 0,54 s, TBT 12,5 ms. Chưa có baseline desktop cùng đợt để kết luận mức cải thiện. Mobile LCP vẫn cần cải thiện; đăng ký chưa có bằng chứng LCP tốt hơn. TBT giảm mạnh cả ở trang ít thay đổi, nên không quy toàn bộ chênh lệch cho mã tối ưu; tải máy và biến động từng lượt có thể ảnh hưởng kết quả.

Đối chiếu audit trang chủ sau sửa:

- Phát hiện ảnh LCP đạt cả ba điều kiện: HTML sẵn, eager, fetchPriority high. Forced-reflow audit không ghi nhận trong lượt tải được đo; không có nghĩa mọi tương tác đều không gây reflow.
- Ảnh bóng đèn giảm từ 27.358 xuống 6.676 byte; phần dư ước tính còn khoảng 5 KiB do dùng bản đủ nét 3×. Không tuyên bố đã xóa hoàn toàn cảnh báo ảnh.
- CSS chặn render vẫn ước tính **650–700 ms** trên local; cảnh báo polyfill vẫn khoảng 14 KiB. Không coi thay đổi này đã xử lý hết 880 ms trong ảnh PageSpeed production.
- Resource summary của lượt thứ hai: JS 328.455 → 322.290 byte; CSS 62.027 → 61.667 byte; ảnh 188.720 → 136.328 byte; HTML 17.788 → 25.872 byte. Tổng 697.536 → 654.263 byte. Có request prefetch trong tổng, không dùng đây như số byte bắt buộc để vẽ màn hình đầu. Chuyển phần tĩnh về server làm HTML tăng, đổi lại giảm mã hydrate phía client.

QA sau sửa: Edge **28 nhóm/694 assertions/14 bố cục** public và **5 nhóm/85 assertions** form với API mock đều đạt; thêm 10 viewport, bàn phím/reflow và kiểm tra Trang chủ → Học liệu → Trang chủ tại 375/1440 px. Kiểm tra ảnh nhỏ, ưu tiên hero, video 4:3 và radius 6 px; đã xem ảnh Học liệu ở cả hai kích thước. Node24: repo guard, 16/16 repo tests, typecheck, lint marketing và production build đạt. Bản build cuối chỉ bổ sung thống nhất radius thẻ luyện tập và định dạng mã; không chạy lại cả ma trận Lighthouse vì không thay đường tải trang chủ.

Bằng chứng ngoài Git: `scratch/performance-after/` (15 JSON/HTML và summary), `scratch/performance-public-report.json`, `scratch/performance-regression.json`, `scratch/essential-visual/`. Không dùng số đo local để khẳng định PageSpeed production đã cải thiện.

## Ưu tiên tiếp theo

1. Đo lại URL production sau một đợt phát hành được duyệt; đối chiếu mobile/desktop, phần tử LCP, cache CDN và script Speed Insights thực. Giữ ít nhất ba lượt cùng điều kiện.
2. Kiểm kê CSS trên đường tải đầu, tiếp tục tách phần chỉ dùng ở từng trang khỏi shell chung; kiểm tra light/dark và đổi trang để tránh cascade sai. Không tải CSS bất đồng bộ tùy tiện gây nháy bố cục.
3. Phần tĩnh của `RoadmapExperience` đã tách ở đợt dưới. Tiếp tục ưu tiên nguồn gây chậm phần tử LCP thực; chỉ cân nhắc giảm prefetch khi đo được tải cạnh tranh và đánh giá độ trễ điều hướng.
4. Đánh giá font theo dữ liệu tải thực và ảnh nhỏ theo DPR nếu còn cần; ưu tiên thấp hơn CSS/LCP. Không thêm preconnect cùng origin, tải trước mọi font hay sửa polyfill framework chỉ để xóa cảnh báo.

## Đợt tiếp theo: tách nội dung lộ trình và CSS chi tiết

Đã triển khai theo kế hoạch được duyệt, tiếp tục dùng Node24/Edge và dữ liệu giả. Mốc so sánh là bản tối ưu local ở bảng trên, không phải HEAD chưa tối ưu. Không thay nội dung, font, palette, breakpoint, tỷ lệ ảnh, khoảng cách hoặc quy tắc đăng ký.

### Thay đổi được giữ

- RoadmapExperience render hero, các phần A/B/C/E/K và CourseKnowledge ở server. RoadmapSelection giữ provider không thêm DOM, bộ chọn, tư vấn và các link chi tiết cần context; RoadmapAssembly giữ hiệu ứng riêng. Không truyền hàm qua ranh giới server/client, không dùng ssr:false và không đọc query ở server. Route tổng quan vẫn được tạo tĩnh.
- Chuyển 76 rule chỉ dành cho chi tiết từ roadmap-experience.css sang roadmap-detail-base.css, nhập trước course-detail.css. Giữ selector, thứ tự, breakpoint và reduced motion; không đổi CSS global/Portal.
- Bổ sung hồi quy cho cả năm link chi tiết: sau khi chọn cấp học, mục tiêu và nền tảng, link từng lớp phải giữ lựa chọn đã gửi. Giữ các bài kiểm tra history, làm sạch query, focus, form và no-JS có sẵn.
- Giữ ảnh nhỏ/ưu tiên hero đã tối ưu ở đợt trước. Không thêm biến thể ảnh, đổi font, sửa polyfill framework hoặc tắt prefetch khi chưa có bằng chứng lợi ích.

Cách chia nội dung qua children theo [Server/Client Components của Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components); thứ tự CSS phải được kiểm chứng bằng production build và điều hướng theo [tài liệu CSS](https://nextjs.org/docs/app/getting-started/css).

### Thử nghiệm không giữ

Đã thử tách CSS select/intake khỏi shell. Dù trang chủ bớt khoảng 754 byte CSS chặn render, tổng quan tăng từ 8 lên 10 request CSS chặn render, tăng khoảng 1,2 KB và FCP từ khoảng 1,66 lên 1,81 giây trong ba lượt. Vì vậy hoàn nguyên riêng nhóm này; CSS form vẫn ở public-design.css. Không chỉnh ngưỡng kiểm thử để hợp thức hóa hồi quy.

### Bằng chứng giao diện và chức năng

- Edge trên bản refactor: **35 nhóm, 2.148 assertions, 89 bố cục** đạt; bao gồm query/history, light/dark, reduced motion, CSS khi điều hướng, chi tiết lớp, ảnh, học liệu và no-JS. Form API mock: **5 nhóm/85 assertions** đạt, không gửi dữ liệu thật.
- Hồi quy link context mới: **1 nhóm/20 assertions** đạt, kiểm tra đủ A/B/C/E/K.
- 24 vùng tổng quan (hero, bộ chọn, năm lớp và tư vấn) ở 375/768/1440 px có hình học, vị trí và kích thước chữ khớp hoàn toàn trước–sau. 20/24 ảnh khớp từng pixel; bốn ảnh còn lại chỉ lệch 1–3 mức màu trên 255 ở nền/ảnh tổng hợp, không đổi hình học hoặc chữ. Đã xem trực quan các vùng khác biệt; không dùng ngưỡng pixel rộng để bỏ qua lỗi.
- Node24: build 72 route, TypeScript, lint toàn repo, guard và 16/16 repo tests đạt. Hai test fixture Git ban đầu bị sandbox chặn tạo repository tạm; chạy lại với quyền local phù hợp đã đạt. Không chạy database tests vì không đổi API, quyền hay database.
- Review chỉ đọc không phát hiện hồi quy mới; lỗi nội dung E còn ghi chọn lọc từ C ở một số vị trí là tồn đọng có sẵn, chưa sửa trong refactor giữ nguyên nội dung này.

Sau hoàn nguyên CSS form: Edge **5 nhóm/1.236 assertions/75 bố cục** đạt. So ảnh phát hiện gap nhãn chương ở mobile bị tăng 10 → 12 px do cascade; đã bổ sung selector giới hạn tổng quan để giữ 10 px độc lập thứ tự chunk. Không thay breakpoint hoặc spacing đã duyệt.

### Số đo sau refactor được giữ

Chín lượt mới, ba lượt/trang; cùng preset mobile và môi trường trên. Không có run warning/runtime error; CLS bằng 0 cả chín lượt.

| Trang | Điểm (khoảng) | LCP trung vị trước → sau | FCP sau | TBT sau |
|---|---|---|---|---|
| Trang chủ | 89 (88–95) | 3,66 → 3,62 s | 1,66 s | 21 ms |
| Lộ trình | 86 (86–89) | 4,14 → 4,07 s | 1,66 s | 22 ms |
| Thành tích, trang đối chứng | 97 (93–98) | 3,30 → 2,56 s | 1,51 s | 15,5 ms |

Trang đối chứng gần như không đổi byte (508.933 → 508.927), nhưng LCP vẫn biến động lớn. Vì vậy không quy toàn bộ chênh lệch thời gian hoặc điểm số cho refactor. LCP lộ trình vẫn chậm; giảm 0,07 s chưa đủ để kết luận cải thiện rõ rệt.

Đối chiếu lượt thứ hai của lộ trình:

| Tài nguyên | Trước | Sau |
|---|---:|---:|
| JavaScript, gồm prefetch | 311.340 B | 300.846 B |
| CSS chặn render trong audit, 8 request | 45.926 B | 44.828 B |
| Toàn bộ CSS, gồm tải sau/prefetch | 59.662 B | 58.564 B |
| HTML | 18.009 B | 25.868 B |
| Tổng truyền tải | 582.210 B | 578.479 B |

Nội dung server làm HTML tăng khoảng 7,9 KB; JavaScript giảm khoảng 10,5 KB và tổng giảm khoảng 3,7 KB. Đây là cải thiện dung lượng nhỏ, không phải đã giải quyết toàn bộ đường tải đầu. Danh mục từ HTML cuối lưu riêng ở scratch/performance-final-assets.json: không gộp prefetch hoặc script nomodule vào JS tải đầu của Edge. CSS chặn render ước tính còn 730–760 ms tại lộ trình; polyfill Next vẫn khoảng 14 KiB, hình ảnh còn dư theo audit. Giữ font/prefetch/ảnh hiện hành vì chưa có thay đổi thêm được chứng minh an toàn và có lợi.

Bản build sau phép đo chỉ cố định gap 10 px của nhãn chương dưới 520 px; build đạt, Edge **2 nhóm/212 assertions** query và CSS điều hướng đạt, **24/24 vùng** tại 375/768/1440 px khớp toàn bộ hình học với bản trước refactor. Không đo lại chín lượt cho thay đổi dưới vùng hero này. Chưa deploy hoặc đo PageSpeed production.

Bằng chứng ngoài Git: scratch/performance-final/ (9 JSON/HTML), scratch/performance-final-assets.json, scratch/roadmap-refactor-public-report.json, scratch/roadmap-refactor-before/, scratch/roadmap-refactor-after/, scratch/roadmap-geometry-diff.json, scratch/roadmap-image-diff.json. Ảnh QA không là tài nguyên runtime.

## Giới hạn môi trường

Kiểm tra production sau phát hành, xác minh Search Console/gửi sitemap, dữ liệu INP thực và nghiệm thu một đơn hợp lệ tới admin vẫn là các bước riêng. Không suy trạng thái production từ kết quả local này. Không chạy lại database tests vì thay đổi chỉ ở renderer công khai, CSS và ảnh; không sửa hợp đồng/API/database.
