# Tiến độ, khoảng trống và định hướng

Cập nhật **05/10/2026**. Cleanup `b026e07` từ `codex/repository-cleanup-20261005` được gộp vào `main` theo yêu cầu chủ repo; checkout trên máy làm việc dùng trực tiếp `main`. Main trước khi gộp được giữ tại `codex/main-backup-20261005` (`669ff41`), đã push và đối chiếu SHA remote trước khi merge. Giữ nguyên lịch sử, không force-push.

Bằng chứng bên dưới thuộc mã và kiểm thử local; lần đối chiếu database production gần nhất vẫn là **01/10/2026**. Push main có thể kích hoạt CI/Vercel qua Git integration, nhưng chưa xác minh kết quả hosted/deployment; không coi merge là nghiệm thu production. Không chạy migration, tạo bucket, thay cấu hình email hoặc gửi thư trong lượt gộp nhánh.

## Website và repository hiện hành — 05/10/2026

- Trang giới thiệu, lộ trình và catalog A/B/C/E/K đã tích hợp Next.js. Nội dung A9/B15/C+D19 giữ đúng nguồn; E Chủ lực tuyển từ C theo cập nhật mới 05/10, K tùy chọn. PreVOI giữ riêng trong quản lý; không chuyển lớp thật hoặc sửa lịch sử.
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
