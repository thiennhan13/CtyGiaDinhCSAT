# Công Ty Gia Đình - Hệ thống Quản lý Gia sư CSAT TUTOR

Hệ thống quản lý chuyên nghiệp dành cho trung tâm gia sư CSAT TUTOR, hỗ trợ quản lý học sinh, gia sư, lớp học, điểm danh và tự động hóa tính toán học phí/lương.

## Tính năng chính

- **Quản trị viên (Admin):**
  - Quản lý danh sách học sinh (Thêm/Sửa/Xóa mềm).
  - Quản lý gia sư và cấp tài khoản (Mật khẩu mặc định là số điện thoại).
  - Quản lý lớp học và gán học sinh vào lớp với mức phí riêng biệt.
  - Theo dõi hóa đơn và thanh toán.
  - Trigger chốt sổ thủ công hoặc tự động qua Cron.

- **Gia sư (Tutor):**
  - Dashboard xem lịch dạy sắp tới.
  - Điểm danh học sinh trong mỗi buổi học (Có mặt/Vắng mặt).
  - Ghi chú tình hình học tập của từng học sinh.

- **Tự động hóa:**
  - Tự động chốt sổ vào mùng 1 hàng tháng qua Vercel Cron.
  - Tính toán học phí dựa trên số buổi "Có mặt" thực tế.

## Công nghệ sử dụng

- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Shadcn UI.
- **Backend:** Next.js Route Handlers.
- **Database & Auth:** Supabase (PostgreSQL).
- **Animation:** Motion (framer-motion).

## Cấu hình môi trường

Tạo file `.env.local` dựa trên `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

## Triển khai trên Vercel

1. Đẩy mã nguồn lên GitHub.
2. Kết nối project trên Vercel.
3. Cấu hình các Environment Variables trong Vercel Dashboard.
4. Vercel sẽ tự động nhận diện `vercel.json` để thiết lập Cron Job.

## Cấu trúc dữ liệu (SQL)

Tham khảo file `supabase_schema.sql` để khởi tạo database trên Supabase.
