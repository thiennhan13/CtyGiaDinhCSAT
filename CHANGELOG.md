# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi lại ở đây.  
Format theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `Combobox` component (`components/ui/combobox.tsx`) — dropdown tìm kiếm được, thay thế `<Select>` khi danh sách dài.
- `useConfirm` & `useAlert` hooks (`components/ui/use-dialog.tsx`) — thay thế `window.alert()` / `window.confirm()` bằng Dialog đẹp của shadcn/ui.
- Cài thêm shadcn `command` và `popover` component (dùng `cmdk` + `@base-ui/react`).
- `CHANGELOG.md` — file này.

### Changed
- `README.md` — viết lại ngắn gọn, thêm badge, dùng bảng Markdown cho stack.

### Fixed
- *(Đang áp dụng)* Thay `alert()` / `confirm()` trên toàn bộ trang Admin bằng `useAlert` / `useConfirm`.

---

## [1.0.0] — 2026-07

### Added
- Hệ thống điểm danh tay: gia sư bấm có mặt / vắng mặt từng học sinh.
- Cơ chế Snapshot: `tuition_fee_snapshot`, `csat_fee_snapshot`, `tutor_id_snapshot` — chốt cứng tại thời điểm điểm danh.
- Chốt sổ hàng tháng (Admin): tạo hóa đơn học sinh, bảng lương gia sư theo kỳ.
- Rollback từng phần (`rollback_billing_partial`): chỉ xóa hóa đơn `unpaid`, giữ `paid`.
- Xuất Excel đa sheet: tổng hợp chung + mỗi gia sư một sheet chi tiết.
- RLS đầy đủ: gia sư chỉ xem lớp được gán; admin toàn quyền.
- Cảnh báo học sinh phí = 0đ khi chốt sổ (tránh bỏ sót hóa đơn).
- Audit log `class_change_log` khi đổi gia sư hoặc đổi phí CSAT.
- Trang xem lương cho gia sư: chi tiết từng buổi, expand/collapse theo lớp.

### Fixed
- Unique constraint `unique_payment_per_period` ngăn tạo hóa đơn trùng khi double-click.
- `COALESCE` trong `take_attendance_safe` — giữ snapshot cũ khi admin sửa điểm danh.
- API generate đánh dấu `billing_period` cho tất cả sessions trong khoảng ngày, kể cả buổi 0 học sinh đi học.
- Bảng lương tính theo `tutor_id_snapshot`, không bị ảnh hưởng khi lớp đổi gia sư.
