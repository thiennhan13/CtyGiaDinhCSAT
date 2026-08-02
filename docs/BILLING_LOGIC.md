# Logic Tính Học Phí & Chốt Sổ (Billing)

Tài liệu này ghi lại chính xác logic được sử dụng để tính toán học phí và chốt sổ tại module `app/api/admin/billing/generate/route.ts`. Việc nắm vững logic này là BẮT BUỘC để đảm bảo an toàn, không làm hỏng hoặc thất thoát dữ liệu học phí của học sinh khi có bất kỳ sửa đổi nào trong tương lai.

## 1. Cách Tính Học Phí (Tuition Calculation Logic)

Học phí được tính tổng kết theo từng kỳ (billing period) cho mỗi học sinh trong từng lớp.

### Các bước lấy dữ liệu:
1. **Lấy Buổi Học (Sessions):** 
   - Truy vấn tất cả các `sessions` nằm trong khoảng thời gian `startDate` đến `endDate`.
   - Điều kiện: `status = 'completed'` (buổi học đã hoàn thành) và `billing_period IS NULL` (chưa từng được chốt sổ).
2. **Lấy Điểm Danh (Attendances):** 
   - Từ danh sách `session_id` ở trên, lấy ra các bản ghi điểm danh trong `session_attendance`.
   - Điều kiện: `status = 'attended'` (Học sinh PHẢI ĐI HỌC thì mới tính tiền buổi đó. Nếu nghỉ học, hệ thống không cộng tiền).
3. **Lấy Đơn Giá (Tuition Rate):**
   - Lấy thông tin giá từ bảng `class_students` (cột `tuition_fee_per_session`). 
   - **Lưu ý quan trọng (L5 FIX):** Quá trình lấy giá này KHÔNG được lọc theo `status = 'active'`. Phải lấy cả học sinh đã nghỉ học (`dropped`) vì có trường hợp học sinh đi học vài buổi trong tháng rồi mới nghỉ, nếu bỏ qua những học sinh `dropped` thì tiền của những buổi đã học sẽ bị tính bằng 0.

### Ưu tiên Đơn Giá (Snapshot vs Fallback):
Hệ thống tính tiền từng buổi bằng cách quét qua danh sách điểm danh (attendance) và cộng dồn lại theo công thức:
- **Ưu tiên 1 (Snapshot):** `tuition_fee_snapshot` lưu trực tiếp trên dòng điểm danh `session_attendance`. (Điều này đảm bảo nếu giá lớp học thay đổi trong tương lai, các buổi học trong quá khứ vẫn giữ nguyên giá cũ).
- **Ưu tiên 2 (Fallback):** Nếu `snapshot` trống (null), hệ thống sẽ dùng `tuition_fee_per_session` lấy từ bảng `class_students`.
- Nếu cả 2 đều không có, giá được tính là `0`.

## 2. Logic Đảm Bảo An Toàn & Chống Lỗi (Safety & Edge Cases)

Để hệ thống chạy ổn định và không bao giờ xuất hiện lỗi mất tiền hoặc kẹt số liệu, các logic sau đã được áp dụng chặt chẽ:

### 2.1. Ngăn chặn kẹt "Buổi Học Trắng" (Zero-attendee Sessions)
- Có những buổi học đã `completed` nhưng toàn bộ học sinh nghỉ học. Những buổi này sẽ không sinh ra bất kỳ hóa đơn (payment) nào.
- Tuy nhiên, hệ thống vẫn **BẮT BUỘC phải update `billing_period` cho TẤT CẢ các session** đã được query ra ban đầu, kể cả khi session đó không tạo ra dòng payment nào.
- Nếu không update, session này sẽ vĩnh viễn nằm ở trạng thái `billing_period IS NULL` và luôn hiện lên trong phần Preview của các tháng sau (gây rác dữ liệu).

### 2.2. Tránh Double Billing (Chốt Sổ Trùng)
- Hệ thống kiểm tra trong bảng `payments`, nếu phát hiện kỳ hóa đơn này (`billing_period`) đã có hóa đơn ở trạng thái `unpaid` thì sẽ **CHẶN** (không cho chốt sổ). 
- Chỉ cho phép tạo mới nếu admin đã rollback toàn bộ các hóa đơn chưa thu của kỳ đó.
- Ngoài ra, nếu có lỗi trùng lặp Database Constraint (Lỗi Postgres `23505` unique violation), hệ thống sẽ bắt lỗi mượt mà và báo cho Admin thay vì crash 500.

### 2.3. Báo cáo các Hóa đơn 0 đồng (Zero-amount logging)
- Sau khi cộng tổng, nếu `totalAmount == 0`, hệ thống sẽ KHÔNG tạo hóa đơn vào Database (tránh tạo hóa đơn rác 0 đồng).
- Thay vào đó, hệ thống ghi nhận tên học sinh bị tính 0 đồng đưa vào mảng `zero_amount_students` và trả về Client. Điều này giúp Admin có thể rà soát lại xem do học sinh nghỉ học 100% số buổi, hay do quên cài đặt học phí (`tuition_fee_per_session = 0`).

---
**CẢNH BÁO QUAN TRỌNG KHI SỬA ĐỔI:**
- KHÔNG BAO GIỜ thêm bộ lọc `status = 'active'` khi query bảng `class_students` lúc tính tiền.
- LUÔN LUÔN giữ nguyên cơ chế ưu tiên `tuition_fee_snapshot` so với giá gốc.
- Nếu thay đổi cơ chế chốt sổ, phải đảm bảo các buổi học (sessions) luôn được gán `billing_period` ở cuối chu trình.
