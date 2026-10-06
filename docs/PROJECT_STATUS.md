# Tiến độ, khoảng trống và định hướng

Cập nhật **06/10/2026**. Mã nền hiện tại là `f83c3a6` (`Eco-system-update`) trên `main`; các chỉnh UI ngày 05–06/10 đã có trong commit này. Đợt bàn giao chỉ đối chiếu local, không xác minh remote/CI/Vercel hoặc production. Điểm bắt đầu cho cuộc hội thoại mới: [HANDOFF](HANDOFF.md); workflow [frontend](FRONTEND_WORKFLOW.md) và [backend](BACKEND_WORKFLOW.md).

Cleanup `b026e07` từ `codex/repository-cleanup-20261005` được gộp vào `main` theo yêu cầu chủ repo; checkout trên máy làm việc dùng trực tiếp `main`. Main trước khi gộp được giữ tại `codex/main-backup-20261005` (`669ff41`), đã push và đối chiếu SHA remote trong lượt gộp đó. Giữ nguyên lịch sử, không force-push.

Bằng chứng bên dưới thuộc mã và kiểm thử local; lần đối chiếu database production gần nhất vẫn là **01/10/2026**. Push main có thể kích hoạt CI/Vercel qua Git integration, nhưng chưa xác minh kết quả hosted/deployment; không coi merge là nghiệm thu production. Không chạy migration, tạo bucket, thay cấu hình email hoặc gửi thư trong lượt gộp nhánh.

## Website và repository hiện hành — 06/10/2026

### Gói frontend được phép commit/push — 06/10/2026

- Chủ repo yêu cầu commit và push các thay đổi frontend/handoff trên `main`. Trước thao tác, đã fetch và đối chiếu local/`origin/main` cùng `f83c3a6`, không có commit chênh lệch; dùng push bình thường, không rewrite lịch sử.
- Gói gồm workflow bàn giao, khoảng cách trang, đăng ký học, catalog/nội dung lộ trình riêng A/B/C/E/K, poster/lightbox, màu chặng và điều hướng mục. Chỉ đưa bốn WebP được chọn vào Git; PNG/JPG nguồn trong `public/images/courses`, prototype, báo cáo/ảnh QA và dữ liệu nội bộ giữ local.
- Bằng chứng local dùng Node.js **26.10.0**: typecheck, lint strict, build với Supabase placeholder/email tắt, guard tests **6/6** đạt. Các lượt browser QA liên quan đạt **56 bố cục / 759 assertion** cho ảnh/màu/điều hướng và lượt cuối **16 bố cục / 275 assertion** cho tách A/B, redirect, selector, sitemap, curriculum và đăng ký. Không chạy lại DB/API regression vì không thay backend/JSON curriculum; không thử Storage, portal có phiên hoặc production. Không coi push là xác minh CI/Vercel hoặc nghiệm thu production.

- Trang giới thiệu, lộ trình và catalog A/B/C/E/K đã tích hợp Next.js. Nội dung A9/B15/C+D19 giữ đúng nguồn; E Chủ lực tuyển từ C theo cập nhật mới 05/10, K tùy chọn. PreVOI giữ riêng trong quản lý; không chuyển lớp thật hoặc sửa lịch sử.
- Trang chủ dùng bốn lý do giáo dục và cây bốn nhánh quanh terminal, có CTA CSATOJ; đoạn phụ huynh gồm hai phần về quá trình học và đồng hành. Lộ trình dùng tiêu đề/art trước bốn ảnh blur, cụm 9 icon sau bộ chọn rồi năm phần lớp riêng; không còn hero cũ hoặc sơ đồ A/B/C lặp lại.
- Menu dùng chung tại website, đăng nhập và shell phụ huynh; font Archivo, logo KVANT dạng SVG compact, nền dots/blob/watermark. Hero, timeline sáu bước và bộ chọn lộ trình có responsive, reduced motion và trạng thái đọc không JavaScript.
- `/gia-su` dùng chung hero/đội ngũ với trang chủ. `/bai-dang` có ba bài giới thiệu và trang riêng một ảnh từ nội dung frontend; chưa có database đăng bài.
- Writing dùng WebM 960×720 khoảng 1,66 MB, khung ngang 4:3; lazy, mute, lặp trong viewport, có dừng/phát và poster. Hai video nguồn khác chưa được duyệt vị trí.
- Hai form tư vấn/tài liệu chỉ nhập, kiểm tra, xem lại và sao chép để nhắn qua liên hệ thật; không gọi API, lưu liên hệ hoặc báo đã gửi. Bật biến môi trường chưa tự nối được form.
- Reveal màu 700 ms, slide 820 ms; nội dung mở sau khi thanh phủ kín. Glyph không thay văn bản thật; listener/observer/rAF được dọn khi đổi trang.
- Prototype, font Space Grotesk không dùng, SVG gốc trùng với compact, hai ảnh dẫn xuất không còn dùng và hồ sơ duyệt HTML đã chuyển vào kho nội bộ. Bỏ `GradientOrbs` và helper gia sư ghi/xóa trực tiếp không có nơi gọi; giữ nguyên migration, fixture và baseline lịch sử.
- TypeScript/lint không quét kho nội bộ; guard chặn tài nguyên nguồn và cấu hình IDE kể cả force-add. `.vercelignore` bảo vệ cả gói CLI, không chỉ Git. Lịch sử thao tác thiết kế được lưu nội bộ; tài liệu hiện hành liên kết tới nguồn chuẩn, không lặp lại biên bản HTML.

Nguồn: [website công khai](PUBLIC_WEBSITE.md), [nhận diện](PUBLIC_UI_DESIGN_SYSTEM.md), [chuyển động](UI_MOTION_WORKFLOW.md), [catalog](PUBLIC_COURSE_CATALOG.md), [bài đăng](PUBLIC_POSTS.md).

## Kiểm chứng bản cleanup b026e07

