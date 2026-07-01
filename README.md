# 🎓 CSAT Tutor Portal - Hệ Thống Quản Lý Trung Tâm Gia Sư Hiện Đại

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

<p className="mt-4 text-slate-600 text-base">
  <strong>Nền tảng quản trị trung tâm gia sư chuyên nghiệp, tự động hóa quy trình quản lý học viên, xếp lớp, điểm danh, tính toán học phí/lương gia sư và xuất báo cáo kế toán với độ chính xác tuyệt đối.</strong>
</p>

</div>

---

## 🌟 1. Điểm Sáng Kiến Trúc & Công Nghệ (Architectural Highlights)

Hệ thống **CSAT Tutor Portal** được thiết kế và phát triển theo các tiêu chuẩn công nghệ cao nhất của một ứng dụng quản lý tài chính - đào tạo cấp độ doanh nghiệp:

- 🛡️ **Xử Lý Nghiệp Vụ Nguyên Tử (Atomic Database RPCs):**  
  Toàn bộ các nghiệp vụ phức tạp nhạy cảm về tài chính và dữ liệu — như *Tạo lớp học kèm lịch trình*, *Điểm danh và chốt sổ học phí*, *Đổi gia sư giữa kỳ*, *Hủy và hoàn tác hóa đơn một phần* — đều được thực thi trực tiếp bằng các hàm **RPC (`SECURITY DEFINER`) trên PostgreSQL**. Điều này loại bỏ hoàn toàn rủi ro tranh chấp dữ liệu (Race Conditions) khi có nhiều truy cập đồng thời, bảo đảm tính toàn vẹn (ACID) tuyệt đối.

- ⚡ **Hiệu Năng & Tách Biệt Server / Client Components (Next.js 15 App Router):**  
  Tận dụng tối đa sức mạnh của React Server Components (RSC) cho việc kiểm soát phân quyền (Auth) và tải dữ liệu tĩnh siêu tốc, kết hợp với các Client Components tương tác mượt mà bằng `@tanstack/react-table` và `framer-motion`.

- 📊 **Tiêu Chuẩn Chuẩn Hóa Tiện Ích (DRY Formatters):**  
  Toàn bộ hệ thống áp dụng bộ định dạng tập trung tại `lib/format.ts`, đảm bảo hiển thị đồng nhất 100% cho tiền tệ Việt Nam (`₫`), cấu trúc ngày tháng (`dd/MM/yyyy`) và hệ thống nhãn màu trạng thái thông minh.

- 📈 **Động Cơ Báo Cáo Tài Chính Chuyên Nghiệp (Advanced Excel Export Engine):**  
  Tích hợp thư viện `SheetJS (xlsx)` tự động hóa xuất báo cáo tài chính. Hóa đơn học sinh hiển thị rõ số buổi, đơn giá trung bình và kỳ học. Bảng lương gia sư tự động chia đa bảng (Multi-sheet) — mỗi gia sư một trang riêng, chia khối rành mạch theo từng lớp học và buổi dạy.

---

## 🚀 2. Phân Tích Tính Năng Chi Tiết (Core Features)

### 👑 Phân Hệ Quản Trị Viên (Admin Portal)
* **Quản lý Học sinh & Học phí:** Thêm mới, chỉnh sửa, lưu trữ hồ sơ học sinh; theo dõi học phí mặc định và học phí tùy biến theo từng lớp học.
* **Quản lý Gia sư & Cây Gia sư:** Cấp tài khoản tự động (mật khẩu mặc định là số điện thoại), quản lý danh sách và hiển thị sơ đồ tổ chức gia sư trực quan.
* **Quản lý Lớp học Toàn diện:** Xếp lớp, gán học sinh, quản lý lịch học định kỳ, gia hạn lớp học và theo dõi danh sách lớp sắp hết hạn qua Pop-up Modal tương tác nhanh.
* **Kế toán & Chốt sổ Tài chính:** 
  * Xem trước (Preview) chi tiết bảng hóa đơn học sinh và bảng lương gia sư trước khi thực thi chốt sổ.
  * Lịch sử thu học phí hiển thị minh bạch số buổi học thực tế, đơn giá và cho phép đánh dấu thu tiền nhanh chóng.
  * Hoàn tác hóa đơn thủ công an toàn mà không làm mất dữ liệu điểm danh gốc.
