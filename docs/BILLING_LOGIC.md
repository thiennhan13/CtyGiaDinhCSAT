# Logic học phí và chốt sổ hiện hành

Đối chiếu `app/api/admin/billing/generate/route.ts`, migrations 05–10 và read models. Tài liệu cũ mô tả fallback về giá hiện hành/0 đồng đã được thay thế vì không còn đúng với yêu cầu bảo toàn lịch sử.

## Luồng xử lý

1. Admin xem báo cáo bằng RPC, kiểm tra dữ liệu/đơn giá và các trường hợp cần đối soát.
2. Khi chốt: API nhận khoảng ngày, nhãn kỳ, preview token, request ID và danh sách xác nhận học phí bằng 0; gọi `close_billing_period` trong transaction.
3. Database kiểm tra quyền, bản xem trước còn hợp lệ, yêu cầu trùng và điều kiện buổi học; lưu kỳ, buổi và các dòng học phí trước khi trả kết quả.
4. Thu/hoàn là sự kiện ghi nhận giao dịch bên ngoài, không tự chuyển tiền. Điều chỉnh có lý do và audit; giữ chứng từ/điểm danh gốc.

## Các điều không được thay đổi tùy tiện

- Giá/gia sư lấy từ snapshot hoặc nguồn lịch sử đã xác minh, không lấy giá hôm nay áp ngược vào lịch sử. Thiếu giá cần đối soát; không đổi thành 0 để chốt được.
- Học sinh đã nghỉ vẫn có thể có buổi đã học cần tính phí. Không lọc bỏ lịch sử theo trạng thái active hiện tại.
- Buổi đủ điều kiện chốt mà tất cả học sinh vắng vẫn được đánh dấu kỳ để không lặp trong lần xem sau.
- Phiên bản dữ liệu thay đổi sau preview phải yêu cầu tải lại; request ID bảo vệ gửi trùng, không bỏ token/lock cho tiện.
- Buổi/kỳ đã chốt không sửa trực tiếp. Dùng luồng đính chính/điều chỉnh; các kỳ lịch sử chưa đủ căn cứ cần xử lý riêng.
- Phụ huynh phải phân biệt tạm tính, đã chốt, thanh toán ròng, còn đóng và dư/cần hoàn. Thiếu dữ liệu là null, không phải 0 đồng.

## Nguồn tham chiếu

- Nghiệp vụ và giới hạn lịch sử: [ACCOUNTING_UPGRADE.md](../database/ACCOUNTING_UPGRADE.md), đọc phần trạng thái mới ở đầu.
- Triển khai: `features/billing/`, `lib/billing-report.ts`, `lib/payment-actions.ts`, `app/api/admin/billing/`.
- SQL: migration 06/08/09 và các migration bổ sung sau đó; 21 thêm phí từng buổi cho RPC phụ huynh.
- Test: `database/tests/accounting.test.cjs`, `class-workflows.test.cjs`, `postgres-concurrency.test.cjs`, `parent-email-completion.test.cjs`.

Đối soát production chứa thông tin học phí/hồ sơ phải lưu hành nội bộ theo [SECURITY.md](../SECURITY.md), không đính vào PR.