- Database/API: **256/256**, không skip, gồm PostgreSQL native, concurrency và restore trên database tách biệt.
- Guard: **6/6**; quét 353 tệp working tree và 83 tệp thêm/sửa trong index staged không có finding. Diff staged không có lỗi whitespace; gói nội bộ không nằm trong index.
- TypeScript, lint strict **0 cảnh báo**, build local với Supabase placeholder và email tắt đạt. Build đầu phát hiện mã lưu nội bộ bị TypeScript quét; đã sửa exclude và chạy lại đạt.
- Browser QA bản build: **156 bố cục, 1.169 kiểm tra đạt**, desktop/tablet/mobile, light/dark, normal/reduced motion, no-JS, menu/bàn phím, glyph, curriculum và form frontend không gửi request. Không có lỗi JavaScript, asset thiếu hoặc request ghi không được mock. Kết quả thuộc build hiện hành, không phải demo HTML cũ.
- Không đọc/ghi production, tạo bucket, gửi email hoặc deploy. Chưa chạy `npm ci` mới hoặc CI hosted trong đợt này; CLI kiểm tra được gọi trực tiếp bằng Node.

## Đánh giá hiện tại — 01/10/2026

**Nền tảng nghiệp vụ đã có kiểm thử và đang được sử dụng, nhưng chưa đủ cơ sở gọi toàn hệ thống ổn định để mở đầy đủ tính năng.** Vướng mắc chính là xác thực và chênh lệch giữa mã ứng dụng với schema production; việc thiếu Resend chỉ là một phần của công việc còn lại.

Đợt đọc production chỉ đọc ngày 01/10/2026 lúc 17:42 (Việt Nam) xác nhận:

- Registry vẫn gồm 05–17 và 20; thiếu **18, 19, 21, 22**.
- Chưa có bảng tư vấn, bảng đối soát email và bảng quản lý vòng đời avatar. `tutor_public_profiles` mới có thông tin giới thiệu cũ, chưa có các trường hồ sơ mở rộng.
- Chưa có bucket `tutor-avatars`. RPC phụ huynh chưa chứa `tuition_amount` hoặc `avatar_path`.
- Email tháng tắt và chưa cấu hình người nhận tổng hợp admin trong database.
- Các bảng thường trong schema public đều bật RLS. Điều này không thay thế việc kiểm tra policy, quyền của RPC và xác minh danh tính người tra cứu.

Đối chiếu mã xác nhận SEC-01/02 và MAIL-01/02 vẫn còn. API hồ sơ gia sư sẽ báo đang chờ cập nhật database khi truy vấn các cột mới chưa tồn tại; có mã giao diện không đồng nghĩa tính năng đã sử dụng được.

**Thứ tự xử lý:** (1) thống nhất và triển khai xác thực phù hợp cho phụ huynh/gia sư; (2) hoàn tất migration, Storage và nghiệm thu phụ huynh trên môi trường thử trước phát hành được phép; (3) sửa hai lỗi email rồi cấu hình/thử Resend; (4) củng cố CI, kiểm thử trình duyệt và chuẩn hóa module; (5) tích hợp CSATOJ, mở rộng nội dung sau khi có nguồn được duyệt.

Chưa kiểm tra lại production trong đợt dọn repository 05/10. Mốc này không bao gồm uptime, tải thực tế, cấu hình dashboard Vercel/GitHub hoặc nghiệm thu Storage thật. Phải đối chiếu lại schema trước lần phát hành tiếp theo.

## Những mốc đã xác minh

- Nền quản lý lớp, học sinh, gia sư, điểm danh, chốt sổ và audit đã có trong mã; registry production đã có 05–17.
- Ngày 24/09, migration 20 chuyển các lớp Cơ bản/Nâng cao hiện có sang khung đã duyệt, có snapshot và giữ nháp/công bố. Kiểm tra phụ huynh và bảo toàn dữ liệu đã được ghi nhận. Số liệu/backup chi tiết lưu nội bộ.
- Cơ bản mặc định A+B: 7 chặng/24 chủ đề; Nâng cao C+D: 6 chặng/19 chủ đề. Không đổi Luyện thi tùy chỉnh. Chặng cũ cần được gia sư xác nhận lại, không tự suy ra.
- Thao tác bổ sung số phụ huynh từ số học sinh hợp lệ đã được cho phép và thực hiện một lần; không phải quy tắc cho hồ sơ mới. Không copy link liên hệ thành số điện thoại.
- Trang công khai và parent shell mới đã có trong commit phát hành được ghi nhận. Các mở rộng schema của ứng dụng chưa được triển khai đầy đủ.
- Biên bản hồ sơ gia sư ngày 23/09 ghi nhận 253 kiểm thử local, TS/build, browser QA đạt; đây là bằng chứng cũ, không thay cho kiểm thử sau thay đổi.

## Ma trận tính năng / triển khai

| Hạng mục | Mã/test local | Production được ghi nhận | Điều kiện hoàn tất tiếp |
|---|---|---|---|
| Quản lý và kế toán | Đã có | Schema nền đến 17 | Đối soát các tồn đọng lịch sử có chứng cứ, không tự sửa |
| Khung chương trình A+B/C+D | Đã có | 20 đã áp dụng | Xác nhận chặng lớp; giám sát tùy chỉnh có chủ ý |
| Nội dung phụ huynh | Đã có | Luồng đọc/cross-student đã kiểm tra | Phí buổi học (21), hồ sơ/ảnh (22), staging cuối |
| Tư vấn | Backend request/outbox/admin đã có; form mới chỉ frontend | 18/19 còn thiếu tại lần kiểm tra | Migration + hash key + bật nhận form khi có người vận hành |
| Hồ sơ/ảnh gia sư | Đã có revision/upload/cleanup | 22 và bucket chưa có tại lần kiểm tra | DB + bucket/policy + QA Storage thật |
| Email nhắc/tổng hợp | Đã có worker/admin UI | Chưa bật gửi | 18/19/21, sửa MAIL-01/02, Resend, thử thật được phép |
| API CSATOJ | Chỉ placeholder | Chưa tích hợp | Hợp đồng API, mapping, adapter server, quyền và dữ liệu thật |
| HSGQG | Trang định hướng mở rộng | Không phải giáo trình được duyệt | Trung tâm duyệt nội dung trước triển khai đào tạo |

## Backlog theo thứ tự ưu tiên

