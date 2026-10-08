# Database: đọc và thay đổi đúng phiên bản

## Migration là gì?

Migration là bản SQL thay đổi cấu trúc, quyền/RPC hoặc dữ liệu có kiểm soát. Deploy Next.js lên Vercel **không tự chạy migration**. Nguồn thứ tự/phụ thuộc là file SQL trong `migrations/`; trạng thái môi trường lấy từ registry và kiểm chứng thực tế, không lấy số file lớn nhất.

```sql
SELECT version FROM csat_internal.schema_migrations ORDER BY version;
```

Registry bắt đầu từ 05; thiếu dòng 01–04 không có nghĩa phải chạy lại. Tại lần xác minh 08/10/2026 có 05–17, 20 và 23, còn thiếu 18/19/21/22. Phải đọc lại trạng thái trước lần thao tác mới.

## Bản đồ các nhóm migration

| Phiên bản | Trách nhiệm |
|---|---|
| 01–04 | Quyền, tài khoản/lookup phụ huynh, nhận xét/tag |
| 05–10 | Giữ lịch sử, chốt sổ atomic, workflow lớp, read models/báo cáo, đồng bộ schema |
| 11–15 | Cổng học tập, template, workflow tháng, import phụ huynh, lịch sử nhận xét |
| 16–17 | Chuẩn hóa số điện thoại và chương trình mặc định khi tạo lớp |
| 18 | Yêu cầu tư vấn + outbox |
| 19 | Vận hành email và reconcile |
| 20 | Khung A/B/C/D đã duyệt, snapshot và chuyển các lớp hiện có |
| 21 | Hoàn thiện email + phí từng buổi trong JSON phụ huynh; còn MAIL-01/02 |
| 22 | Hồ sơ/avatar gia sư, revision, quyền, audit, JSON phụ huynh |
| 23 | Aggregate số buổi completed của lớp cho chỉ báo chặng phụ huynh; đã áp production 08/10/2026 |

20 chỉ phụ thuộc 17, nên có thể có 20 trong khi 18/19 chưa áp dụng. 21 cần 19 và 20; 22 cần 21; 23 chỉ cần 20 và bảo toàn các trường 21/22 nếu có. Có thể phát hành 23 độc lập; kiểm thử xác nhận 21/22 áp sau vẫn giữ aggregate. Với trạng thái hiện tại, phần email/hồ sơ còn lại là **18 → 19 → 21 → 22**, bỏ qua 20/23 và xác minh lại trước thao tác. Không chỉnh migration đã phát hành; sửa bằng migration mới sau số cuối thực tế.

## Khởi tạo database thử mới

Dùng project Supabase thử **trống**, có schema Auth và roles chuẩn. Không chạy trên production hoặc project chứa dữ liệu cần giữ.

1. Đọc `CSAT_master_schema.sql`: hiện là baseline tổng hợp **đến 10**, không phải schema mới nhất đến 23.
2. Chạy baseline một lần trên project trống; kiểm tra registry 05–10. Không chạy lại 01–10 sau đó.
3. Áp dụng lần lượt 11–23, xem precondition đầu từng file và verification tương ứng. `upgrade-learning-portal.sql` là gói lịch sử 11–15; chỉ chọn gói hoặc từng file, không cả hai. Migration 23 được kiểm chứng bằng `tests/parent-class-progress.test.cjs` trên database thử.
4. Tạo tài khoản và fixture giả qua luồng được phép; không seed dump production. Bucket avatar/policy là bước Supabase Storage riêng sau 22.
5. Kiểm tra API/RLS theo vai trò và UI. Bộ test cục bộ có Auth helper giả, không thay thế Supabase thật.

`build-master.cjs` chỉ dựng lại baseline 05–10 từ fixture/migration lịch sử; `build-learning-upgrade.cjs` dựng gói 11–15. Không dùng chúng để tuyên bố master đã chứa các migration mới; không chạy generator rồi commit diff ngoài phạm vi.

## Kiểm chứng và maintenance

- `verification/`: đọc từng file trước khi chạy. Phần lớn là SQL kiểm tra; **`20260923_tutor_avatar_storage_setup.sql` có ghi**, tạo bucket và policy, cần cho phép đúng môi trường.
- `maintenance/20260923_student_phone_fallback.sql`: thao tác dữ liệu một lần đã dùng, có guard/audit; không phải chính sách tự copy số cho hồ sơ mới và không chạy mặc định khi onboarding.
- `tests/`: dữ liệu giả + kiểm tra quyền/bảo toàn/concurrency. Giữ fixture cũ vì kiểm tra nâng cấp, không xóa vì trông giống schema trùng.
- `upgrade-*.sql`, baseline, seed/tag cũ: có vai trò kiểm thử/khởi tạo/lịch sử; không xóa trước khi xác minh mọi nơi tham chiếu.

Backup, kết quả đối soát có ID/PII, ảnh Storage thật nằm ngoài Git. Backup ứng dụng `public`/`csat_internal` không phải backup đầy đủ Auth/Storage. Không restore đè lên production đang có dữ liệu phát sinh; dùng thay đổi bù được kiểm chứng.

Setup/rollout: [Vercel–Supabase](../docs/SETUP_VERCEL_SUPABASE.md). Hiện trạng/backlog: [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md).
