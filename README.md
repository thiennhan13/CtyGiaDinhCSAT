# CSAT Portal

CSAT xây dựng website giới thiệu, tuyển sinh và Portal theo dõi việc học — từ lớp, buổi học và nhận xét đến lộ trình/học phí.

**Website:** [portal.csatoj.vn](https://portal.csatoj.vn)

**Công nghệ:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Vercel.

## Định hướng hiện tại

Hoàn thiện frontend theo chỉ dẫn của chủ trung tâm. Website công khai dùng **neobrutalism và playful edtech**, kết hợp typography/editorial, thẻ màu, sơ đồ mạch và art tin học; giữ Archivo, logo và palette đã duyệt. Backend/API/logic vận hành hoàn thiện riêng theo hợp đồng và quyền. Xem [quy định thiết kế](docs/PUBLIC_UI_DESIGN_SYSTEM.md).

Catalog công khai có **A/B/C/E/K**: A nhập môn, B thi đấu cơ bản, C nâng cao, E CHỦ LỰC chọn lọc từ C qua thi riêng, K kèm riêng/tùy chọn. C là tên chung cho toàn bộ C/D và các lớp nâng cao tương lai; giữ A9/B15/C19, mã C01–D07/scope CD. Quản lý hiện hành vẫn mặc định Cơ bản A+B, Nâng cao C+D; không tự chuyển lớp cũ.

## Chức năng

| Phần | Vai trò |
|---|---|
| Website | Giới thiệu, tìm hiểu/chi tiết lộ trình, đăng ký học, đội ngũ, bài đăng, học liệu, thành tích, liên lạc |
| Admin | Quản lý học sinh/gia sư/lớp, học phí và chốt sổ có audit |
| Gia sư | Buổi học, điểm danh, lộ trình, nhận xét tháng và hồ sơ |
| Phụ huynh | Nội dung đã công bố, định hướng, gia sư và học phí của con |

Form public chỉ kiểm tra → xem lại → sao chép → chủ động nhắn CSAT; chưa nối API/lưu đăng ký hoặc gửi tài liệu. Khóa quan tâm mặc định theo trang lớp.

Thành tích dùng bố cục 3 nhãn cạnh ảnh đã duyệt, dữ liệu riêng và HTML tĩnh/WebP responsive. Bài viết cũng lấy catalog frontend, chưa có quản trị database. Không dựng số liệu hoặc cam kết đầu ra chưa có nguồn.

Mã và local QA đã có, hệ thống chưa nghiệm thu toàn bộ production: xác thực phụ huynh, mật khẩu khởi tạo gia sư, schema/Storage và email còn việc cần làm. API CSATOJ chưa tích hợp. Trạng thái, bằng chứng và backlog chỉ duy trì tại [PROJECT_STATUS](docs/PROJECT_STATUS.md).

## Tiếp nhận và chạy local

Đọc [HANDOFF](docs/HANDOFF.md), README/AGENTS/SECURITY và tài liệu nghiệp vụ liên quan; chọn [frontend](docs/FRONTEND_WORKFLOW.md) hoặc [backend](docs/BACKEND_WORKFLOW.md). Kiểm tra Git status/diff, giữ công việc có sẵn.

Dùng **Node.js 24** cho local, CI và deploy theo .nvmrc/engines. Kiểm tra phiên bản thực trước khi chạy; kết quả local không xác nhận runtime của deployment.

```sh
node --version
npm ci
npm ci --prefix database/tests
node scripts/preview-public-site.cjs
```

Preview công khai tại [127.0.0.1:3100](http://127.0.0.1:3100) dùng cấu hình giả/email tắt, không cần DB thật. Cài database test chỉ khi cần kiểm thử nghiệp vụ. Với portal dùng project Supabase thử riêng và .env.example làm mẫu, không đưa secret ra output. [Database README](database/README.md) hướng dẫn khởi tạo đúng baseline/migration.

## Cấu trúc

```text
app/          Route/layout/API theo vai trò
components/   UI; marketing cho website công khai
features/     Module nghiệp vụ quản lý
lib/          Contract, Auth, validation, catalog/nội dung và tích hợp
database/     Migration, verification, database/API tests
scripts/      Guard, preview, QA và vận hành có phạm vi
types/        Kiểu ứng dụng
docs/         Quyết định, chức năng, workflow và trạng thái
.github/      CI và mẫu PR
```

[ARCHITECTURE](docs/ARCHITECTURE.md) giải thích luồng/quyền; [danh mục docs](docs/README.md) chỉ rõ nguồn chuẩn. Prototype/media gốc/ảnh QA/backup và dữ liệu thật ở kho nội bộ, không là dependency runtime.

## Kiểm thử và phát hành

```sh
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint:strict
npm run build
```

Chạy theo phạm vi thay đổi; đầy đủ trước PR theo [CONTRIBUTING](CONTRIBUTING.md). UI cần browser QA, ảnh upload cần thử Supabase Storage thật trên project thử. Ghi rõ chưa chạy/skipped; test local không thay staging/production.

Giữ nháp/công bố, revision, snapshot và lịch sử. Admin chốt sổ thủ công, cron chỉ nhắc việc; không tự công bố, tính lại học phí cũ bằng giá mới hoặc suy thành thạo từ ranking. Không tự push/merge/deploy khi test xanh. [SECURITY](SECURITY.md) quy định Git-safe và dữ liệu nội bộ.