| ID | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| SEC-01 | Thay mật khẩu khởi tạo gia sư bằng số điện thoại | Duyệt luồng mời/reset, secret ngẫu nhiên và xử lý tài khoản cũ; không gửi hàng loạt hoặc reset khi chưa được phép |
| SEC-02 | Nâng xác thực phụ huynh | Chọn phương án xác minh người dùng/phương thức nhận mã phù hợp; chống dò, thu hồi phiên, kiểm tra liên kết; có kế hoạch chuyển đổi phụ huynh hiện tại |
| DB-01 | Hoàn thiện schema và tương thích bản deploy | Đã xác minh 01/10 còn 18 → 19 → 21 → 22, bỏ qua 20; đối chiếu lại trước khi áp dụng; backup/restore thử, SQL verification, grants/RLS và smoke theo vai trò |
| PROFILE-01 | Avatar và hồ sơ gia sư thật | Bucket/policy đúng, thử upload/thay/gỡ và lỗi DB/Storage trên staging, không mất ảnh cũ/không xóa ảnh đang dùng |
| PARENT-01 | Nghiệm thu cuối cổng phụ huynh | Đúng published, nhiều con/lớp, nhận xét/đính chính, phí null/đã chốt/tạm tính/hoàn, mobile/dark/keyboard/print |
| MAIL-01 | Tổng hợp admin mới tạo trong đợt cũ không bị quá hạn ngay | Tính hạn theo vòng đời đúng loại thư; kiểm tra đợt >7 ngày và qua tháng |
| MAIL-02 | Retry sau worker crash vẫn chờ ≥5 phút | Lưu mốc lúc claim, áp dụng reclaim; thử tại 3–5 phút, lease cũ không ghi đè lease mới |
| MAIL-03 | Cấu hình và nghiệm thu Resend | Domain verified, key server-only, email tắt mặc định; mẫu giả gửi trung tâm sau cho phép; phân biệt accepted với Gmail thực nhận |
| OPS-01 | Hoàn tất workflow nhóm | CI mới chạy xanh trên GitHub, ruleset/reviewer do chủ repo cài, Vercel cùng runtime; không cấp secret production cho CI/Preview |
| ARCH-01 | Chuẩn hóa module theo từng luồng | Tách trang chi tiết lớp lớn, thống nhất query/action/validation, helper gia sư cũ không có nơi gọi đã bỏ ngày 05/10; giữ nguyên hợp đồng API/RPC và kiểm thử trước/sau |
| QA-01 | Làm browser QA di động hơn | Khóa dependency/runner Playwright độc lập máy tác giả, fixture giả, không cần prototype riêng để chạy CI |
| DATA-01 | Đối soát lịch sử và liên hệ còn thiếu | Làm trong gói nội bộ; từng sửa có căn cứ/quyền/audit; không thay đổi hàng loạt để làm sạch số liệu |
| OJ-01 | Tích hợp CSATOJ | Mapping ID bền vững, quyền chéo, timeout/cache/rate limit; dữ liệu thiếu là null, không suy ra năng lực |
| CONTENT-01 | Mở rộng giáo trình | Nội dung được trung tâm duyệt, version mới, tách định hướng với chương trình chính thức |

SEC-01/02 là hành vi thực trong mã, không thể khắc phục bằng `.gitignore` hoặc tài liệu. Đợt bàn giao này ghi nhận để duyệt thiết kế; chưa thay đổi phương thức đăng nhập.

## Quy tắc công bố tiến độ

Mỗi cập nhật ghi: ngày Việt Nam, phạm vi/commit, môi trường, kiểm thử thật đã chạy, migration thực đã áp dụng, phần còn thiếu. Không đánh dấu production hoàn tất từ test mock hoặc lấy kết quả test cũ cho bản mới.

Chi tiết email/API: [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md). Phát hành: [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md). Đối soát/tệp riêng: [SECURITY.md](../SECURITY.md).

## Bổ sung giao diện — 05/10/2026 (local, chưa phát hành)

- E Chủ lực cập nhật theo ảnh/xác nhận mới: tuyển riêng từ C, hướng HSG Tỉnh/tuyển sinh chuyên Tin, 3–4 học sinh, 2 giờ/buổi, lịch theo thành viên. Không thay giáo trình hoặc loại lớp trong database; PreVOI quản lý giữ nguyên. Mapping tương lai cần tách E khỏi `voi` và tư vấn quốc gia.
- Lộ trình chia năm lớp riêng, bỏ mục mở thêm hướng đi; gradient/reveal theo từng phần. Hai nửa luyện tập xuất hiện đối xứng đã chuyển sang trang học liệu trong lượt tiếp theo; art phụ huynh thêm nội dung.
- `/login` là trang liên lạc chung, switch Phụ huynh/Gia sư; hai handler xác thực được tách dùng lại. Bỏ shell đăng nhập trùng và các số thống kê hardcoded không có nguồn. `/tutor` giữ kiểm tra phiên qua proxy.
- `/thanh-tich` là trang công khai riêng, chỉ khung nội dung; chưa nhận dữ liệu thành tích, không dựng số liệu/bài giả. Menu, footer, sitemap và public route đã đồng bộ.
- Kiểm thử local: guard 359 tệp không có finding, guard test 6/6; API/phân quyền phụ huynh 15/15; TypeScript, lint strict 0 cảnh báo và production build đạt. Hai handler xác thực tách ra được đối chiếu với HEAD, giữ nguyên nghiệp vụ (chỉ cải thiện kiểu lỗi phụ huynh).
- Browser QA theo phạm vi: 60 bố cục trang sửa ở 375/768/1440, light/dark, normal/reduced motion đều đạt; no-JS, 320 px/reflow, menu/bàn phím, curriculum, form frontend và liên kết quốc gia đạt. Hai kịch bản selector/auth ban đầu vướng assertion phân biệt hoa/thường và locator trùng route announcer; đã sửa rồi chạy lại cùng 12 bố cục trang liên lạc, tổng 105 kiểm tra đạt. Switch cũng được kiểm chứng với điều hướng client và lỗi đăng nhập bằng mock, không tài khoản thật.
- Kiểm tra ảnh bản cuối: art phụ huynh desktop/mobile không đè thẻ lên nội dung giữa hoặc cắt viền; trang liên lạc không-JS có liên hệ hỗ trợ, ẩn form không thể hoạt động. Ảnh QA ở `scratch/`, ngoài Git. Không chạy lại toàn bộ DB/migration/concurrency vì không đổi schema/RPC; chưa nghiệm thu đăng nhập tài khoản thật hoặc production. Kết quả cleanup phía trên là của bản trước.
- Preview bản build tại cổng 3101. Không commit/push/deploy, đọc/ghi database hoặc gửi email trong đợt này.

