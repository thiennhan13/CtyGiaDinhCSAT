# CSAT Tutor Portal

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/trạng_thái-nội_bộ-orange?style=flat-square)

Hệ thống quản lý nội bộ của nhóm gia sư CSAT. Dùng để điểm danh tay từng buổi học và tổng kết hóa đơn / bảng lương hàng tháng.

---

## Stack sử dụng

| Lớp | Công nghệ |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Giao diện** | Tailwind CSS v4, shadcn/ui, lucide-react |
| **Database & Auth** | Supabase (PostgreSQL + RLS + Auth) |
| **Export** | SheetJS (`xlsx`) — xuất bảng lương & hóa đơn Excel |

---

## Tính năng chính

### Gia sư
- Đăng nhập bằng **email**, mật khẩu mặc định là **số điện thoại**.
- Xem lịch dạy, bấm vào từng buổi để **điểm danh** (có mặt / vắng mặt + ghi chú).
- Xem **bảng lương** theo từng kỳ, có thể mở rộng xem chi tiết từng buổi.

### Phụ huynh

- Tra cứu trực tiếp bằng **số điện thoại đã đăng ký**, không mật khẩu/OTP; không cần Phone Auth hoặc nhà cung cấp SMS.
- Số điện thoại là khóa tra cứu, không xác minh danh tính: ai biết số đã đăng ký đều có thể xem học sinh được liên kết.
- Admin quản lý số điện thoại, liên kết học sinh và khóa quyền tra cứu tại `/admin/parents`.
- Hồ sơ/liên kết từ bản mật khẩu được giữ lại. Phiên tra cứu có hạn dùng 12 giờ; không ảnh hưởng phiên đăng nhập admin/gia sư.
- Database đã chạy migration02: áp dụng **migration03** theo [hướng dẫn nâng cấp và phạm vi ảnh hưởng](database/UPDATE_PARENT_PHONE_LOOKUP_20260906.md). Không chạy lại master schema hoặc migration02 trên database hiện tại.

### Admin
- **Học sinh & Gia sư:** Thêm, sửa hồ sơ; cấp tài khoản gia sư (mật khẩu = SĐT).
- **Lớp học:** Tạo lớp, gán học sinh, thiết lập lịch cố định hàng tuần.
- **Kế toán & Chốt sổ:**
  - *Dự kiến* — kiểm tra số liệu trước khi phát hành hóa đơn.
  - *Lịch sử* — xem các kỳ đã chốt, đánh dấu đã thu, hủy chốt sổ khi cần.
  - Xuất Excel: hóa đơn học sinh + bảng lương chi tiết (mỗi gia sư một sheet).
- **Thông báo:** Tạo banner gửi lên dashboard của gia sư.

---

## Kiến trúc & ghi chú kỹ thuật

**Snapshot:** Khi điểm danh, hệ thống chốt cứng học phí (`tuition_fee_snapshot`), phí trung tâm (`csat_fee_snapshot`) và gia sư dạy (`tutor_id_snapshot`) ngay tại thời điểm đó. Mọi thay đổi sau này đều không làm lệch số liệu cũ.

**RPC thay vì raw SQL từ client:** Các thao tác phức tạp (tạo lớp, điểm danh, chốt sổ, rollback) đều chạy qua hàm PostgreSQL `SECURITY DEFINER`. Đảm bảo ACID và tránh race condition khi nhiều người thao tác cùng lúc.

**Chốt sổ thông minh:** API generate đánh dấu `billing_period` cho *tất cả* buổi học trong khoảng ngày (kể cả buổi không ai đi học), tránh bị kẹt lại trong kỳ tiếp theo.

**Rollback từng phần:** Chỉ xóa hóa đơn `unpaid`; hóa đơn `paid` được giữ nguyên.

---

## Chạy local

```bash
# 1. Clone về
git clone <url>
cd CtyGiaDinhCSAT

# 2. Điền biến môi trường
cp .env.example .env
# Sửa NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Cài thư viện
npm install

# 4. Khởi động
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000).

---

## Database

Toàn bộ schema (bảng, enum, index, RLS, RPC) nằm trong một file duy nhất:
```
database/CSAT_master_schema.sql
```
Chỉ chạy master schema trên **database trống**. Với database đã có dữ liệu, dùng các file migration riêng trong `database/migrations/` theo đúng thứ tự và hướng dẫn cập nhật tương ứng. Đã áp dụng bản phụ huynh ngày 05/09 thì chỉ chạy tiếp `20260906_03_parent_phone_lookup.sql`.
