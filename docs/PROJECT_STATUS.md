# Tiến độ, khoảng trống và định hướng

Cập nhật tài liệu **01/10/2026**. `main` trên GitHub đã đối chiếu cùng ngày: `c4cf9f8` (`parent_page`). Thay đổi bàn giao hiện nằm ở working tree, chưa push. **Database production được đối chiếu lại bằng truy vấn chỉ đọc lúc 17:42 ngày 01/10/2026 (Việt Nam)**. Phạm vi gồm registry, các bảng/cột/RPC liên quan, bucket avatar, cờ email và RLS; không phải nghiệm thu giao diện production hay đối soát toàn bộ dữ liệu.

## Đánh giá hiện tại — 01/10/2026

**Nền tảng nghiệp vụ đã có kiểm thử và đang được sử dụng, nhưng chưa đủ cơ sở gọi toàn hệ thống ổn định để mở đầy đủ tính năng.** Vướng mắc chính là xác thực và chênh lệch giữa mã ứng dụng với schema production; việc thiếu Resend chỉ là một phần của công việc còn lại.

Đợt đọc production hôm nay xác nhận:

- Registry vẫn gồm 05–17 và 20; thiếu **18, 19, 21, 22**.
- Chưa có bảng tư vấn, bảng đối soát email và bảng quản lý vòng đời avatar. `tutor_public_profiles` mới có thông tin giới thiệu cũ, chưa có các trường hồ sơ mở rộng.
- Chưa có bucket `tutor-avatars`. RPC phụ huynh chưa chứa `tuition_amount` hoặc `avatar_path`.
- Email tháng tắt và chưa cấu hình người nhận tổng hợp admin trong database.
- Các bảng thường trong schema public đều bật RLS. Điều này không thay thế việc kiểm tra policy, quyền của RPC và xác minh danh tính người tra cứu.

Đối chiếu mã xác nhận SEC-01/02 và MAIL-01/02 vẫn còn. API hồ sơ gia sư sẽ báo đang chờ cập nhật database khi truy vấn các cột mới chưa tồn tại; có mã giao diện không đồng nghĩa tính năng đã sử dụng được.

**Thứ tự xử lý:** (1) thống nhất và triển khai xác thực phù hợp cho phụ huynh/gia sư; (2) hoàn tất migration, Storage và nghiệm thu phụ huynh trên môi trường thử trước phát hành được phép; (3) sửa hai lỗi email rồi cấu hình/thử Resend; (4) củng cố CI, kiểm thử trình duyệt và chuẩn hóa module; (5) tích hợp CSATOJ, mở rộng nội dung sau khi có nguồn được duyệt.

Phạm vi đánh giá này không gồm uptime, tải thực tế, dependency audit, cấu hình dashboard Vercel/GitHub hay đăng nhập vào các màn hình production. Kết quả 256 kiểm thử và build bên dưới thuộc đợt bàn giao trước cùng ngày, không phải lần chạy lại trong lượt chỉnh README. Lượt này chỉ sửa tài liệu, kiểm tra repo/liên kết và diff; không thay đổi ứng dụng hoặc database.

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
| Tư vấn | Đã có request/outbox/admin | 18/19 còn thiếu tại lần kiểm tra | Migration + hash key + bật nhận form khi có người vận hành |
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
| ARCH-01 | Chuẩn hóa module theo từng luồng | Tách trang chi tiết lớp lớn, thống nhất query/action/validation, rà soát helper gia sư cũ không có nơi gọi; giữ nguyên hợp đồng API/RPC và kiểm thử trước/sau |
| QA-01 | Làm browser QA di động hơn | Khóa dependency/runner Playwright độc lập máy tác giả, fixture giả, không cần prototype riêng để chạy CI |
| DATA-01 | Đối soát lịch sử và liên hệ còn thiếu | Làm trong gói nội bộ; từng sửa có căn cứ/quyền/audit; không thay đổi hàng loạt để làm sạch số liệu |
| OJ-01 | Tích hợp CSATOJ | Mapping ID bền vững, quyền chéo, timeout/cache/rate limit; dữ liệu thiếu là null, không suy ra năng lực |
| CONTENT-01 | Mở rộng giáo trình | Nội dung được trung tâm duyệt, version mới, tách định hướng với chương trình chính thức |

SEC-01/02 là hành vi thực trong mã, không thể khắc phục bằng `.gitignore` hoặc tài liệu. Đợt bàn giao này ghi nhận để duyệt thiết kế; chưa thay đổi phương thức đăng nhập.

## Quy tắc công bố tiến độ

Mỗi cập nhật ghi: ngày Việt Nam, phạm vi/commit, môi trường, kiểm thử thật đã chạy, migration thực đã áp dụng, phần còn thiếu. Không đánh dấu production hoàn tất từ test mock hoặc lấy kết quả test cũ cho bản mới.

Chi tiết email/API: [FUTURE_INTEGRATIONS.md](FUTURE_INTEGRATIONS.md). Phát hành: [SETUP_VERCEL_SUPABASE.md](SETUP_VERCEL_SUPABASE.md). Đối soát/tệp riêng: [SECURITY.md](../SECURITY.md).

## Kiểm chứng đợt bàn giao trước lượt đánh giá này — 01/10/2026

- Node local: 24.19.0. Hồi quy database/API: **256/256 đạt, không skipped**, gồm PostgreSQL native và phục hồi môi trường thử.
- Guard repo: **4/4 đạt**, gồm đọc đúng index staged thay vì chỉ working copy. Kiểm tra toàn bộ tệp dự kiến đưa vào Git và liên kết Markdown: không có lỗi.
- TypeScript đạt; lint **0 lỗi, 18 cảnh báo hiện hữu**; production build local đạt với Supabase placeholder và email tắt.
- Workflow YAML parse được; app Node 24, hai action upstream dùng Node 24 và khóa SHA, quyền chỉ đọc, không tham chiếu secret. Metadata package/lock khớp, không đổi phiên bản dependency ứng dụng.
- Các CLI được chạy trực tiếp bằng Node vì terminal Codex này không có npm trên PATH; `npm ci` mới và workflow GitHub hosted **chưa được chạy trong đợt này**. Cần kiểm tra cả hai job sau khi push được phép; không gọi đây là CI remote đã xanh.
- Không chạy lại browser QA vì không sửa giao diện/nghiệp vụ; không nghiệm thu Storage thật hoặc đọc/ghi production trong đợt bàn giao trước. Lượt đánh giá tiếp theo chỉ đọc production như phạm vi nêu ở đầu tài liệu.
- Tách báo cáo vận hành đầy đủ vào `internal/` bị ignore; các bản trong Git đã lược số liệu. Bỏ 5 `.gitkeep` rỗng, giữ nguyên migration/fixture/schema lịch sử và thay đổi nghiệp vụ có sẵn trong working tree.
- Chưa commit/push, đổi dashboard, tạo bucket, deploy hoặc gửi email. Stage index tại lúc kiểm tra rỗng; phải chạy lại guard `--staged` sau khi nhóm chọn tệp commit.
