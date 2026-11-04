# CSAT Portal

Website giới thiệu, tuyển sinh và quản lý việc học của CSAT: lớp học, buổi học, nhận xét, giáo án và học phí.

**Website:** [portal.csatoj.vn](https://portal.csatoj.vn) · **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Vercel · **Runtime:** Node.js 24.

## Hiện trạng và hướng phát triển

Website công khai, thư viện chuyên đề phụ huynh, tiếp nhận đăng ký/tư vấn và CAPTCHA đăng nhập đã phát hành. Đăng ký và tư vấn lưu chung, email thông báo chưa bật. Giao diện website hiện vẫn là tra cứu phone, nhưng migration30 đã thu hồi lookup DB cũ ngày03/11; cần deploy mã Google tương thích để phụ huynh dùng lại. Gia sư/admin giữ Supabase Auth.

Ưu tiên đã chốt: chuẩn bị Supabase thử/khả năng phục hồi; chuẩn hóa liên hệ phụ huynh; Google + nhập số khớp để tự liên kết; nối học sinh CSATOJ bằng mã admin và hoàn thiện Portal phụ huynh; chuẩn hóa lớp/điểm danh/học phí, quyền gia sư ghi nhận thu. Mã local đã có Google/grants, certificates và gia sư thu toàn bộ dư nợ; schema19/21/22/29–32 đã áp Supabase hiện tại03/11, ứng dụng chưa deploy. Lookup DB cũ đã bị thu hồi, cần mã mới tương thích. [Runbook](docs/PORTAL_GOOGLE_GRANTS_ROLLOUT.md). [Bản đồ dữ liệu và chuyển đổi](docs/PARENT_IDENTITY_DATABASE_DESIGN.md). Email, hồ sơ/avatar và giáo trình E/K/PreVOI là backlog riêng; trạng thái môi trường/bằng chứng ở [PROJECT_STATUS](docs/PROJECT_STATUS.md).

## Phạm vi chức năng

Giới hạn đích mới: một phụ huynh – một số điện thoại – một học sinh; Google khác dùng số đã liên kết phải báo lỗi. Theo quyết định03/11, giữ lớp và hồ sơ hiện có, chỉ làm sạch chốt sổ/điểm danh/dữ liệu phát sinh sau sao lưu về máy; kế hoạch xóa rộng đã hủy. Hồ sơ gia sư cần thành tích/chứng chỉ nhiều mục, trường đại học và giới thiệu; chứng chỉ đã có ở migration31. Reset giữ cả lớp/cấu hình/thành viên/đơn giá, học sinh/phụ huynh/liên kết, Auth/tutors/hồ sơ/Storage/intake/dữ liệu nền trên Supabase hiện tại; chi tiết thiết kế trước triển khai ở [thiết kế database](docs/PARENT_IDENTITY_DATABASE_DESIGN.md).

| Phần | Chức năng |
|---|---|
| Công khai | Giới thiệu, A/B/C/E/K, đăng ký học, đội ngũ, thành tích, bài viết và học liệu |
| Admin | Học sinh, gia sư, lớp, tiếp nhận đơn, chương trình, học phí và chốt sổ có audit |
| Gia sư | Buổi học, điểm danh, giáo án, nhận xét tháng, hồ sơ và lương |
| Phụ huynh | Nội dung đã công bố, chặng học, 43 chủ đề/54 bài riêng tư, gia sư và học phí |

Quyết định sản phẩm và giới hạn phạm vi ở [DECISIONS](docs/DECISIONS.md). Website dùng **neobrutalism / playful edtech**, giữ Archivo và nhận diện CSAT; Portal ưu tiên dữ liệu và khả năng đọc theo [design system](docs/PUBLIC_UI_DESIGN_SYSTEM.md).

## Bắt đầu phát triển

Đọc [HANDOFF](docs/HANDOFF.md), [AGENTS](AGENTS.md), [SECURITY](SECURITY.md); kiểm tra working tree trước khi sửa. Hướng dẫn đóng góp và phát hành ở [CONTRIBUTING](CONTRIBUTING.md).

```sh
node --version
npm ci
node scripts/preview-public-site.cjs
```

Dùng Node.js **24.x** theo `.nvmrc` và `engines`. Preview công khai tại [127.0.0.1:3100](http://127.0.0.1:3100) dùng dữ liệu giả, không cần database thật. Với Portal, dùng Supabase thử riêng và mẫu `.env.example`; không đưa secret production vào test. Cài `npm ci --prefix database/tests` khi cần bộ kiểm thử database.

## Cấu trúc

```text
app/          Route, layout, API theo vai trò
components/   UI dùng chung và website công khai
features/     Module nghiệp vụ
lib/          Hợp đồng dữ liệu, quyền, catalog và tích hợp
content/      Nội dung chuyên đề Markdown
database/     Migration, verification và kiểm thử database/API
scripts/      Guard, preview, kiểm thử và vận hành
docs/         Quyết định, kiến trúc, workflow và trạng thái
```

[ARCHITECTURE](docs/ARCHITECTURE.md) chỉ rõ ranh giới hệ thống; [danh mục tài liệu](docs/README.md) chỉ rõ nơi sửa từng nghiệp vụ. Prototype, ảnh gốc, backup và báo cáo chứa dữ liệu thật nằm ngoài Git/runtime.

## Kiểm thử

```sh
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint:strict
npm run build
```

Chọn kiểm thử theo thay đổi; chạy bộ đầy đủ trước PR thay đổi mã. Tài liệu thuần túy kiểm tra diff, liên kết và repo guard. UI cần QA trình duyệt; local dùng Edge, CI dùng Chromium. Ghi rõ bước chưa chạy. CI xanh không xác nhận nghiệm thu production và không tự cấp quyền push/deploy.

Giữ nháp/công bố, revision, snapshot và lịch sử tài chính. Không chạy lại master schema hoặc migration đã áp dụng. Quy trình database ở [database/README](database/README.md), cấu hình và phát hành ở [SETUP_VERCEL_SUPABASE](docs/SETUP_VERCEL_SUPABASE.md).
