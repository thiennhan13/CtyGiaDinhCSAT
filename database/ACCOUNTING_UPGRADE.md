# Nâng cấp database và backend quản lý CSAT

Tham chiếu nền migration 05–10 cho lớp, lịch, điểm danh, học phí và lương. Không chạy lại gói trên môi trường đã nâng cấp. Trạng thái ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md), quy trình áp dụng ở [database README](README.md).

## Dữ liệu được bảo toàn

- Giữ nguyên buổi học, điểm danh, chứng từ và nhãn kỳ cũ. Không gộp lịch trùng, xóa chứng từ, đổi số tiền đã chốt hoặc tự nối lại khóa ngoại bị mất.
- Chụp nguyên chứng từ cũ vào `csat_internal.legacy_payments`. Đây là trạng thái quan sát lúc nâng cấp, không phải bản sao của một thời điểm trong quá khứ.
- Khi báo cáo thiếu đơn giá lịch sử, trả về lỗi cần đối soát thay vì tự tính thành 0.
- Không suy ra ngày thu tiền từ tên kỳ. Hóa đơn cũ đã thu nhưng không có ngày thu vẫn được giữ như vậy.
- Lịch sử đơn giá và phân công cũ bắt đầu bằng giá trị quan sát tại ngày nâng cấp. Không áp giá hôm nay ngược vào buổi cũ chưa rõ đơn giá.
- Các khóa ngoại tài chính đổi sang RESTRICT. Không xóa dây chuyền học phí/điểm danh khi xóa lớp, học sinh hoặc gia sư.

## Nghiệp vụ sau nâng cấp

| Nghiệp vụ | Quy tắc |
|---|---|
| Chốt kỳ | Một transaction: kiểm tra bản xem trước, lưu chi tiết, tạo chứng từ, đánh dấu toàn bộ buổi đủ điều kiện. Gồm cả buổi tất cả học sinh vắng. |
| Gửi lại yêu cầu | Mã yêu cầu được lưu theo người thực hiện; cùng mã và nội dung trả lại kết quả, không ghi trùng. Dùng lại mã với nội dung khác bị từ chối. |
| Dữ liệu thay đổi sau xem trước | Từ chối chốt/điều chỉnh/thu tiền, yêu cầu tải lại số liệu. |
| Đính chính kỳ mới | Thêm khoản điều chỉnh có lý do, người thực hiện và thời điểm. Giữ nguyên chứng từ và điểm danh gốc. |
| Phân bổ | Học phí tăng/giảm theo dòng học sinh; CSAT dùng định mức của buổi gốc khi tổng học phí buổi lớn hơn 0; lương = học phí − CSAT. |
| Thu và hoàn | Ghi nhận toàn bộ số còn phải thu hoặc hoàn; đây là ghi sổ giao dịch đã thực hiện bên ngoài, không tự chuyển tiền. Sai ghi nhận được đảo bằng sự kiện mới. |
| Kỳ cũ sai lệch | Chỉ liệt kê để đối soát riêng. Không dùng công cụ điều chỉnh kỳ mới để tự sửa chứng từ cũ. |
| Xếp lịch | Cùng ngày, giờ kết thúc lớn hơn bắt đầu, nằm trong thời hạn lớp, không giao nhau với lịch lớp hoặc gia sư. |
| Gia hạn | Admin cập nhật thời hạn và lịch trong cùng transaction. Gia sư chỉ bổ sung lịch trong thời hạn hiện có. |
| Đổi phí/gia sư | Có ngày hiệu lực; không sửa buổi đã hoàn thành. Trang quản lý đọc giá và phân công đang có hiệu lực. |
| Tạm dừng | Giữ danh sách học sinh; hủy lịch tương lai chưa bắt đầu và chưa có điểm danh. |
| Lưu trữ/kết thúc | Đóng lượt tham gia và hủy lịch tương lai chưa bắt đầu; giữ lịch sử. Mở lại không tự phục hồi lịch đã hủy. |
| Điểm danh | Dùng quyền và đơn giá do database xác minh, không tin giá do trình duyệt gửi. Buổi đã chốt không được sửa trực tiếp. |
| Xác minh phí cũ | Admin lưu căn cứ và đơn giá của từng học sinh/buổi chưa chốt. Nếu đã có điểm danh thì cập nhật đơn giá; nếu chưa có thì chỉ lưu xác minh, chờ chọn trạng thái điểm danh riêng. |

