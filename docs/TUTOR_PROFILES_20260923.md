# Hồ sơ và avatar gia sư — phát hành 23/09/2026

## Nội dung và vận hành

Gia sư hoạt động sửa hồ sơ của mình tại `/tutor/profile`. Admin sửa tại `/admin/tutors/[id]`. Lưu thành công công bố ngay, không có luồng duyệt. Phụ huynh thấy bản mới khi tải lại trang. Thông tin nền mặc định: “Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu”; chỉ admin thay đổi ngoại lệ, kể cả để trống để ẩn. Tên giữ nguồn `tutors.name` và quy trình admin hiện có.

Giới thiệu dùng lại trường `introduction`, tối đa 2.000 ký tự, khuyến nghị 2–4 câu khoảng 300–600 ký tự. Ngành học/trường đại học tối đa 200 ký tự mỗi trường. Thành tích tối đa 2.000 ký tự, mỗi dòng một mục. Mục trống không xuất hiện trước phụ huynh. Thẻ gộp theo tutor_id, liệt kê các lớp của con; không lấy email/số điện thoại riêng.

Khi có xung đột, form giữ nội dung nhập và khóa Lưu. Chọn “Tải bản đã lưu để đối chiếu”, sau đó chọn bản đã lưu hoặc giữ nội dung nhập để lưu theo phiên bản mới. Đây là quyết định chủ động của người dùng; không tự ghi đè.

## Database và Storage

Migration `20260923_22_tutor_profiles.sql` sau 21; không sửa migration cũ. Mở rộng tutor_public_profiles, RPC save_tutor_profile kiểm tra ownership/background/revision, giữ audit_business_write, mở rộng JSON parent_learning_portal nhưng giữ chữ ký. Đường ghi profile cũ của admin_learning_settings bị chặn để tránh bỏ qua revision.

`tutor_avatar_assets` lưu trạng thái pending → ready → attached → retired → deleting. Bản ghi được tạo trước upload. Nếu kết quả lưu RPC không chắc chắn, tuyệt đối không xóa ảnh vừa tải: có thể database đã commit. Tệp chưa gắn quá 24 giờ được công cụ cleanup xử lý qua RPC claim; trạng thái deleting không được gắn lại. Ảnh đang được hồ sơ tham chiếu luôn bị loại khỏi cleanup. Khi đổi/gỡ ảnh thành công, ứng dụng thử dọn ảnh retired ngay. Lỗi Storage hoặc xóa registry để lại việc dọn cho lần sau.

Bucket `tutor-avatars` public, chỉ lưu WebP đã xử lý, tối đa 204.800 byte/tệp. Input JPG/PNG/WebP tối đa 3 MiB, 20 megapixel; máy chủ kiểm tra format thật, từ chối ảnh động, tự xoay, cắt giữa 512 × 512 và bỏ metadata. Thêm sharp 0.34.5 là dependency trực tiếp. Public URL có tên ngẫu nhiên và cache dài; thay ảnh tạo URL mới. Người đã tải ảnh có thể giữ bản sao sau khi gỡ. Không dùng dịch vụ biến đổi ảnh trả phí của Supabase.

## Chuẩn bị phát hành — chưa thực hiện production

1. Kiểm tra migration thực tế và usage Supabase Storage/egress. Sao lưu theo runbook hiện tại, có bản sao tệp Storage riêng khi đã sử dụng (backup database không chứa byte ảnh).
2. Trên môi trường thử được phép, áp dụng các migration còn thiếu theo thứ tự đến 22; chạy `database/verification/20260923_tutor_profiles.sql`. invalid_avatar_links phải bằng 0; anon_may_write và authenticated_may_cleanup phải false.
3. Chạy riêng `database/verification/20260923_tutor_avatar_storage_setup.sql` trên Supabase thử. File này CÓ THAY ĐỔI: tạo bucket và restrictive policies chặn ghi trực tiếp từ anon/authenticated, không đổi quyền bucket khác. Nếu bucket đã có cấu hình khác, script dừng để đối chiếu. Không đưa script này vào migration PostgreSQL thường vì môi trường test không có Storage.
4. Cấu hình Vercel đúng môi trường: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY và SUPABASE_SERVICE_ROLE_KEY. Service key chỉ ở máy chủ. Không thêm secret mới, không cần Resend hoặc cron. Tuyệt đối không dùng database/bucket production cho Preview kiểm thử ghi.
5. Deploy thử, tải một ảnh giả qua form; kiểm tra tệp thực đúng WebP 512 × 512, public URL tải được, anon/tutor không upload trực tiếp được, tutor không sửa người khác được. Thử thay/gỡ ảnh và lỗi lưu; kiểm tra registry và cleanup trên dữ liệu giả. Xóa dữ liệu thử bằng luồng quản trị được phép.
6. Trình kết quả trước khi xin phép migration, bucket và deploy production. Deploy sau migration; client cũ đọc các trường cũ vẫn tương thích. Nếu cần rollback app, giữ migration và bucket; chức năng profile cũ sẽ yêu cầu mở giao diện mới, không phục hồi đường ghi không kiểm tra phiên bản.

## Dọn tệp theo yêu cầu

Cấp biến môi trường bằng công cụ quản lý secret hiện có, không đưa khóa lên dòng lệnh/log. Script mặc định chỉ đọc:

```sh
node scripts/tutor-avatar-cleanup.cjs
```

Sau khi xem số lượng và được phép trên môi trường đích:

```sh
node scripts/tutor-avatar-cleanup.cjs --apply --project=<hostname-Supabase-chính-xác>
```

Mỗi lượt tối đa 500 tệp, chỉ ghi số lượng tổng hợp. Nếu còn nhiều tệp, chạy lại. Dùng Storage API để xóa byte ảnh, không xóa trực tiếp storage.objects. Không thêm lịch cron.

## Kiểm thử

- `node --test database/tests/*.test.cjs`: migration, quyền, history, ảnh, lỗi API, concurrency và backup/restore PostgreSQL.
- `node scripts/run-tutor-profile-ui.cjs`: Next.js localhost, fake auth/business/Storage, không gọi production. Chạy khi không có next dev của workspace khác đang dùng .next/dev.
- TypeScript, lint và production build.
- Ảnh QA: `scratch/tutor-profile-qa/` (ngoài Git).

Nghiệm thu Storage thực cần môi trường Supabase thử và quyền tạo bucket/upload. Kiểm thử giả lập không thay thế bước đó.

## Kết quả nghiệm thu local 23/09/2026

- Hồi quy cuối: 253/253 pass, 0 fail, 0 skipped; log `scratch/tutor-profile-regression-final.log`.
- PostgreSQL 17: kiểm tra ghi hồ sơ đồng thời, chuỗi migration đến 22 và backup/restore database tách biệt.
- TypeScript `--noEmit --incremental false`: pass. Lint toàn dự án: 0 lỗi, 18 cảnh báo; lint riêng mã hồ sơ mới: sạch.
- Production build: pass, 51 trang được tạo; cấu hình Supabase giả localhost, email tắt. Log `scratch/tutor-profile-build.log`.
- Browser QA: pass cho gia sư/admin/phụ huynh, xung đột phiên bản, avatar, gộp lớp, 375/768/1440px, dark mode, bản in A4, bàn phím, ảnh lỗi và mục trống. Ảnh QA đã được xem trực tiếp. Đã sửa nhãn textarea và fallback ảnh bị lỗi trước hydration.
- Chưa nghiệm thu Supabase Storage thật: chưa có môi trường thử riêng được cấu hình và cấp quyền. Chưa áp dụng migration/bucket production, chưa deploy, chưa gửi email.