* **Trung tâm Thông báo:** Đăng tải và quản lý thông báo, hiển thị banner popup trực tiếp trên Dashboard của Gia sư.

### 👩‍🏫 Phân Hệ Gia Sư (Tutor Portal)
* **Dashboard Trực quan:** Hiển thị tức thì thống kê thu nhập ước tính trong tháng, lịch dạy sắp tới và các thông báo mới nhất từ trung tâm.
* **Quản lý Lớp & Điểm danh:** Xem danh sách học sinh trong lớp, thực hiện điểm danh từng buổi (Có mặt / Vắng mặt / Nghỉ có phép) kèm ghi chú chi tiết tình hình học tập.
* **Bảng Lương & Lịch Sử Giảng Dạy:** Xem bảng lương chi tiết theo từng kỳ, cho phép mở rộng (expand/collapse) xem rõ từng buổi dạy, mức phí trung tâm khấu trừ và thực nhận, hỗ trợ tự xuất Excel cá nhân.

### ⚙️ Hệ Thống Tự Động (Automation Engine)
* **Cron Job Chốt Sổ Tự Động:** Tích hợp Vercel Cron Job tự động kích hoạt chốt sổ học phí và tính lương định kỳ vào ngày mùng 1 hàng tháng.
* **Backfill & Lịch Sử Giá:** Cơ chế tự động ghi nhận mốc thời gian áp dụng học phí mới (`effective_date`), bảo vệ chính xác đơn giá của các buổi học trong quá khứ.

---

## 📂 3. Cấu Trúc Thư Mục (Project Structure)

Dự án được tổ chức gọn gàng, tuân thủ các thực hành tốt nhất (Best Practices) của Next.js và kiến trúc phần mềm chuyên nghiệp:

```text
CtyGiaDinhCSAT/
├── app/                        # Next.js App Router (Pages, Layouts & API Routes)
│   ├── (auth)/login/           # Trang đăng nhập hệ thống
│   ├── admin/                  # Phân hệ Quản trị viên (Dashboard, Billing, Classes, Students, Tutors)
│   ├── tutor/                  # Phân hệ Gia sư (Dashboard, Classes, Salary, Attendance)
│   ├── api/                    # Backend Route Handlers (Billing, Attendance, Cron trigger, Auth)
│   ├── globals.css             # Cấu hình phong cách và biến giao diện Tailwind CSS
│   └── layout.tsx              # Root Layout toàn hệ thống
├── components/                 # Các component giao diện tái sử dụng
│   ├── ui/                     # Bộ thư viện UI nguyên bản (shadcn/ui - Card, Table, Modal, Button,...)
│   └── BackgroundIcons.tsx     # Hiệu ứng trang trí nền động
├── database/                   # Thư mục quản lý Cơ sở dữ liệu
│   └── CSAT_master_schema.sql  # [SINGLE SOURCE OF TRUTH] Toàn bộ Schema, Tables, RPCs và RLS
├── lib/                        # Thư viện tiện ích và cấu hình lõi
│   ├── format.ts               # Bộ tiện ích định dạng chuẩn hóa (Tiền tệ VNĐ, Ngày tháng, Badge)
│   ├── utils.ts                # Tiện ích ghép class Tailwind (cn)
│   └── supabase/               # Khởi tạo Supabase Client (Browser, Server & Service Role)
├── public/                     # Tài nguyên tĩnh (Favicon, Icons, Images)
├── .env.example                # Mẫu cấu hình biến môi trường
├── .gitignore                  # Bộ lọc file bỏ qua cho Git chuẩn Next.js 15
├── next.config.ts              # Cấu hình trình biên dịch Next.js
├── package.json                # Danh sách thư viện và scripts vận hành
└── README.md                   # Tài liệu hướng dẫn sử dụng và phát triển dự án
```

