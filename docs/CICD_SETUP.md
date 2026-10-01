# CI và workflow phát hành

Cấu hình trong repo ngày **01/10/2026**, chưa push/chạy GitHub Actions trong đợt này. Hướng dẫn cũ về đưa secret thật vào CI và CI tự chặn Vercel đã được thay thế.

## Pipeline hiện có trong mã

`.github/workflows/ci.yml` chạy khi push `main`/`dev`, PR vào `main`/`dev`, hoặc được gọi thủ công. Hai job:

| Job | Môi trường | Kiểm tra |
|---|---|---|
| `Quality (Node 24)` | Ubuntu, Node theo `.nvmrc` | Repo guard/liên kết Markdown → cài lockfile → test guard → database/API regressions → TypeScript → lint → build với placeholder |
| `PostgreSQL 17 (Windows, Node 24)` | Windows, Node theo `.nvmrc` | PostgreSQL native: transaction đồng thời, migration chain và phục hồi trên database tách biệt |

Ca PostgreSQL native trong bộ test bị skip trên Linux theo code; job Windows tránh việc báo xanh nhưng thiếu ca này. CI không chạy browser QA/Storage thật, không đủ để nghiệm thu production. Lint giữ ngưỡng hiện hữu tối đa 30 warnings; warnings cần giảm dần, không tăng ngưỡng để che lỗi.

## Ranh giới bảo mật

- `permissions: contents: read`; checkout không giữ credential cho các bước tiếp theo.
- Checkout/setup-node được khóa bằng SHA đã đối chiếu tag upstream; khi nâng cần kiểm tra nguồn và cập nhật có review.
- Không tham chiếu GitHub secrets, không nạp `.env` của tác giả, không có job deploy/migration/gửi thư.
- Build chỉ dùng Supabase localhost/placeholder; các cờ tư vấn/gửi thư tắt. Không cài production key vào GitHub chỉ để build.
- Không dùng `pull_request_target` để chạy code từ PR; không upload backup, `.env`, scratch hoặc dữ liệu thật làm artifact.
- Guard là lớp chặn bổ sung, không thay review code/PII. Workflow sửa được trong PR nên quy tắc review của chủ repo vẫn cần thiết.

Quy tắc quyền tối thiểu và khóa SHA dựa trên [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use). Node 24 là dòng LTS được chọn cho repo; Node 20 đã hết vòng hỗ trợ theo [Node release schedule](https://github.com/nodejs/Release). Không có thay đổi dashboard runtime trong đợt này.

## Chủ repo cần cấu hình một lần

1. Sau khi đưa workflow lên nhánh/PR được phép, chờ **cả hai job** chạy thành công; đối chiếu log và những ca skipped. Tên status check chính xác chọn từ lần chạy thực trong GitHub, không chọn tên workflow cũ theo trí nhớ.
2. Tạo ruleset/branch protection cho `main` (và `dev` nếu nhóm dùng): yêu cầu PR, reviewer, status checks của hai job, xử lý conversation; giới hạn bypass/push trực tiếp theo vai trò nhóm.
3. Chỉ định reviewer phụ trách database/quyền và nội dung đào tạo. Nếu dùng CODEOWNERS, điền tài khoản/team thật của nhóm; repo chưa tự đoán người sở hữu.
4. Actions settings: quyền token mặc định đọc, giới hạn actions theo chính sách nhóm. Kiểm tra secret đang có bằng **tên/phạm vi**, không đưa giá trị vào log; không tự xóa secret chưa biết mục đích.
5. Kiểm tra Vercel Git integration/Production Branch và Node 24.x. Preview dùng Supabase thử riêng, không dùng service key production.
6. CI GitHub và deploy Vercel có thể được kích hoạt độc lập. Ruleset bảo vệ merge; nó không bảo đảm một deployment đã được kích hoạt sẽ chờ CI. Nếu cần gate phát hành, cấu hình Deployment Checks/phương thức phát hành phù hợp và kiểm thử hành vi thực. [Vercel Git](https://vercel.com/docs/git/vercel-for-github), [Deployment Checks](https://vercel.com/docs/deployment-checks).
7. Trước merge vào nhánh tự deploy, đối chiếu schema và quyền phát hành theo [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md). Thay đổi runtime trong `engines` có thể ảnh hưởng deployment kế tiếp, nên phải kiểm thử Preview trước.

## Chạy tương đương tại máy

```sh
npm ci
npm ci --prefix database/tests
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint
npm run build
```

Dùng project thử hoặc terminal được cấu hình biến giả khi build. Trên Windows có thể chạy riêng native test: `node --test database/tests/postgres-concurrency.test.cjs`. Không đặt production URL/key để làm một bước build hết lỗi.

## Bàn giao một release

PR cần nêu commit/phạm vi, test thực đã chạy, migration thiếu, tác động runtime/cờ tính năng và rollback tương thích. Sau khi được phép phát hành, ghi ngày, deployment, registry thực, smoke test và phần còn chờ vào PROJECT_STATUS. Log chi tiết nhạy cảm lưu nội bộ; không đính vào changelog.