## Nội dung và học liệu — 05/10/2026 (local, chưa phát hành)

- Agent biên tập riêng nghiên cứu CS50, Raspberry Pi, Teach Computing/STEM Learning và VNOI; diễn giải A/B/C/E/K qua hoạt động đọc đề, chia nhỏ, kiểm lỗi, lý giải tính đúng và hiệu quả. Nguồn và nguyên tắc ở [website công khai](PUBLIC_WEBSITE.md). Giữ nguyên danh mục A9/B15/C+D19, giáo trình/học phí E không được tự bổ sung.
- `/hoc-lieu-mien-phi` dùng lại phần Không gian luyện tập, video writing và form tài liệu. Trang chủ thay bằng lý do chọn CSAT: bài tập có định hướng, contest, nhóm học nhỏ, gia sư chuyên Phan. Không có file tải giả hoặc luồng tự gửi tài liệu.
- Dock có lời mời nhận học liệu, nút đóng, liên kết nội bộ; footer bổ sung Gmail/Zalo/Facebook/TikTok, nguồn chuẩn `lib/public-contact.ts`. Không công bố địa chỉ/giờ hỗ trợ chưa được cung cấp, không đổi cấu hình mail.
- TypeScript, lint strict 0 cảnh báo, production build cấu hình giả đạt; guard 365 tệp không có finding, 6/6 kiểm thử guard đạt, diff không có lỗi whitespace. Browser QA: 36 bố cục đạt (home/học liệu đủ light/dark và normal/reduced, ba kích thước; lộ trình và năm lớp ở desktop/mobile); no-JS, menu/bàn phím, thứ tự nội dung và A9/B15/C+D19 đạt. Hai kịch bản điều hướng/form chạy lại đạt 52 kiểm tra sau khi sửa runner chờ điều hướng client. Kiểm tra trực quan thêm phần lý do chọn, học liệu và liên hệ ở 375/1440.
- Không chạy lại migration/concurrency hoặc tài khoản thật vì chỉ đổi nội dung/UI, thêm một route công khai và giữ auth/API. Preview bản build mới tại 3101; chưa commit/push/deploy, đọc/ghi production hoặc gửi thư. Tồn đọng database/bảo mật/email phía trên giữ nguyên.

### Tinh chỉnh hệ sinh thái và footer cùng ngày (local)

- Theo lựa chọn mạch điện/terminal: cây CSAT tỏa ba nhánh, mỗi nhánh ba gạch đầu dòng; bỏ liên kết trong phần này, thêm blob gradient và hover icon riêng. Cây dọc dưới 901 px; không bổ sung thành tích hoặc cam kết đầu ra.
- Liên hệ gộp vào footer hiện có; bỏ section liên hệ lớn. Popup học liệu lớn hơn, đặt trên nút liên hệ, giữ nút đóng và link thật.
- Lint riêng ba component đạt 0 cảnh báo; production build kèm TypeScript đạt với cấu hình thử. Browser QA theo phần đổi: 178 kiểm tra đạt, gồm cây ở 320/375/900/901/1440, light/dark, reduced motion, no-JS, menu/bàn phím, vị trí/đóng popup và liên kết học liệu/liên hệ. Kiểm tra ảnh desktop/mobile đạt; ảnh giữ ngoài Git. Không chạy lại DB/API vì không đổi các luồng này.
- Bản build mới vẫn ở cổng 3101, chưa commit/push/deploy hoặc thao tác production.
- Điều chỉnh tiếp hệ sinh thái: ô vuông tại giao điểm, ba icon SVG riêng trong `EcosystemIcon.tsx`, tên ưu điểm lớn thay khẩu hiệu, gạch đầu dòng ngắn hơn và watermark code ở góc dưới. Lint hai component 0 cảnh báo, build kèm TypeScript đạt; 110 kiểm tra trình duyệt phần cây/no-JS đạt. Đã xem ảnh desktop/mobile của bản cuối, không đổi database/API hoặc chạy lại kiểm thử các phần đó.

### Bốn lý do học thi đấu và dropdown lộ trình (local, 05/10/2026)

- Agent nghiên cứu riêng đề xuất hai phương án; chủ trung tâm duyệt phương án 1: lập luận/phản biện, giải có hệ thống, hiểu tin học sau công nghệ, kiên trì học cùng bạn. Nội dung thay phần “Không chỉ là những dòng code”; giữ tương tác bốn mục và fallback. Nguồn, giới hạn tuyên bố giáo dục và nơi sửa ở [PUBLIC_WEBSITE](PUBLIC_WEBSITE.md).
- Hệ sinh thái bỏ khẩu hiệu và đoạn giải thích riêng; tên ưu điểm nằm ngang icon, dùng typography phụ. Dây nối đưa xuống sau các nút/thẻ, giữ góc chéo, thêm chi tiết terminal góc cắt. Dock học liệu gọn hơn và bỏ nhãn lặp.
- `RoadmapNavigation.tsx` dùng native disclosure cho tổng quan và năm lớp: hover desktop, Enter/Space/Tab/Escape, bấm trên mobile; no-JS vẫn mở bằng summary. Không đổi catalog hoặc quyền truy cập.
- Lint riêng bốn component đạt 0 cảnh báo; production build và TypeScript đạt với Supabase giả/email tắt. Browser QA **219 kiểm tra đạt**: dropdown, menu/dock, bốn lý do, bóng đèn ở 320/375 light/dark, cây/nhánh ở 320/375/900/901/1440 light/dark, học liệu, no-JS. Đã xem ảnh cây desktop/mobile và phần lý do mobile. Guard quét **367 tệp**, không finding; diff không lỗi whitespace.
- Bản build đang chạy tại cổng 3101. Chưa commit/push/deploy hoặc thao tác database/email; không chạy lại DB/API không thay đổi. Các tồn đọng production phía trên giữ nguyên.

### Tinh gọn đầu đề và trang liên lạc (local, 05/10/2026)

