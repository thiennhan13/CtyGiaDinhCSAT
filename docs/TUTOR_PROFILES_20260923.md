# Hồ sơ và avatar gia sư

Gói18 hồ sơ/ảnh do chủ trung tâm cung cấp đã được chuẩn bị ngoài Git ngày03/11/2026, chưa ghi DB/Storage. Có10 mapping chắc chắn. Chủ trung tâm xác nhận7 gia sư mới và yêu cầu chưa nhập tài khoản chưa khớp:8 hồ sơ còn lại giữ chờ admin, không tạo Auth hoặc đổi tutor ID/email. [Hướng dẫn nhập và phát hành từng bước](PORTAL_DEPLOYMENT_STEP_BY_STEP.md), bước8. Giới thiệu không có trong nguồn được để trống; liên hệ riêng và ghi chú nguồn không xuất hiện trên thẻ phụ huynh.

## Nội dung và vận hành

Migration31 bổ sung `certificates` vào profile/RPC/API/form/admin/gia sư/JSON parent/thẻ; giữ chứng chỉ khi client cũ không gửi trường. Thành tích và chứng chỉ nhiều dòng, mỗi dòng một mục, tối đa2.000 ký tự; đại học200; giới thiệu2.000. Không upload bằng/chứng chỉ. Thông tin nền chỉ admin sửa; trống được ẩn.

Reset đã chốt giữ nguyên Auth, tutor ID/hồ sơ/registry avatar và Storage. Không nhập lại hoặc tạo trùng gia sư. [Runbook](PORTAL_GOOGLE_GRANTS_ROLLOUT.md). Chưa nghiệm thu upload/thay/gỡ ảnh trên Supabase thử thật.

Gia sư hoạt động sửa hồ sơ của mình tại `/tutor/profile`. Admin sửa tại `/admin/tutors/[id]`. Lưu thành công công bố ngay, không có luồng duyệt. Phụ huynh thấy bản mới khi tải lại trang. Thông tin nền mặc định: “Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu”; chỉ admin thay đổi ngoại lệ, kể cả để trống để ẩn. Tên giữ nguồn `tutors.name` và quy trình admin hiện có.

Giới thiệu dùng lại trường `introduction`, tối đa 2.000 ký tự, khuyến nghị 2–4 câu khoảng 300–600 ký tự. Ngành học/trường đại học tối đa 200 ký tự mỗi trường. Thành tích tối đa 2.000 ký tự, mỗi dòng một mục. Mục trống không xuất hiện trước phụ huynh. Thẻ gộp theo tutor_id, liệt kê các lớp của con; không lấy email/số điện thoại riêng.

Khi có xung đột, form giữ nội dung nhập và khóa Lưu. Chọn “Tải bản đã lưu để đối chiếu”, sau đó chọn bản đã lưu hoặc giữ nội dung nhập để lưu theo phiên bản mới. Đây là quyết định chủ động của người dùng; không tự ghi đè.

## Database và Storage

Schema22/31 đã áp trên Supabase hiện tại03/11 cùng dependency19/21/29/30/32; certificates và RPC đã kiểm quyền. Mã tương thích đã deploy04/11. Chưa tạo bucket/policy avatar, chưa nhập hồ sơ; Storage thật chưa nghiệm thu. Không chạy lại migration đã có; Storage setup là thao tác riêng.

Migration `20260923_22_tutor_profiles.sql` sau 21; không sửa migration cũ. Mở rộng tutor_public_profiles, RPC save_tutor_profile kiểm tra ownership/background/revision, giữ audit_business_write, mở rộng JSON parent_learning_portal nhưng giữ chữ ký. Đường ghi profile cũ của admin_learning_settings bị chặn để tránh bỏ qua revision.

`tutor_avatar_assets` lưu trạng thái pending → ready → attached → retired → deleting. Bản ghi được tạo trước upload. Nếu kết quả lưu RPC không chắc chắn, tuyệt đối không xóa ảnh vừa tải: có thể database đã commit. Tệp chưa gắn quá 24 giờ được công cụ cleanup xử lý qua RPC claim; trạng thái deleting không được gắn lại. Ảnh đang được hồ sơ tham chiếu luôn bị loại khỏi cleanup. Khi đổi/gỡ ảnh thành công, ứng dụng thử dọn ảnh retired ngay. Lỗi Storage hoặc xóa registry để lại việc dọn cho lần sau.

Bucket `tutor-avatars` public, chỉ lưu WebP đã xử lý, tối đa 204.800 byte/tệp. Input JPG/PNG/WebP tối đa 3 MiB, 20 megapixel; máy chủ kiểm tra format thật, từ chối ảnh động, tự xoay, cắt giữa 512 × 512 và bỏ metadata. Ảnh được xử lý bằng Sharp; phiên bản được khóa trong package.json/lockfile. Public URL có tên ngẫu nhiên và cache dài; thay ảnh tạo URL mới. Người đã tải ảnh có thể giữ bản sao sau khi gỡ. Không dùng dịch vụ biến đổi ảnh trả phí của Supabase.

## Chuẩn bị phát hành — chưa thực hiện production

1. Kiểm tra migration thực tế và usage Supabase Storage/egress. Sao lưu theo runbook hiện tại, có bản sao tệp Storage riêng khi đã sử dụng (backup database không chứa byte ảnh).
2. Trên môi trường thử được phép, áp dụng các migration còn thiếu theo phụ thuộc 19 → 21 → 22 và kiểm tương thích với 23–27 nếu đã có; chạy `database/verification/20260923_tutor_profiles.sql`. invalid_avatar_links phải bằng 0; anon_may_write và authenticated_may_cleanup phải false.
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

## Trạng thái

Mã và fixture có sẵn; Supabase Storage thật, schema/bucket production còn chờ theo [PROJECT_STATUS](PROJECT_STATUS.md). Kiểm thử giả lập không chứng minh upload thật hoặc khả năng phục hồi; không bật luồng này chỉ vì build đạt.
