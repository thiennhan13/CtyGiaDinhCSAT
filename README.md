# CSAT Portal

CSAT Portal giúp trung tâm, gia sư và phụ huynh cùng theo dõi việc học của học sinh — từ lớp học, buổi học và nhận xét đến lộ trình và học phí.

**Website:** [portal.csatoj.vn](https://portal.csatoj.vn)

**Công nghệ:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Vercel

## Portal phục vụ ai?

- **Admin:** quản lý học sinh, gia sư, lớp học, học phí và chốt sổ.
- **Gia sư:** theo dõi lớp, điểm danh, cập nhật lộ trình, nhận xét tháng và hồ sơ cá nhân.
- **Phụ huynh:** xem nhận xét, nội dung học, định hướng phát triển, gia sư và học phí của con.

Website công khai giới thiệu CSAT, các chương trình học và tiếp nhận nhu cầu tư vấn. Chương trình **Cơ bản mặc định gồm A+B**, **Nâng cao gồm C+D**; nội dung chi tiết nằm trong [chương trình đào tạo](docs/CHUONG_TRINH_DAO_TAO.md).

Học liệu miễn phí ở `/hoc-lieu-mien-phi`, có hướng dẫn luyện tập và form chuẩn bị nhu cầu để nhắn trung tâm. Trang đội ngũ ở `/gia-su`; Góc học Tin ở `/bai-dang` có lưới và trang bài viết một ảnh. Nội dung hiện lấy từ mã frontend; hệ thống đăng bài sẽ được nối sau. Xem [hướng dẫn nội dung](docs/PUBLIC_POSTS.md) để biết nơi sửa và phạm vi hiện tại.

Catalog công khai dùng **5 lớp A/B/C/E/K**: A và B thuộc nền Cơ bản; C dùng C+D; E là Chủ lực, thi tuyển riêng từ C hướng HSG Tỉnh và tuyển sinh chuyên Tin; K học riêng với nội dung tùy chọn. Giao diện này được tích hợp trong Next.js; không chuyển đổi các lớp đang vận hành. Đội ngũ CSAT gồm các gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu. Xem [catalog](docs/PUBLIC_COURSE_CATALOG.md) và [hướng dẫn website công khai](docs/PUBLIC_WEBSITE.md).

## Tình trạng hiện tại

Phần quản lý cốt lõi đã được xây dựng và đưa vào sử dụng. Hệ thống **chưa hoàn tất toàn bộ việc triển khai và nghiệm thu**, nhất là xác thực phụ huynh, hồ sơ gia sư và email.

Đối chiếu Supabase chỉ đọc ngày **01/10/2026**:

| Hạng mục | Trạng thái |
|---|---|
| Quản lý lớp, điểm danh, học phí và chốt sổ | Đã có nền tảng nghiệp vụ, phân quyền và lịch sử thay đổi |
| Chương trình A+B / C+D | Migration 20 đã áp dụng; giữ riêng bản nháp và bản công bố |
| Cổng phụ huynh, hồ sơ và avatar gia sư | Đã có mã; production còn thiếu schema cho phí từng buổi và hồ sơ mở rộng, chưa có bucket avatar |
| Form tư vấn và email nhắc tháng | Đã có mã; chưa đủ schema/cấu hình để vận hành, email tháng đang tắt |
| CSATOJ | Chưa tích hợp API; số bài và ranking đang chờ kết nối |

Production còn thiếu migration **18, 19, 21, 22**. Hai việc bảo mật cần ưu tiên là xác minh người tra cứu phụ huynh và thay mật khẩu khởi tạo gia sư đang dùng số điện thoại. Xem [tiến độ và việc cần làm](docs/PROJECT_STATUS.md) để biết điều kiện hoàn tất từng phần.

## Bắt đầu phát triển

Chuẩn bị **Node.js 24.x**, npm, Git và một project Supabase thử riêng.

```sh
npm ci
npm ci --prefix database/tests
```

Sao chép `.env.example` thành `.env.local` nếu chưa có, rồi điền cấu hình môi trường thử. Làm theo [hướng dẫn database](database/README.md) để khởi tạo schema phù hợp.

```sh
npm run dev
```

Mở [localhost:3000](http://localhost:3000). Nếu chỉ sửa trang giới thiệu, chạy `node scripts/preview-public-site.cjs` và mở [127.0.0.1:3100](http://127.0.0.1:3100); chế độ này dùng cấu hình giả, không cần kết nối database thật.

## Cấu trúc dự án

```text
app/          Trang, layout và API theo vai trò
components/   Thành phần giao diện
features/     Các module quản lý theo nghiệp vụ
lib/          Xác thực, validation, dữ liệu học tập và tích hợp
database/     Migration, SQL kiểm chứng và kiểm thử database/API
scripts/      Công cụ kiểm tra, preview và vận hành
types/        Kiểu dữ liệu dùng trong ứng dụng
docs/         Tài liệu nghiệp vụ, kỹ thuật và triển khai
.github/      CI và mẫu pull request
```

Đọc [kiến trúc hệ thống](docs/ARCHITECTURE.md) để hiểu luồng dữ liệu, quyền truy cập và trách nhiệm của từng phần.

## Kiểm thử và đóng góp

```sh
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint
npm run build
```

Dùng cấu hình thử khi build. Bộ kiểm thử PostgreSQL native chạy trên Windows; CI có job riêng cho phần này. Quy trình làm việc và gửi PR nằm trong [CONTRIBUTING.md](CONTRIBUTING.md); hướng dẫn cho Codex nằm trong [AGENTS.md](AGENTS.md).

## Hướng phát triển

Ưu tiên tăng cường xác thực, đồng bộ database với ứng dụng và nghiệm thu cổng phụ huynh. Tiếp theo là hoàn thiện email tư vấn, nhắc nhận xét tháng; tích hợp CSATOJ khi có API. HSGQG là hướng mở rộng cần duyệt nội dung, chưa phải giáo trình chính thức.

Mọi thay đổi cần giữ lịch sử học tập và tài chính. Admin chốt sổ thủ công; cron chỉ nhắc việc, không tự công bố nhận xét hoặc chốt sổ.

## Tài liệu liên quan

- [Cài đặt Vercel và Supabase](docs/SETUP_VERCEL_SUPABASE.md) · [CI và phát hành](docs/CICD_SETUP.md)
- [Bảo mật và tài liệu nội bộ](SECURITY.md) — quy định về secret, dữ liệu thật, prototype và tệp nguồn ngoài Git.
- [Danh mục tài liệu](docs/README.md) — tra cứu hướng dẫn chuyên sâu và các mốc lịch sử.
