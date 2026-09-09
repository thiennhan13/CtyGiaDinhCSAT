# Nâng cấp database và backend quản lý CSAT

Trạng thái: đã chuẩn bị ở mã nguồn, **chưa áp dụng lên Supabase production**. Phạm vi là quản lý lớp, lịch, điểm danh, học phí và lương; không chỉnh nội dung chương trình đào tạo.

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

## Dấu hiệu đã phát hiện trong lần kiểm tra 08/09/2026

Các số liệu dưới đây là ảnh chụp tại lần kiểm tra, cần chạy truy vấn đối soát lại trước triển khai.

- 10 nhóm lịch trùng, 55 dòng dư; có 2 dòng dư đã tính phí.
- 19 buổi hoàn thành có giờ không hợp lệ; 18 buổi đã chốt.
- 101 lịch dự kiến trong 4 lớp lưu trữ; còn 7 lượt tham gia đang hoạt động.
- 71 buổi ngoài thời hạn lớp.
- 5 chứng từ đã thu mất liên kết lớp/học sinh; 3 chứng từ đã thu lệch so với điểm danh hiện còn.
- Có lượt đã chốt với học phí 119.000 đồng chưa tìm được chứng từ tương ứng.
- Một gia sư cũ có 8 buổi đã chốt bị che khi quyền xem phụ thuộc người phụ trách lớp hiện tại.

Số liệu hiện còn không đủ để khẳng định ai hoặc thao tác nào gây ra từng sai lệch. Truy vấn `verification/accounting_reconciliation.sql` xuất định danh cần đối chiếu; việc sửa từng trường hợp cần chứng cứ và quyết định riêng.

## Thứ tự triển khai để duyệt

0. Trước cửa sổ bảo trì production, thử toàn bộ gói trên bản sao staging: nâng cấp, kiểm tra Data API/computed relationships, đăng nhập theo từng vai trò và các luồng UI bên dưới. Chỉ triển khai production khi bước này đạt.
1. Tạm ngừng các thao tác ghi trong cửa sổ bảo trì. Không để app cũ và schema mới tiếp tục ghi song song.
2. Xác nhận đang ở đúng project Supabase; tạo backup bằng cơ chế backup của Supabase hoặc công cụ PostgreSQL phù hợp. Thử khôi phục vào môi trường riêng, không ghi đè database đang dùng.
3. Chạy `verification/accounting_preflight.sql` và `verification/accounting_reconciliation.sql` chỉ đọc. Lưu kết quả ngoài Git. Dừng nếu có blocker, phiên bản đã nâng cấp một phần hoặc khác biệt cấu trúc chưa được giải thích.
4. Sau khi được duyệt, chạy **một lần** `upgrade-accounting.sql` trên database đã có migration 04. Gói 05–10 nằm trong một transaction, có giới hạn chờ khóa và thời gian thực thi. Nếu một bước lỗi, ROLLBACK toàn gói và kiểm tra nguyên nhân.
5. Chạy `verification/accounting_postflight.sql` và chạy lại preflight. So sánh count/MD5 của dữ liệu gốc; phải giữ nguyên trong cửa sổ bảo trì. `paid_at` được loại khỏi fingerprint để tương thích database cũ chưa có cột.
6. Triển khai phiên bản app cùng gói này lên Vercel. Giữ các biến Supabase hiện có; DATABASE_URL chỉ dùng cho công cụ quản trị, không đưa vào NEXT_PUBLIC. Không cần thêm secret cho các RPC nghiệp vụ mới.
7. Kiểm tra kết nối và quyền sau triển khai; đối chiếu các luồng đã đạt trên staging: tạo/gia hạn lớp, ngày hiệu lực, điểm danh, chốt miễn phí/toàn vắng, điều chỉnh, thu/hoàn, báo cáo gia sư cũ và quyền tài khoản không liên quan. Sau đó mới mở ghi lại.

**Không chạy `CSAT_master_schema.sql` trên database đang có dữ liệu.** File này chỉ dành cho cài mới; các khối lịch sử của nó có quyền cũ trước khi được migration sau thay thế. Không chạy lại migration 01–04 sau khi nâng cấp.

Nếu triển khai lỗi: giữ chế độ bảo trì, xác định transaction đã COMMIT hay chưa. Khi chưa COMMIT, rollback; khi đã ghi nghiệp vụ mới, sửa tiến thay vì khôi phục mù bản sao cũ làm mất phát sinh mới. Việc phục hồi production là quyết định riêng cần duyệt.

## Kiểm thử và giới hạn xác minh

Kết quả kiểm thử sau sửa review được cập nhật ở cuối tài liệu. Database kiểm thử tách biệt với Supabase đang dùng.

