# CSAT Tutor Portal

Hệ thống quản lý trung tâm gia sư, hỗ trợ tự động hóa các khâu vận hành thường ngày như: quản lý hồ sơ học sinh, gia sư, xếp lớp, theo dõi điểm danh và chốt sổ tính học phí/lương gia sư hàng tháng.

---

## 🛠️ 1. Công Nghệ Sử Dụng

Dự án được xây dựng trên stack công nghệ phổ biến cho ứng dụng web hiện đại:
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Giao diện & Styling:** Tailwind CSS v4, thư viện component `shadcn/ui`, `lucide-react`
- **Cơ sở dữ liệu & Xác thực:** Supabase (PostgreSQL + Supabase Auth)
- **Xử lý báo cáo Excel:** `xlsx` (SheetJS)
- **Kiểm soát chất lượng mã nguồn:** ESLint 9 Flat Config

---

## 📁 2. Cấu Trúc Thư Mục

Để các lập trình viên dễ nắm bắt khi làm việc với codebase, dự án được quy hoạch theo bố cục sau:

```text
├── app/
│   ├── admin/        # Trang giao diện dành riêng cho Quản trị viên
│   ├── tutor/        # Trang giao diện dành riêng cho Gia sư
│   ├── api/          # Các API Endpoints xử lý chốt sổ, điểm danh, xếp lớp
│   └── globals.css   # Style CSS chung của ứng dụng
├── components/       # Các component UI tái sử dụng (Card, Button, Modal, Table, Badge,...)
├── database/         # Chứa CSAT_master_schema.sql (nguồn chuẩn duy nhất cho bảng, enum, RPCs)
├── lib/
│   ├── format.ts     # Thư viện hàm định dạng tiền tệ VNĐ, số, ngày tháng và màu trạng thái
│   └── supabase/     # Client kết nối Supabase (Server và Client SSR)
└── public/           # Hình ảnh, icon và tài nguyên tĩnh
```

---

## 💡 3. Các Tính Năng Chính

### 👑 Quản Trị Viên (Admin)
- **Quản lý Học sinh & Gia sư:** Thêm mới, chỉnh sửa hồ sơ, theo dõi học phí theo lớp, hiển thị sơ đồ tổ chức gia sư trực quan.
- **Quản lý Lớp học:** Xếp lớp, gán học sinh, quản lý lịch học định kỳ và nhận thông báo nhanh qua Pop-up Modal cho các lớp sắp hết hạn cần gia hạn.
- **Kế toán & Chốt sổ Tài chính:**
  - **Chế độ Dự Kiến (Preview):** Xem trước và tính toán thử hóa đơn học phí của học sinh và bảng lương chi tiết của gia sư trước khi phát hành hóa đơn chính thức.
  - **Chế độ Lịch Sử (Historical):** Xem lại các kỳ chốt sổ đã qua, lọc danh sách chưa thu tiền, đánh dấu thu tiền hoặc hoàn tác (rollback) chốt sổ khi cần.
  - **Xuất Excel:** Tự động tạo file Excel cho hóa đơn học sinh (kèm số buổi và đơn giá TB) và bảng lương gia sư (tạo nhiều sheet, mỗi gia sư một sheet chi tiết từng buổi).
- **Trung tâm Thông báo:** Tạo banner thông báo gửi đến bảng điều khiển của gia sư.

### 👩‍🏫 Gia Sư (Tutor)
- **Đăng nhập & Bảng điều khiển:** Truy cập bằng số điện thoại (mật khẩu mặc định là SĐT), xem nhanh lịch dạy và thông báo từ trung tâm.
- **Điểm danh Buổi học:** Ghi nhận chuyên cần cho học sinh. Khi điểm danh, hệ thống tự động lưu mức học phí tại thời điểm đó (snapshot) để không bị ảnh hưởng nếu học phí thay đổi trong tương lai.
- **Theo dõi Lương:** Xem chi tiết bảng lương từng kỳ, có thể mở rộng để xem cụ thể từng buổi dạy ở mỗi lớp.

---

## ⚙️ 4. Lưu Ý Kỹ Thuật (Architecture Notes)

- **Sử dụng SQL RPCs trong cơ sở dữ liệu:** Các thao tác quan trọng và có tính ràng buộc cao như *tạo lớp học*, *điểm danh*, *chốt sổ hàng tháng* hay *hủy hóa đơn* được xử lý trực tiếp dưới Database thông qua các hàm RPC (`SECURITY DEFINER`). Cách làm này giúp đảm bảo tính toàn vẹn dữ liệu (ACID), tránh lỗi sai lệch số liệu khi có nhiều người cùng thao tác đồng thời.
- **Thư viện định dạng tập trung (`lib/format.ts`):** Toàn bộ việc hiển thị tiền VNĐ (`formatVND`), số lượng và ngày tháng trong hệ thống đều dùng chung một bộ hàm tiện ích để tránh viết code trùng lặp và giữ giao diện nhất quán.

---

## 🚀 5. Hướng Dẫn Cài Đặt Chạy Local

**Bước 1:** Tải mã nguồn về máy:
```bash
git clone <url-repository>
cd CtyGiaDinhCSAT
```

**Bước 2:** Cấu hình biến môi trường:
Copy file `.env.example` thành `.env.local` (hoặc `.env`) và điền thông tin kết nối Supabase của dự án:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

**Bước 3:** Cài đặt các gói thư viện phụ thuộc:
```bash
npm install
```

**Bước 4:** Khởi động máy chủ phát triển (Development Server):
```bash
npm run dev
```

Mở trình duyệt và truy cập vào [http://localhost:3000](http://localhost:3000) để sử dụng ứng dụng. Toàn bộ mã nguồn đã được kiểm duyệt bằng ESLint 9 và TypeScript compiler, sẵn sàng cho môi trường Production.