---

## 🛠️ 4. Hướng Dẫn Cài Đặt & Khởi Chạy (Local Setup)

### Yêu cầu hệ thống (Prerequisites)
* **Node.js**: Phiên bản `>= 18.17.0` (Khuyến nghị dùng Node 20 LTS).
* **Trình quản lý gói**: `npm`, `pnpm`, hoặc `yarn`.
* **Tài khoản Supabase**: Để khởi tạo cơ sở dữ liệu PostgreSQL trên đám mây hoặc local.

### Bước 1: Clone mã nguồn & Cài đặt thư viện
```bash
git clone https://github.com/thiennhan13/CtyGiaDinhCSAT.git
cd CtyGiaDinhCSAT
npm install
```

### Bước 2: Khởi tạo Cơ sở dữ liệu Supabase
1. Truy cập vào Dashboard của project Supabase -> Mở tab **SQL Editor**.
2. Mở file duy nhất `database/CSAT_master_schema.sql` trong mã nguồn.
3. Copy toàn bộ nội dung và dán vào SQL Editor trên Supabase -> Nhấn **Run**.  
   *(Script sẽ tự động khởi tạo toàn bộ bảng, chỉ mục, bảo mật RLS, 7 hàm RPC nguyên tử và tài khoản admin mặc định).*

### Bước 3: Cấu hình biến môi trường
Tạo file `.env.local` tại thư mục gốc của dự án dựa trên mẫu `.env.example`:

```env
# URL và Public Key từ Supabase Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Service Role Key (Dùng cho API Admin & Cron Job - Tuyệt đối không để lộ ở client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Mã bảo mật để xác thực khi Vercel Cron kích hoạt chốt sổ
CRON_SECRET=your-random-secure-cron-secret
```

### Bước 4: Khởi chạy Development Server
```bash
npm run dev
```
Truy cập vào trình duyệt tại địa chỉ: `http://localhost:3000`.

---

## 🌐 5. Hướng Dẫn Triển Khai (Deployment)

Dự án được tối ưu hóa 100% để triển khai liền mạch trên nền tảng **Vercel**:

1. **Đẩy mã nguồn lên GitHub**: Đảm bảo toàn bộ thay đổi đã được commit vào nhánh `main`.
2. **Import vào Vercel**:
   - Đăng nhập vào [Vercel Dashboard](https://vercel.com) -> Nhấn **Add New Project** -> Chọn repository `CtyGiaDinhCSAT`.
   - Framework Preset sẽ tự động nhận diện là **Next.js**.
3. **Cấu hình Environment Variables trên Vercel**:
   - Thêm đầy đủ 4 biến môi trường (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) vào mục Environment Variables của Vercel.
4. **Deploy & Tự động hóa Cron Job**:
   - Nhấn **Deploy**. Sau khoảng 1 phút, ứng dụng sẽ đi vào hoạt động chính thức.
   - Vercel sẽ tự động nhận diện endpoint `/api/admin/billing/generate` để kích hoạt chốt sổ tự động vào 00:00 ngày mùng 1 hàng tháng.

---

## 👨‍💻 6. Kiểm Thử & Bảo Trì (Quality Assurance)

Hệ thống được áp dụng bộ quy chuẩn kiểm tra chất lượng nghiêm ngặt trước mỗi bản phát hành:

```bash
# Kiểm tra toàn bộ lỗi kiểu dữ liệu TypeScript (0 errors threshold)
npx tsc --noEmit

# Kiểm tra và build bản production (Next.js Turbopack)
npm run build
```

---

<div align="center">
  <p className="text-slate-500 text-sm">
    © 2026 CSAT Tutor Portal. Developed with excellence for professional tutor management.
  </p>
</div>