Báo cáo lương dùng gia sư được lưu tại từng buổi. Đổi người phụ trách lớp không làm mất lịch sử lương của gia sư cũ. Báo cáo thu ròng trên dashboard chỉ tổng hợp sự kiện thu/hoàn/đảo ghi nhận mới trong tháng Việt Nam.

## Cấu trúc

- `billing_periods`, `billing_sessions`, `billing_items`: kỳ và dữ liệu gốc lúc chốt.
- `billing_adjustments`, `payment_events`: các khoản bổ sung, không sửa/xóa dòng đã ghi.
- `class_tutor_history`, `class_fee_history`, `student_fee_history`: lịch sử theo ngày hiệu lực.
- `class_enrollments`: các lượt tham gia; mốc bắt đầu không rõ của dữ liệu cũ được để NULL.
- `session_roster_verifications`, `attendance_fee_verifications`: các xác minh có căn cứ, người thực hiện và thời gian; chỉ bổ sung, không sửa/xóa.
- `attendance_current`: chuyên cần theo đính chính mới nhất; điểm danh gốc vẫn giữ nguyên.
- `business_audit_events`: nhật ký thay đổi quản lý từ khi nâng cấp.
- `class_current_state`, `class_students_current`: view đọc trạng thái đang có hiệu lực.
- `csat_internal`: dữ liệu nội bộ về phiên bản, chứng từ cũ và kết quả yêu cầu; không mở cho Data API.

Các cột hiện có trên `classes` và `class_students` được giữ để tương thích. Với thay đổi hẹn ngày tương lai, view lịch sử là nguồn đọc hiện tại; không lấy cột cũ để suy ra giá hay phân công đã có hiệu lực.

Một khóa transaction chung tuần tự hóa các thao tác quản lý/tài chính ở quy mô hiện tại. Khi tải ghi tăng đáng kể, cần đo thời gian chờ khóa trước khi chia khóa theo lớp/kỳ. Chưa xóa các index nghi trùng vì cần đo trên workload thực tế.

## Đối soát lịch sử — tài liệu nội bộ

Chi tiết số liệu, sai lệch tài chính và kết quả đối soát của từng đợt không đưa vào GitHub. Người quản trị giữ biên bản riêng theo [SECURITY.md](../SECURITY.md). Truy vấn `verification/accounting_reconciliation.sql` có thể trả định danh; không đính output thật vào PR/CI.

## Kiểm chứng và phục hồi

Dùng `verification/accounting_preflight.sql`, `accounting_reconciliation.sql` và `accounting_postflight.sql` để đối chiếu đúng phạm vi; output có thể chứa định danh, giữ nội bộ. Kiểm snapshot/roster/đơn giá, toàn vắng, revision/request ID, chốt/thu/hoàn đồng thời và gia sư lịch sử trên database thử.

Baseline `CSAT_master_schema.sql` chỉ cho cài mới, không dùng trên database có dữ liệu. Khi transaction chưa commit thì rollback; sau khi có phát sinh nghiệp vụ phải sửa bù hoặc dùng kế hoạch phục hồi được duyệt, không restore mù làm mất dữ liệu mới.

[Quy tắc học phí](../docs/BILLING_LOGIC.md) là nguồn nghiệp vụ hiện hành; [hậu kiểm lịch sử](POST_UPGRADE_CHECK_20260909.md) chỉ giữ bằng chứng của đợt nâng cấp cũ.