- Bỏ heading riêng của hệ sinh thái và CSS không còn dùng; art terminal dẫn trực tiếp vào ba nhánh. Section giữ tên truy cập cho trình đọc màn hình.
- `/login` ở cả hai vai trò không render dock và lời mời học liệu; `/tutor` cũng loại trong lúc redirect. Không thay các form, liên hệ hỗ trợ hoặc xác thực.
- AGENTS và [quy tắc thiết kế](PUBLIC_UI_DESIGN_SYSTEM.md) bổ sung cách dùng đa dạng phương pháp từ `ui-ux-pro-max`, không bắt buộc mỗi phần có heading lớn; giữ nhận diện và accessibility. Đã đọc/tra cứu skill local, không dùng gợi ý tự động để thay font/màu hoặc tạo số liệu.
- Lint hai component đạt 0 cảnh báo; build kèm TypeScript đạt với cấu hình giả. Browser QA **100 kiểm tra đạt** cho trang liên lạc (lỗi auth giả, switch, desktop/mobile không có dock) và hệ sinh thái light/dark ở các breakpoint. Guard 367 tệp không finding, diff sạch. Không chạy lại DB/API không đổi; bản build mới chạy tại 3101, chưa commit/push/deploy hoặc gửi email.

### Nội dung sâu hơn và hệ sinh thái bốn nhánh (local, 05/10/2026)

- Đoạn dẫn và bốn lý do được biên tập theo mạch tình huống → hoạt động tư duy → giá trị học tập, mỗi đoạn ba câu. Giữ giới hạn tuyên bố giáo dục; không cam kết chuyển giao tư duy hoặc điểm thi. Bóng đèn nằm cùng nhãn trong luồng bố cục, không còn lệch/phủ heading.
- Terminal CSAT ở giữa hai hàng, mỗi hàng hai thẻ, cột phải lệch xuống 24 px; thêm đường phụ/chip/cổng vuông và icon bảng học tập cho nhánh Đồng hành sát sao. Dưới 901 px dùng luồng dọc. Nhận xét tháng, kết nối gia sư và tư vấn lộ trình theo nội dung chủ trung tâm cung cấp; số bài/điểm CSATOJ diễn đạt là nội dung trao đổi cùng gia sư, chưa tự đồng bộ trong Portal.
- Phần phụ huynh thêm nút trao đổi với đội ngũ, dẫn tới form hiện hành `/lo-trinh#tu-van`. Không tạo route đăng ký mới, không bật gửi form/email hoặc thêm API/database.
- Lint ba component 0 cảnh báo; build kèm TypeScript đạt với Supabase giả/email tắt. Browser QA **136 kiểm tra đạt**: bốn lý do/bàn phím, bóng đèn 320/375 light/dark, bốn nhánh ở 320/375/900/901/1440 light/dark, reduced motion và no-JS. Đã xem ảnh sơ đồ, nội dung desktop/mobile và CTA mobile; không tràn hoặc che chữ. Guard 367 tệp không finding, diff sạch. Không chạy lại DB/API không đổi.
- Preview bản build mới tại 3101. Chưa commit/push/deploy hoặc thao tác production; ảnh QA và script biên tập giữ ngoài Git.

### Mở đầu lộ trình và CTA CSATOJ (local, 06/10/2026)

- Trang chủ: Kho bài & máy chấm có nút Trải nghiệm ngay mở CSATOJ ở tab mới; đoạn mô tả phụ huynh mở rộng thành hai đoạn về quá trình học, nhận xét công bố, trao đổi và hỗ trợ tự luyện. Không tuyên bố các chỉ số CSATOJ đã đồng bộ vào Portal.
- Lộ trình: dùng tiêu đề Lộ trình học lập trình cùng CSAT Tutor và art terminal ở trước bốn ảnh nền/blur. Bỏ hero cũ, interlude riêng và sơ đồ A/B/C lặp lại. Chín icon chuyển xuống giữa bộ chọn và lớp A, tản bất đối xứng rồi hội tụ theo cuộn; no-JS/reduce hiện bố cục hoàn chỉnh. Dọn CSS/selector không còn dùng, giữ chương trình và form frontend hiện hành.
- Build kèm TypeScript và lint strict ba component đạt. Ba nhóm browser QA no-JS, selector/history/query và hệ sinh thái/CTA đạt; nhóm mở đầu/cuộn mới đạt **43 kiểm tra** ở 375/1440, light/dark và reduced motion. Assertion tiêu đề ban đầu phân biệt hoa/thường không đúng với CSS viết hoa đã được sửa và chạy lại đạt. Đã xem ảnh hero desktop/mobile, thẻ CSATOJ mobile và phần phụ huynh desktop; không che chữ hoặc tràn ngang.
- Guard quét 367 tệp không finding; diff không lỗi whitespace. Không chạy lại DB/API vì không sửa các luồng này. Preview build tại 3101; chưa commit/push/deploy, gửi email hoặc truy cập database production. Trạng thái production và các tồn đọng trước đó giữ nguyên.

### Gỡ skill riêng của project (local, 06/10/2026)

- Theo yêu cầu chủ repo, đã xóa 7 skill trong thư mục .agents/skills ngoài Git: banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max; xóa thư mục .agents sau khi rỗng. Chủ repo sẽ tự cài lại skill dùng chung cho Codex.
- Đã kiểm tra thư mục không có symlink/reparse point trước khi xóa và xác nhận không còn sau thao tác. Không thay mã runtime, skill chung, database hoặc production; không chạy lại build/DB/UI vì chỉ gỡ công cụ local.

### Bàn giao cuộc hội thoại và workflow (local, 06/10/2026)

