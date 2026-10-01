# Workflow phát triển cùng Codex

## Onboarding

1. Chủ repo cấp quyền tối thiểu cần thiết cho GitHub. Thành viên đọc README → PROJECT_STATUS → ARCHITECTURE → AGENTS → SECURITY.
2. Cài Node 24.x, Git; chạy `npm ci` và `npm ci --prefix database/tests`. Dùng lockfile đã có, không tự nâng toàn bộ dependency.
3. Dùng project Supabase thử riêng hoặc fixture localhost. Mẫu `.env.example` không chứa khóa thật. Không ghi đè `.env.local` có sẵn; không đưa giá trị secret vào prompt.
4. Database thử: xem [database/README.md](database/README.md). Người chỉ sửa nội dung/trang công khai có thể chạy `node scripts/preview-public-site.cjs` mà không cần DB thật.
5. Thống nhất phạm vi nhiệm vụ, dữ liệu được phép và tiêu chí nghiệm thu. Đừng cấp tài khoản production cho Codex chỉ để đọc mã.

## Một vòng công việc

1. Kiểm tra working tree; tạo nhánh `codex/<muc-tieu>` nếu chưa có nhánh phù hợp. Giữ nguyên thay đổi người khác.
2. Nhờ Codex khám phá luồng liên quan và nêu hiện trạng/giả định, rồi triển khai phạm vi đã duyệt. Có thể dùng prompt mẫu dưới đây.
3. Sửa nhỏ theo nghiệp vụ; API/RPC cùng kiểm tra quyền; migration mới giữ lịch sử. Nếu cần dữ liệu thật, người quản trị cung cấp thông tin tối thiểu qua kênh nội bộ.
4. Chạy kiểm thử thích hợp và bộ kiểm tra PR. UI phải kiểm tra mobile, keyboard và trạng thái thiếu/lỗi; avatar phải nghiệm thu Storage thử thật trước production.
5. Cập nhật tài liệu tiến độ/kiến trúc/setup nếu có thay đổi. Chỉ ghi kết quả thực, phân biệt test/staging/production.
6. Chọn **từng tệp** để stage; tránh `git add .`. Chạy `node scripts/check-repository.cjs --staged`, xem `git diff --cached --stat`, rồi đọc diff tại máy riêng. Không paste diff có PII/secret vào chat.
7. Tạo PR với vấn đề, hành vi mới, test và kế hoạch rollout; dùng mẫu có sẵn. Chủ repo/reviewer duyệt migration, quyền và nội dung đào tạo liên quan.
8. Merge/push có thể kích hoạt Vercel. Việc đó cần phù hợp quyền phát hành và trạng thái schema; CI không tự chạy migration và không tự chặn Vercel nếu chưa cấu hình.

## Prompt bàn giao cho Codex

```text
Đọc AGENTS.md, README.md và các tài liệu hiện hành liên quan.
Nhiệm vụ: [mục tiêu cụ thể]. Tiêu chí hoàn thành: [hành vi quan sát được].
Trước khi sửa, đối chiếu mã/API/RPC/test và working tree; không coi tài liệu cũ là trạng thái production hiện tại.
Dùng fixture hoặc Supabase thử. Không gửi thư thật, ghi production hoặc deploy khi chưa được cho phép trong nhiệm vụ này.
Hoàn thành mã, kiểm thử phù hợp, cập nhật trạng thái và bàn giao phần còn thiếu.
```

Không sao chép `.agents/`, token Codex, cookie trình duyệt hoặc `.env` giữa các thành viên qua Git. Mỗi thành viên tự thiết lập công cụ; skill riêng là tùy chọn, không thay AGENTS và không cấp quyền production.

## Kiểm tra PR

```sh
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint
npm run build
```

- `check:repo`: kiểm tra đường dẫn nội bộ, mẫu secret và liên kết Markdown tương đối; không phải chứng nhận không còn mọi PII/secret.
- `test:repo`: kiểm tra guard phát hiện dữ liệu bị cấm và index staged.
- `test:db`: PGlite/API regressions và PostgreSQL native. Ca native chỉ chạy Windows; Ubuntu sẽ skip, nên CI có job Windows riêng.
- Build phải có biến Supabase thử/placeholder. Không đổi `.env` production để chạy test; ưu tiên terminal có biến môi trường giả hoặc CI.
- Runner UI ở `scripts/` cần Playwright/Chromium, một số còn dùng vị trí runtime Codex trên Windows; xem ARCHITECTURE. Không tuyên bố browser QA đạt nếu thiếu công cụ.

Tài liệu thuần túy không cần test nghiệp vụ mới; thay workflow/guard cần kiểm tra chính guard và các lệnh workflow có thay đổi.

## Phát hành và xử lý lỗi

[Checklist Vercel–Supabase](docs/SETUP_VERCEL_SUPABASE.md) là đầu mối: đúng môi trường → backup/restore thử → áp dụng phần schema thiếu sau cho phép → verification → deploy với email tắt → smoke test → bật từng luồng được phép.

Nếu lỗi: dừng gửi, giữ hàng đợi/lịch sử, quay lại phiên bản ứng dụng tương thích khi được phép. Migration đã ghi dữ liệu mới cần sửa bù; không restore đè hoặc xóa lịch sử để chữa lỗi.
