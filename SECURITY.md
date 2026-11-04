# An toàn mã nguồn và dữ liệu

## Phạm vi được chia sẻ

Được đưa vào Git: mã ứng dụng, migration không chứa dữ liệu thật, fixture giả, lockfile, nội dung đào tạo đã duyệt, tài liệu đã lược thông tin cá nhân. Media công khai chỉ giữ bản được chọn/tối ưu; avatar upload nằm trong Storage.

Không đưa vào GitHub, PR, CI artifact hoặc prompt:

- `.env*` trừ `.env.example` có placeholder; service role, URL chứa mật khẩu, API/hash/cron secrets, private key, JWT/cookie/session.
- Dump/backup, export học sinh–phụ huynh–gia sư, liên hệ, học phí/chứng từ và audit chứa dữ liệu thật.
- Prototype, Excel nguồn, tài liệu nội bộ, ảnh QA chứa người học/số điện thoại.
- `scratch/`, `internal/`, `docs/internal/`, `private-data/` và cấu hình công cụ/tài khoản local như `.agents/`.

Repo private vẫn phải giữ các ranh giới này. `.gitignore` chỉ ngăn commit vô ý, không mã hóa hoặc kiểm soát quyền truy cập máy.

Video được duyệt `public/media/writing-960.webm` là ngoại lệ media có guard riêng cho đường dẫn, header, giới hạn 2 MB và checksum. Nguồn 4K và video chưa duyệt nằm ngoài Git/gói deploy; không mở rộng allowlist để bỏ qua review.

## Quyền và môi trường

- API/RPC kiểm phiên, vai trò, liên kết, bản công bố và phạm vi dữ liệu. Service role chỉ server; `server-only` không thay kiểm quyền.
- Test/Preview dùng fixture hoặc Supabase thử riêng. Không đọc production để tạo fixture, không tắt RLS/TLS/Origin hoặc giả môi trường để vượt chặn.
- Đọc production khi nhiệm vụ cần, chỉ đọc và báo cáo tổng hợp. Migration, ghi dữ liệu, Storage policy, gửi thư, deploy và xóa dữ liệu cần ủy quyền đúng phạm vi.
- Schema30 đã áp Supabase hiện tại03/11; mã Google + nhập số khớp để tự liên kết đã deploy04/11, nghiệm thu phiên/claim thật còn chờ. Phiên/quyền lookup cũ bị thu hồi, không cấp lại. Không OTP/admin duyệt/mã mời. Google chỉ xác thực tài khoản Google; Turnstile/rate limit không chứng minh sở hữu số hoặc quan hệ với học sinh. SEC-02 vẫn mở; không ghi số tự khai thành số đã xác minh. Giữ Auth lịch sử, không phục hồi provisioning mật khẩu cũ. [Hướng dẫn chuyển đổi](docs/PORTAL_GOOGLE_GRANTS_ROLLOUT.md).
- Gia sư/admin giữ Auth; mật khẩu khởi tạo gia sư cần cơ chế cải thiện đã duyệt. Email giữ tắt đến khi nghiệm thu.
- Đích liên kết một Google/một phone/một phụ huynh/một con, cưỡng chế tại DB; số đã có chủ không được Google khác nhận, lỗi không lộ Gmail/hồ sơ chủ. Phạm vi reset04/11 thay03/11: giữ toàn bộ Auth/tutors/hồ sơ/avatar/Storage/intake/catalog/registry/audit, xóa lớp/học sinh/phụ huynh/liên kết/phát sinh rồi nhập bộ mẫu. Đã backup/phục hồi/diễn tập và kiểm fingerprint bảo toàn; không chạy lại, không tự xóa user/reset mật khẩu. Công cụ mới có manifest/hash riêng, CLI reset rộng cũ vẫn bị chặn. [Bằng chứng](docs/DATABASE_REINITIALIZATION_20261104.md).

[Quyết định](docs/DECISIONS.md) · [Ranh giới kỹ thuật](docs/ARCHITECTURE.md) · [Bảo vệ HTTP/bot](docs/PUBLIC_SECURITY.md) · [Backlog](docs/PROJECT_STATUS.md).

## Bàn giao dữ liệu riêng

| Gói | Nơi lưu / cách bàn giao |
|---|---|
| Mã, migration, fixture, docs đã lược | Git sau kiểm tra diff và guard |
| Nguồn thiết kế/đào tạo chưa công bố | Kho nội bộ phân quyền |
| Backup, đối soát, hồ sơ, ảnh QA thật | Kho mã hóa, người phụ trách và thời hạn lưu rõ; không dùng Actions artifact/Releases |
| Secret | Kho quản lý secret riêng; không gộp cùng zip dữ liệu |

Bản nội bộ đã tách khỏi Git trên máy tác giả không đồng nghĩa đã có kho chia sẻ an toàn. Backup/checksum không chứng minh khả năng phục hồi; phải thử restore ở môi trường được phép. Xem [vận hành](docs/FREE_TIER_OPERATIONS.md).

## Kiểm tra trước khi chia sẻ

```sh
npm run check:repo
node scripts/check-repository.cjs --staged
```

Guard kiểm đường dẫn, mẫu secret/credential/JWT và liên kết Markdown tương đối; chế độ staged đọc index. Output chỉ file/dòng/loại lỗi. Review diff vẫn bắt buộc vì guard không nhận ra mọi mật khẩu/PII; không mở allowlist rộng cho tests.

Việc lược dữ liệu khỏi bản hiện tại không xóa lịch sử Git, clone, fork hoặc CI artifact. Không coi kết quả quét local là chứng nhận toàn hệ thống an toàn; xử lý lịch sử cần phạm vi được duyệt riêng.

## Khi phát hiện lộ secret hoặc dữ liệu

1. Báo riêng chủ hệ thống; không mở issue công khai kèm giá trị hoặc ảnh.
2. Xác định phạm vi. Với secret thật, thu hồi/rotate ở nhà cung cấp và cập nhật môi trường được phép; xóa commit không làm secret hết hiệu lực.
3. Giữ bằng chứng tối thiểu đúng quyền, loại khỏi bản mới; xử lý history/cache/artifact theo kế hoạch, không tự force-push hoặc xóa repo.
4. Kiểm phiên/key cũ và deployment; ghi biên bản nội bộ, chỉ đưa tổng kết đã lược vào Git.
