# CI và workflow phát hành

Tài liệu mô tả pipeline trong mã, không xác nhận GitHub Actions/deployment đang xanh. Trạng thái và bằng chứng hosted xem [PROJECT_STATUS](PROJECT_STATUS.md).

## Pipeline hiện có trong mã

`.github/workflows/ci.yml` chạy khi push `main`/`dev`, PR vào `main`/`dev`, hoặc được gọi thủ công. Hai job:

| Job | Môi trường | Kiểm tra |
|---|---|---|
| `Quality (Node 24)` | Ubuntu, Node theo `.nvmrc` | Repo guard/liên kết Markdown → cài lockfile → test guard → database/API regressions → TypeScript → lint strict → build với placeholder → Chromium smoke public |
| `PostgreSQL 17 (Windows, Node 24)` | Windows, Node theo `.nvmrc` | PostgreSQL native: transaction đồng thời, migration chain và phục hồi trên database tách biệt |

Ca PostgreSQL native trong bộ test bị skip trên Linux theo code; job Windows tránh việc báo xanh nhưng thiếu ca này. CI chạy smoke browser với Playwright khóa version trong lockfile và Chromium cài trong job: trang public ở 375/1440 px, no-JS, điều hướng/bàn phím, selector và giáo trình. Đây chưa phải toàn bộ QA responsive/motion/Storage thật. Lint CI dùng `lint:strict`, không cho warnings.

Preview browser chỉ lắng nghe loopback, dùng cùng bản build placeholder và dừng khi bước kết thúc. Runner chặn mạng ngoài và request ghi; `PUBLIC_QA_FILTER` chọn nhóm kiểm tra, không chọn được ca nào thì thất bại. Không upload ảnh/chụp dữ liệu thật làm artifact. Chạy đầy đủ bộ public ở local trước thay đổi giao diện lớn; smoke CI không thay nghiệm thu production.

## Ranh giới bảo mật

- `permissions: contents: read`; checkout không giữ credential cho các bước tiếp theo.
- Checkout/setup-node được khóa bằng SHA đã đối chiếu tag upstream; khi nâng cần kiểm tra nguồn và cập nhật có review.
- Không tham chiếu GitHub secrets, không nạp `.env` của tác giả, không có job deploy/migration/gửi thư.
- Build chỉ dùng Supabase localhost/placeholder; các cờ tư vấn/gửi thư tắt. Không cài production key vào GitHub chỉ để build.
- Không dùng `pull_request_target` để chạy code từ PR; không upload backup, `.env`, scratch hoặc dữ liệu thật làm artifact.
- Guard là lớp chặn bổ sung, không thay review code/PII. Workflow sửa được trong PR nên quy tắc review của chủ repo vẫn cần thiết.

Quy tắc quyền tối thiểu và khóa SHA dựa trên [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use). Chủ trung tâm đã chọn **Node.js 24 cho local, CI và deploy**, khớp `.nvmrc`/engines. Kiểm chứng runtime deployment riêng; bằng chứng QA cũ trên Node 26 không thay kiểm tra Node 24.

## Chủ repo cần cấu hình một lần

1. Sau khi đưa workflow lên nhánh/PR được phép, chờ **cả hai job** chạy thành công; đối chiếu log và những ca skipped. Tên status check chính xác chọn từ lần chạy thực trong GitHub, không chọn tên workflow cũ theo trí nhớ.
2. Tạo ruleset/branch protection cho `main` (và `dev` nếu nhóm dùng): yêu cầu PR, reviewer, status checks của hai job, xử lý conversation; giới hạn bypass/push trực tiếp theo vai trò nhóm.
3. Chỉ định reviewer phụ trách database/quyền và nội dung đào tạo. Nếu dùng CODEOWNERS, điền tài khoản/team thật của nhóm; repo chưa tự đoán người sở hữu.
4. Actions settings: quyền token mặc định đọc, giới hạn actions theo chính sách nhóm. Kiểm tra secret đang có bằng **tên/phạm vi**, không đưa giá trị vào log; không tự xóa secret chưa biết mục đích.
5. Kiểm tra Vercel Git integration/Production Branch và runtime đã thống nhất. Preview dùng Supabase thử riêng, không dùng service key production.
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
npm run lint:strict
npm run build
```

Local dùng Microsoft Edge có sẵn: khởi động bản build placeholder ở loopback rồi chạy `npm run test:public` (mặc định `msedge`). Theo quyết định chủ trung tâm, không cài Chromium riêng trên máy local. CI tự cài Chromium trên runner và đặt `CSAT_BROWSER_CHANNEL=chromium`. Có thể truyền `PLAYWRIGHT_MODULE` khi cần một runtime riêng, nhưng dependency chuẩn đã có trong repo.

Dùng project thử hoặc terminal được cấu hình biến giả khi build. Trên Windows có thể chạy riêng native test: `node --test database/tests/postgres-concurrency.test.cjs`. Không đặt production URL/key để làm một bước build hết lỗi.

## Bàn giao một release

PR cần nêu commit/phạm vi, test thực đã chạy, migration thiếu, tác động runtime/cờ tính năng và rollback tương thích. Sau khi được phép phát hành, ghi ngày, deployment, registry thực, smoke test và phần còn chờ vào PROJECT_STATUS. Log chi tiết nhạy cảm lưu nội bộ; không đính vào changelog.