- Đối chiếu `main` tại `f83c3a6`, route/component, API xác thực, migration 01–22 và cấu hình CI/test. Thêm HANDOFF làm điểm bắt đầu; FRONTEND_WORKFLOW và BACKEND_WORKFLOW phân trách nhiệm, hợp đồng chung, skill/QA và điều kiện phát hành. README, AGENTS, CONTRIBUTING, danh mục docs và ARCHITECTURE dẫn về các nguồn này.
- Skill frontend dùng bản chung ngoài project: design, ui-styling, ui-ux-pro-max; không khôi phục skill vào repo hoặc đổi nhận diện. Sửa dòng menu trong design system cho đúng route Thành tích/Đội ngũ/Bài đăng/Trang liên lạc hiện có; phân biệt backend tư vấn đã có với form frontend chưa nối.
- Giữ ghi chú gỡ skill đã có và bốn PNG nguồn chưa tracked trong `public/images/ảnh khóa học/`; chưa chọn, tối ưu hoặc đưa ảnh vào runtime/Git. Không thay mã ứng dụng, API/schema, công tắc email hay preview.
- Kiểm tra tài liệu/guard: **374 tệp, không finding**, guard tests **6/6**, không skip; diff không lỗi whitespace. Không chạy lại TypeScript/lint/build/DB/browser vì chỉ sửa Markdown, không tạo PR hoặc phát hành trong đợt này. Bằng chứng UI trước đó vẫn thuộc các bản được ghi riêng, không dùng thay nghiệm thu sau một thay đổi mã mới.
- Chưa commit/push/deploy hoặc đối chiếu production mới. Mốc production giữ 01/10; SEC-01/02, DB/Storage, MAIL-01/02 và API CSATOJ còn theo backlog hiện hành.

### Tách A/B trên website, bỏ A+B công khai (local, 06/10/2026)

- Theo xác nhận mới, A+B chỉ là cách gộp tạm trong quản lý nội bộ. Website giữ năm lớp A/B/C/E/K riêng: bỏ nội dung/trang A+B, gợi ý và ngữ cảnh AB ở selector, chú thích A+B trong đăng ký và mục sitemap. Người mới bắt đầu được gợi ý A; các nền tảng khác vẫn được tìm hiểu A/B hoặc B/C riêng.
- URL cũ `/lo-trinh/co-ban` và `/lo-trinh/basic` chuyển về `/lo-trinh`; không chuyển người dùng sang một lớp cụ thể khi chưa có lựa chọn. Catalog/metadata/biên tập công khai không còn mã AB. A giữ 9 chủ đề, B giữ 15; C giữ trọn C+D.
- Kiểm chứng **Node.js 26.10.0**: typecheck, lint strict và build với Supabase placeholder/email tắt đạt; guard **401 tệp không finding**, guard tests **6/6**, diff không lỗi whitespace. Browser QA cuối **16 bố cục / 275 assertion đạt**, gồm tổng quan/đăng ký/A/B ở mobile/desktop sáng/tối, selector/history, gợi ý từng nền tảng, loại `course=AB`, redirect URL cũ, sitemap, đối chiếu 9/15/19 chủ đề và truyền khóa sang form đăng ký. Không lỗi JS, thiếu asset hoặc request ghi. Báo cáo `scratch/public-release/qa-targeted-report.json`. Ca submit AB ban đầu thiếu cấp học bắt buộc đã được sửa fixture; lượt cuối không failure. Không chạy DB/API regression do không thay backend/curriculum.
- Catalog, HANDOFF và nghiên cứu nội dung ghi rõ định hướng lớp tương lai tách riêng. Không đổi chương trình quản lý `basic`, mặc định A+B, curriculum JSON, API/RPC hoặc lớp/lịch sử đang vận hành; đặc tả và chuyển đổi backend là nhiệm vụ sau. Chỉ local, chưa commit/push/deploy.

### Ảnh mở toàn màn hình, màu lộ trình và chuyển mục (local, 06/10/2026)

- Thêm `CoursePosterPreview` dùng chung trên tổng quan, chi tiết lộ trình và đăng ký học. Nhấn poster mở native dialog toàn màn hình với ảnh WebP đã chọn, nút Đóng và Escape; hỗ trợ bàn phím, giữ focus trong dialog và trả focus về ảnh. Khi không JavaScript, link vẫn mở ảnh trực tiếp.
- Trên tổng quan Tìm hiểu, poster làm nền trong vùng tên/mô tả/đối tượng/tag; nền ảnh được giới hạn trước vùng kiến thức. Màu lớp theo poster: A xanh lam, B tím, C cam, E/K xanh ngọc; màu chặng được phân biệt rõ hơn, tag A và các trọng tâm E dùng màu sáng/tương phản cao. Không thay palette thương hiệu toàn site hoặc nội dung giáo trình.
- Thêm hai nút Mục trước/Mục tiếp theo ở lề phải trang lộ trình và đăng ký học, dành khoảng riêng tránh che nội dung, vô hiệu hóa tại đầu/cuối. Cuộn tức thời khi reduced motion; listener, ResizeObserver và rAF có cleanup khi chuyển trang. Trang chủ giữ bố cục hiện hành.
- Kiểm chứng **Node.js 26.10.0**: TypeScript/lint strict, build với Supabase placeholder/email tắt đạt; guard **401 tệp không finding**, guard tests **6/6**, diff không lỗi whitespace. Browser QA cuối đạt **56 bố cục / 759 assertion**, gồm tổng quan, năm trang chi tiết và đăng ký ở mobile/tablet/desktop sáng/tối, reduced motion mobile, no-JS, reflow 320/720, history/selector, lightbox, điều hướng mục và form không gửi request. Không có lỗi JS, asset thiếu hoặc request ghi. Báo cáo `scratch/public-release/qa-targeted-report.json`; nhóm lightbox riêng đạt **113 assertion**. Đã xem ảnh A desktop sáng, E mobile tối và dialog desktop/mobile. Assertion nút trước được sửa để chờ cập nhật UI sau cuộn thay vì đọc trước rAF; lượt cuối không còn failure. Node 26 còn cảnh báo deprecation `module.register()` từ toolchain, không làm build thất bại.
- Chỉ thay frontend local; không sửa API/RPC/database, không gửi liên hệ, chưa commit/push/deploy. Không chạy DB/API regression, portal có phiên, Storage hoặc staging/production trong phạm vi này.

### Biên tập và trình bày lại lộ trình (local, 06/10/2026)