Lệnh từ thư mục dự án:

```text
node database/build-master.cjs
node --test database/tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js . --max-warnings 30
node node_modules/next/dist/bin/next build
```

Database kiểm thử dùng dữ liệu giả, không đọc .env. Kiểm thử PostgreSQL native trên Windows chạy ở loopback, thư mục tạm riêng và khôi phục bản sao vật lý sau khi dừng sạch. Đây không phải bằng chứng rằng backup production đã được tạo hoặc đã khôi phục thành công.

Các kiểm thử baseline 01–04 được giữ ở fixture lịch sử. `schema-accounting.test.cjs` kiểm tra schema cuối và nâng cấp; `postgres-concurrency.test.cjs` kiểm tra cạnh tranh thực trên PostgreSQL.

Trạng thái khi kiểm thử cục bộ: chưa áp dụng migration trên production, chưa kiểm chứng PostgREST computed relationships và thao tác giao diện với schema mới trên staging. Cập nhật kiểm tra trực tiếp sau khi người dùng áp dụng SQL: xem POST_UPGRADE_CHECK_20260909.md. Không triển khai trực tiếp chỉ dựa vào kết quả kiểm thử SQL cục bộ.

## Sửa các tình huống thực tế sau review

- Chốt sổ kiểm tra từng học sinh theo ngày học. Chưa điểm danh khác với vắng mặt; không tự chuyển trạng thái để đủ điều kiện chốt.
- Với lớp cũ, buổi trước mốc quan sát cấu hình cần admin xác minh **toàn bộ danh sách** trước khi chốt. Không suy ra lịch sử từ danh sách đang học hoặc giá hiện tại.
- Admin vào chi tiết lớp → Lịch sử buổi học → **Đối soát điểm danh**: đối chiếu danh sách, ghi nguồn/căn cứ, lưu xác minh; xác minh phí còn thiếu; chọn có mặt/vắng mặt và lưu điểm danh. Mỗi bước lưu độc lập, có thông báo thành công hoặc lỗi. Việc xác minh phí không đồng nghĩa xác nhận học sinh đã học.
- Học sinh nghỉ vẫn xuất hiện ở các buổi thuộc lượt tham gia trước đó. Lượt tham gia dùng ngày, bao gồm cả ngày bắt đầu/ngày nghỉ; chưa phân biệt thời điểm trong cùng ngày. Học sinh nhập học sau ngày học không tự xuất hiện ở buổi cũ.
- Gia sư và admin đọc chuyên cần đã đính chính. Thống kê phụ huynh đọc cùng trạng thái hiệu lực; bản gốc và các lần đính chính được giữ lại.
- Tạo lớp trả đúng định danh cho màn hình chuyển đến chi tiết. Nhật ký lượt tham gia chỉ ghi một lần; đổi tên và học sinh nghỉ hiển thị trong lịch sử quản lý lớp.
- Gỡ nút xóa lớp; yêu cầu xóa từ app cũ cũng bị từ chối có thông báo rõ. Dùng lưu trữ để giữ các liên kết và cấu hình đã ghi.

Không sửa hồi tố các kỳ legacy: trường hợp đã chốt nhưng thiếu học sinh/chứng từ vẫn phải đối soát riêng có căn cứ và quyết định nghiệp vụ. Gói này ngăn chốt thiếu ở các kỳ mới; không tạo giả một dòng vắng mặt trong kỳ cũ để điều chỉnh tiền. Chỉ chạy toàn bộ upgrade một transaction, không dừng ở migration 06 (kiểm soát danh sách cần migration 07).

## Kết quả xác nhận sau sửa review — 09/09/2026

- 175/175 kiểm thử đạt, không bỏ qua ca nào. Gồm các ca tái hiện lỗi review, quyền dữ liệu, tải giao diện bất đồng bộ, nâng cấp giữ nguyên dữ liệu và PostgreSQL 17 đồng thời/khôi phục bản sao tạm.
- TypeScript đạt; build production Next.js đạt. ESLint: 0 lỗi, 18 cảnh báo hiện có.
- Gói upgrade và master đã được dựng lại từ migration nguồn. Chưa chạy trên Supabase, chưa commit/push/deploy.
- Còn cần kiểm thử Supabase Data API và giao diện trên staging trước khi triển khai production; kiểm thử cục bộ không thay thế bước này.

## Cập nhật sau áp dụng SQL

Supabase đã được người dùng nâng cấp và đã kiểm tra chỉ đọc ngày 09/09/2026. Chi tiết, giới hạn xác minh và các buổi cần đối soát nằm trong [báo cáo hậu nâng cấp](POST_UPGRADE_CHECK_20260909.md). Không chạy lại gói upgrade đã áp dụng.
