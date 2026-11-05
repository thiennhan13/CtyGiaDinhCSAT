# CSAT Portal

[![CI](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/workflows/ci.yml/badge.svg)](https://github.com/thiennhan13/CtyGiaDinhCSAT/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/thiennhan13/CtyGiaDinhCSAT)](https://github.com/thiennhan13/CtyGiaDinhCSAT/releases)

Repository chính thức để phát triển, bảo trì và phát hành website **CSAT Tutor** cùng cổng quản lý học tập của nhóm gia sư CSAT.

**Website:** [portal.csatoj.vn](https://portal.csatoj.vn/) · **Phiên bản và gói nguồn:** [GitHub Releases](https://github.com/thiennhan13/CtyGiaDinhCSAT/releases) · **Node.js:** 24.x

## Chức năng

| Khu vực | Nội dung |
|---|---|
| Website công khai | Giới thiệu, chương trình A/B/C/E/K, đội ngũ, thành tích, bài viết, Tự học và đăng ký/tư vấn |
| Phụ huynh | Google, liên kết một số điện thoại/một học sinh, nhận xét và lộ trình công bố, buổi học, kết quả CSATOJ, gia sư và học phí |
| Gia sư | Lớp phụ trách, buổi học, điểm danh, giáo án, nhận xét, hồ sơ và ghi nhận thu theo quyền |
| Quản trị | Học sinh/phụ huynh, gia sư, lớp, liên kết CSATOJ, chương trình, tiếp nhận đơn và chốt sổ có audit |

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase và Vercel. Giữ Archivo và phong cách neobrutalism của CSAT. Website công khai và dữ liệu nghiệp vụ có ranh giới quyền riêng.

## Chạy tại máy

```sh
node --version
npm ci
node scripts/preview-public-site.cjs
```

Dùng Node.js 24 theo [.nvmrc](.nvmrc). Bản xem tại [127.0.0.1:3100](http://127.0.0.1:3100) dùng dữ liệu giả, không cần database thật. Phát triển Portal theo [.env.example](.env.example) và [hướng dẫn cấu hình](docs/SETUP_VERCEL_SUPABASE.md), với Supabase thử riêng. Không dùng secret hoặc dữ liệu production trong fixture/CI.

## Tài liệu và trạng thái

- [Bắt đầu đóng góp](CONTRIBUTING.md), [bàn giao](docs/HANDOFF.md), [quyết định](docs/DECISIONS.md).
- [Kiến trúc và bản đồ website](docs/ARCHITECTURE.md), [danh mục tài liệu](docs/README.md).
- [Tiến độ thực tế và việc còn chờ](docs/PROJECT_STATUS.md): phân biệt mã nguồn, CI và nghiệm thu production.
- [Release và đóng gói](docs/RELEASES.md), [CI/CD](docs/CICD_SETUP.md), [database/migration](database/README.md).
- [SEO/Search Console](docs/PUBLIC_SEO.md), [bảo mật](SECURITY.md).

Google/claim, grants CSATOJ, hồ sơ gia sư và ledger đã có trong mã. Nghiệm thu OJ/activity thật, dữ liệu sau khởi tạo lại và pilot lớp/học phí vẫn theo PROJECT_STATUS. Release mã nguồn không tự xác nhận các tích hợp production đã nghiệm thu. Email báo cáo và thanh toán ngân hàng chưa thuộc phạm vi.

## Kiểm tra chất lượng

```sh
npm ci --prefix database/tests
npm run check:repo
npm run test:repo
npm run test:db
npm run typecheck
npm run lint:strict
npm run build
```

Local dùng Edge, CI dùng Chromium; PostgreSQL native kiểm concurrency trên Windows. UI/quyền có fixture riêng trong CI. Không chạy lại migration hoặc reset dữ liệu khi chỉ cập nhật ứng dụng.

## Quyền sử dụng và liên hệ

Mã nguồn được công khai để minh bạch và phối hợp bảo trì. **Quyền sử dụng, chỉnh sửa và triển khai chỉ cấp cho thành viên được ủy quyền trong nhóm gia sư CSAT**, theo [LICENSE.md](LICENSE.md); không phát hành theo giấy phép mã nguồn mở. Các quyền xem/fork theo điều khoản GitHub và giấy phép của thành phần bên thứ ba được giữ nguyên.

- Trung tâm: [contact@csatoj.vn](mailto:contact@csatoj.vn), [csattutor@gmail.com](mailto:csattutor@gmail.com).
- Bảo trì mã nguồn và yêu cầu sử dụng: [phantranthiennhan1310@gmail.com](mailto:phantranthiennhan1310@gmail.com).
- Báo lỗi bảo mật qua kênh riêng trong [SECURITY.md](SECURITY.md); không đăng hồ sơ học sinh/phụ huynh, token hoặc mật khẩu trong Issues.
