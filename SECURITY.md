# An toàn mã nguồn và tài liệu nội bộ

## Được đưa vào GitHub

Mã ứng dụng; migration/SQL không chứa dữ liệu thật; fixture giả; lockfile; nội dung đào tạo đã được trung tâm duyệt để đưa vào website; tài liệu kỹ thuật đã lược thông tin cá nhân; kết quả test tổng hợp có ngày/phạm vi. Giữ các fixture/schema lịch sử phục vụ hồi quy.

## Không đưa vào GitHub, PR, CI artifact hoặc prompt

- `.env*` (trừ `.env.example` chỉ có placeholder), service role, DATABASE_URL chứa mật khẩu, Resend/API keys, cron/hash secrets, JWT/cookie/session, private keys.
- Dump/backup/restore, JSON/CSV/Excel export học sinh–phụ huynh–gia sư, danh sách liên hệ, học phí/chứng từ, hồ sơ hoặc audit chứa dữ liệu thật.
- Prototype trong `docs/prototypes/`, Excel nguồn và sổ tay nội bộ chưa được phép công bố, screenshot thật có người học/số điện thoại.
- `scratch/`, `internal/`, `docs/internal/`, `private-data/`, thư mục công cụ/agent/tài khoản local. Không commit `.agents/` hoặc cấu hình Codex để chia sẻ quyền truy cập.

Logo/ảnh website đã được phép có thể nằm trong `public/`. Avatar do gia sư upload nằm trong Storage; không sao chép vào repo. Nội dung nhạy cảm vẫn phải bảo vệ nếu repo đang private.

Video writing được chủ trung tâm chỉ định ngày 05/10/2026 có bản tối ưu `public/media/writing-960.webm`. Guard chỉ cho đúng đường dẫn, header, giới hạn 2 MB và checksum của bản đã kiểm tra; thay bytes hoặc thêm video khác vẫn cần review. Nguồn 4K trong `public/videos/` tiếp tục ngoài Git/gói Vercel. Chi tiết hành vi tại [website công khai](docs/PUBLIC_WEBSITE.md).

## Phân loại gói bàn giao riêng

| Gói | Nội dung | Cách chuyển cho nhóm |
|---|---|---|
| Mã nguồn | README/AGENTS, app, migration, fixture và workflow | GitHub sau kiểm tra diff/CI |
| Thiết kế/nguồn đào tạo | Prototype, Excel, sổ tay có quyền chia sẻ | Kho nội bộ phân quyền cho người cần đọc |
| Vận hành và đối soát | Biên bản đầy đủ, backup, dữ liệu trước/sau, ảnh QA thật | Kho mã hóa, giới hạn người phụ trách; thời hạn lưu/xóa theo quyết định trung tâm |
| Secret | Key/connection/password/token | Kho quản lý secret riêng; không gộp vào zip bàn giao |

Trong đợt 01/10 đã tạo thư mục `internal/20261001-handoff/` ngoài Git để giữ biên bản vận hành đầy đủ trước khi lược bản đưa lên GitHub. Backup thật tiếp tục ở vị trí nội bộ cũ, không nhân bản vào gói này. `.gitignore` chỉ ngăn commit vô ý, **không mã hóa và không kiểm soát người truy cập máy**. Chủ hệ thống cần đưa gói vào kho nội bộ được phân quyền; không dùng GitHub Releases/Actions artifacts làm kho nội bộ cho các tệp này.

Ngày 05/10, prototype còn ở `docs/prototypes/`, font/ảnh/SVG không dùng và biên bản duyệt HTML được chuyển vào `internal/repository-cleanup-20261005/`. Gói có snapshot tiến độ cũ và danh mục checksum để đối chiếu. Đây là kho local ngoài Git, chưa phải kho chia sẻ đã phân quyền; nhóm cần chuyển riêng theo bảng trên. Không xóa migration/fixture hoặc rewrite lịch sử Git trong đợt dọn này.

## Kiểm tra trước khi chia sẻ

```sh
npm run check:repo
node scripts/check-repository.cjs --staged
```

Guard kiểm tra đường dẫn bị cấm, private key/token có mẫu nhận diện, URL chứa credential, JWT và liên kết Markdown tương đối. Nó đọc index khi dùng `--staged`, không chỉ bản làm việc. Output chỉ gồm file/dòng/loại lỗi, không in secret. Guard không nhận ra mọi mật khẩu tùy ý hay mọi PII; người review vẫn phải đọc diff. Không tạo allowlist rộng cho cả `tests/` để lách kiểm tra.

Đợt rà soát 01/10 kiểm tra 308 tệp tracked và 822 blob trong 64 commit reachable của refs local; `main` remote khớp HEAD. Không phát hiện secret thật theo các mẫu đã quét; hai cảnh báo URL là chuỗi fixture, đã đối chiếu. Không thấy `.env`/dump/prototype/Excel trong danh sách đường dẫn lịch sử được quét. **Không bao phủ refs chưa fetch, fork, PR refs, reflog, GitHub Actions artifacts/logs hay bản sao đã tải xuống.** Không gọi đây là chứng nhận hệ thống không có lỗ hổng.

Một phần số liệu đối soát nội bộ từng nằm trong Markdown đã tracked. Bản làm việc đã lược, nhưng nội dung cũ vẫn có thể nằm trong lịch sử Git. Đây không phải bằng chứng có secret bị lộ. Nếu cần xóa lịch sử, chủ repo phải duyệt phạm vi và phối hợp mọi clone/fork; đợt này không rewrite/force-push.

## Nếu phát hiện secret hoặc dữ liệu thật đã lên Git

1. Báo riêng cho chủ hệ thống qua kênh nội bộ; không mở issue công khai kèm giá trị/ảnh.
2. Xác định phạm vi. Secret thật: thu hồi/rotate tại nhà cung cấp và cập nhật môi trường được phép; xóa commit không làm secret cũ hết hiệu lực.
3. Loại khỏi bản mới sau khi giữ bằng chứng tối thiểu đúng quyền. Xử lý lịch sử/caches/artifacts theo kế hoạch đã duyệt; không tự force-push hoặc xóa repository.
4. Kiểm tra phiên/key cũ, deployment và kênh chia sẻ liên quan; ghi biên bản nội bộ, chỉ để tổng kết đã lược trong Git.

## Các hạn chế đã biết cần xử lý bằng mã/quy trình

- Phụ huynh đang tra cứu bằng số điện thoại, không OTP/mật khẩu: biết số có thể mở dữ liệu đã liên kết. Rate limit không thay thế xác minh danh tính.
- Tạo tài khoản gia sư hiện dùng số điện thoại làm mật khẩu ban đầu; chưa có luồng mời/đổi mật khẩu bắt buộc đã được xác minh.
- Email còn MAIL-01/02; schema/hồ sơ chưa triển khai đủ tại lần kiểm tra cuối. Giữ gửi tắt đến khi nghiệm thu.

Xem [backlog](docs/PROJECT_STATUS.md). Không giấu các hành vi này bằng cách bỏ tài liệu; không tự thay đăng nhập, reset tài khoản hoặc phát thư mời trong đợt bàn giao.