- Theo yêu cầu người dùng, tạo một agent riêng nghiên cứu trực tiếp bốn poster và nguồn sơ cấp VNOI/USACO Guide. Thêm `lib/public-roadmap-content.ts` cho định hướng A/B/C/E/K/A+B, 13 chặng và diễn giải đủ 43 chủ đề; căn cứ ở [ROADMAP_CONTENT_RESEARCH](ROADMAP_CONTENT_RESEARCH.md). Giữ mã/tên/thứ tự/phạm vi JSON đã duyệt, đối tượng và thông tin tuyển sinh từ catalog; không sao chép slogan, bịa thành tích hoặc cam kết đầu ra.
- Tổng quan dùng `RoadmapCourseSection`: poster đúng lớp 144 px (112 px mobile nhỏ) cạnh tên và facts, không sticky/reveal/cuộn; tiêu đề thẻ không glyph, bỏ chú thích dưới Đăng ký lớp. Hover ảnh/bóng chạy hữu hạn, reduced motion tắt. Các chặng có thứ tự, tag tên nội dung và kỹ năng rèn luyện; A/B/C/K có bố cục/màu riêng. E nổi bật căn giữa nền tối/lime, tách đường C → thi tuyển riêng → E khỏi ba trọng tâm phát triển tri thức/lập luận/tư duy thi đấu. E/K vẫn không có giáo trình/học phí tự tạo.
- Chi tiết đưa thanh chuyển năm lớp lên trên cùng. Thêm `CourseDetailContent` và `CourseStageNavigation`: sơ đồ chặng mở và dẫn tới native disclosure, diễn giải vai trò từng chặng/chủ đề, heading Archivo, tag nguồn và kỹ năng trọng tâm. Khóa mặc định sang đăng ký, whitelist/history và form xem lại/sao chép được giữ. Ẩn lời mời học liệu nổi trên các trang lộ trình để tránh che vùng đọc/bộ chọn; dock và link học liệu vẫn hoạt động.
- **Node.js 26.10.0:** TypeScript/lint strict, build Supabase placeholder/email tắt đạt; guard **396 tệp không finding**, guard tests **6/6**, diff không lỗi whitespace. Browser QA rộng kiểm chứng **56 bố cục** các trang tổng quan/A/B/C/E/K/A+B, ba kích thước và hai theme, thêm reduced motion mobile; no-JS, reflow 320/720, selector/history, curriculum, glyph ngoài thẻ, form và chuyển khóa đều đạt. Một assertion QA đếm nhầm cả nhóm đầu vào lẫn phát triển E đã được giới hạn về đúng section; chạy lại nhóm editorial đạt **99 assertion**, không lỗi JS, asset hoặc request ghi. Báo cáo `scratch/public-release/roadmap-layout-and-flows-report.json` giữ vòng rộng và `qa-targeted-report.json` giữ lần kiểm lại; đã xem ảnh cuối E desktop, B mobile dark và phần chủ đề B desktop.
- Chỉ frontend local, không sửa API/RPC/database/curriculum hoặc dữ liệu thật; chưa chạy DB/API regression, portal có phiên, Storage/staging/production. Chưa commit/push/deploy. Phạm vi giáo trình/học phí E vẫn cần trung tâm cung cấp khi triển khai tiếp.

### Tích hợp đăng ký học theo phương án 3 (local, 06/10/2026)

- Người dùng duyệt phương án 3 và yêu cầu chỉnh tiếp: đã tích hợp `/dang-ky-hoc`, thêm menu/footer/sitemap và CTA từ lớp A/B/C/E/K. Lưới 3/2/1 cột ở desktop/tablet/mobile; poster 144 × 144 px gấp đôi mẫu, màu/nhãn đặc trưng từng lớp, thời lượng và sĩ số ngay dưới tên. Đối tượng lấy từ poster, gồm khác biệt HSG cấp Phường/chuyên Tin ít cạnh tranh ở B và HSG cấp Tỉnh/chuyên Tin tỉnh mạnh ở C. K dùng hình thức 1–1/nhóm riêng do poster không có ô đối tượng riêng.
- Thêm `lib/public-courses.ts` làm nguồn nội dung tuyển sinh và thẻ đăng ký; thêm `CourseKnowledge` để trình bày chặng/tag từ curriculum JSON trên tổng quan lộ trình (A3/B4/C+D6), viết gọn các đoạn dẫn. E/K dùng các bước trao đổi, không tạo giáo trình hoặc giá mới. Thẻ có tag kiến thức mở rộng cho A/B/C; E/K giữ tag định hướng/hình thức có nguồn. Bốn WebP 1000 × 1000 khoảng 129–134 KB/tệp được chọn cho runtime tại `public/images/site/`; PNG nguồn giữ nguyên, loại khỏi gói Vercel CLI.
- Từ trang lớp X, CTA chuyển tới `/dang-ky-hoc?course=X#thong-tin`, khóa mặc định đúng X; form ngay tại trang lớp cũng có mặc định theo route, kể cả khi query chứa khóa khác. Server chỉ nhận A/B/C/E/K, mã lạ về tư vấn chung; người dùng đổi khóa được và lựa chọn đi vào bản xem lại. A+B vẫn là khung kiến thức, không thêm khóa tuyển sinh. Form chung bỏ Sinh viên, HSG Quốc gia, cấp học Đại học và Trao đổi thêm; selector được đồng bộ, các alias quốc gia cũ về đăng ký chung. Không thay backend enum/validation, API/RPC, curriculum hoặc dữ liệu thật.
- Kiểm thử bằng **Node.js 26.10.0**: TypeScript/lint strict đạt, guard **386 tệp không finding**, guard tests **6/6**, diff không lỗi whitespace. Build Next.js đạt với Supabase placeholder/email tắt; Node 26 phát cảnh báo deprecation `module.register()` từ toolchain nhưng build hoàn thành. Browser QA chọn lọc **28 bố cục / 506 assertion**, không failure, JS error, asset failure hoặc request ghi. Có desktop/tablet/mobile sáng/tối, reduced motion, no-JS, reflow 320/720 px, menu/selector/history, curriculum, truyền khóa cả 5 lớp, ghi đè mặc định trong form, lựa chọn bị bỏ ở đăng ký/tư vấn/học liệu và xem lại/sao chép. Báo cáo `scratch/public-release/qa-targeted-report.json`, ảnh `enrollment-*`; đã xem ảnh toàn trang desktop và thẻ sáng/tối mobile/desktop.
- Chỉ kiểm chứng local; chưa chạy DB/API regression, portal có phiên, Storage thật hoặc staging/production. Chưa commit/push/deploy. Lời mời học liệu được ẩn trên `/dang-ky-hoc` để giữ vùng form, lỗi dock ở các trang cũ chưa sửa trong phạm vi này. Các chỉnh sửa khoảng cách trước đó và công việc có sẵn được giữ.

### Thu gọn khoảng cách và mẫu đăng ký học (local, 06/10/2026)

- Theo chỉ định người dùng, dùng **Node.js 26.10.0** cho preview, tạo mẫu và kiểm thử lượt này. Không đổi engines/CI của repository trong phạm vi chỉnh frontend.
- Trang giới thiệu giảm 30% khoảng đệm giữa các phần; tổng quan lộ trình giảm 50%. Năm phần A/B/C/E/K có tiêu đề và ảnh thu về 70%, chiều cao tự co theo nội dung. Thêm `public-density.css` và class giới hạn trên hai overview; giữ trang đội ngũ, chi tiết lớp, Portal và form. Đo trước/sau tại 375/768/1440 px xác nhận tỷ lệ padding, heading và ảnh (sai số làm tròn ảnh dưới 1 px), không tràn ngang.
- Đã chuẩn bị ba HTML Đăng ký học: poster dẫn dắt, so sánh học phí, bản đồ kiến thức. Cùng catalog A/B/C/E/K, lưới 3/2/1 cột desktop/tablet/mobile, tag, giá và CTA tới form trao đổi frontend hiện có. A/B 99.000đ, C 109.000đ mỗi buổi; E/K trao đổi học phí. Bốn ảnh nguồn courses được giữ nguyên, bản WebP dẫn xuất chỉ ở prototype local. Không tạo khóa thứ sáu, không gửi đăng ký thật.
- Có bản duyệt nội dung từng lớp bằng ô/tag: A 3 chặng, B 4 chặng, C+D 6 chặng; E luồng thi tuyển từ C, K luồng thống nhất nhu cầu/nội dung/nhịp học. **Chờ người dùng duyệt**, chưa thay mô tả runtime hoặc tích hợp route Đăng ký học. Hồ sơ tại `scratch/frontend-density/review/index.html`; preview bằng `node scratch/frontend-density/serve.cjs`, loopback cổng 3102. Prototype và ảnh QA ngoài Git.
- Kiểm thử: TypeScript/lint strict đạt; browser trang thật **12 bố cục / 259 assertion**, không failure, JS error, asset failure hoặc request ghi. Phạm vi home/roadmap light/dark 375/1440, reduced motion 375/768, no-JS, reflow, menu/selector và form frontend. Mẫu HTML **30 bố cục** (5 trang × 3 kích thước × 2 theme), ảnh/font tải đủ, số cột/CTA đúng và không tràn ngang. Đã xem ảnh desktop ba mẫu và bản nội dung dark mobile. Báo cáo ở `scratch/public-release/qa-targeted-report.json` và `scratch/frontend-density/prototype-qa.json`.
- Chưa chạy build, DB/API regression hoặc QA portal có phiên; không commit/push/deploy hay thay backend/production. Lỗi dock che selector mobile phát hiện trước đó chưa nằm trong phạm vi sửa khoảng cách. Tiếp theo: người dùng duyệt nội dung từng lớp và chọn mẫu đăng ký, rồi mới tích hợp.

### Khảo sát để tiếp tục frontend (local, 06/10/2026)

- Đối chiếu lại `main` tại `f83c3a6`, diff tài liệu có sẵn, workflow, nhận diện, catalog, component công khai và hợp đồng phụ huynh/hồ sơ gia sư. Giữ nguyên các chỉnh sửa bàn giao và bốn PNG nguồn chưa tracked; không sửa mã ứng dụng hoặc backend trong lượt khảo sát.
- Preview Next.js dev tại `http://127.0.0.1:3100`, dùng script repo với Supabase placeholder/email tắt. Node mặc định trên máy là 26.10.0; lượt này dùng runtime Node **24.19.0** có sẵn cho đúng yêu cầu repo. Playwright lấy từ runtime local qua `PLAYWRIGHT_MODULE`, chưa được khóa thành dependency QA của repo.
- Guard **374 tệp, không finding**; guard tests **6/6**, TypeScript và lint strict **0 cảnh báo** đạt. Browser QA chọn lọc đạt **20 bố cục / 478 assertion**, không lỗi JavaScript, asset lỗi hoặc request ghi ngoài mock. Phạm vi: trang chủ/lộ trình/login/đội ngũ ở 375/1440 px, light/dark, thêm reduced motion mobile; no-JS, reflow 320 px/200%, menu/bàn phím, selector/history, đăng nhập lỗi giả, curriculum, hệ sinh thái, icon và form xem lại/sao chép. Báo cáo/ảnh tại `scratch/public-release/`, ngoài Git; đây là dev preview, không phải build production hoặc full browser suite.
- Đã xem ảnh mới của hero trang chủ/lộ trình desktop và selector dark mobile. Phát hiện **lời mời học liệu nổi che vùng chọn trên mobile**: tại 375×900, dark, cuộn `.rm-choose` tới cách đỉnh viewport 95 px, kiểm tra bounding box xác nhận `.dock-materials-notice` giao với các control `goal`/`background`. Runner hiện chưa kiểm tra che khuất ở trạng thái này; QA đạt không có nghĩa lỗi thị giác này đã được xử lý. Ưu tiên điều chỉnh hành vi/vị trí lời mời, giữ khả năng mở liên hệ, rồi kiểm tra focus/touch khi cuộn và mở bàn phím.
- Chuẩn bị lượt tiếp theo: xử lý điểm che khuất trên; rà lỗi từng trường của `PublicConsultation` (hiện thông báo lỗi chung); sau đó khảo sát portal phụ huynh/gia sư bằng fixture giả theo từng hành trình. Giữ Archivo/palette/logo, Base UI, catalog A/B/C/E/K và ranh giới draft/published/revision/null. Việc nối intake cần adapter với schema strict hiện có; không chỉ bật env hoặc gửi nhãn frontend vào API cũ.
- Không chạy build mới, DB/API regression hoặc browser portal có phiên trong lượt khám phá; chưa nghiệm thu Supabase Storage thật, CI hosted, remote hay production. Không commit/push/deploy, thay schema/cấu hình hoặc gửi thư. Mốc production 01/10 và các điều kiện phát hành trong backlog vẫn cần xác minh ở nhiệm vụ tương ứng.
