# Database: đọc và thay đổi đúng phiên bản

## Google, grants và reset

Migration30–32 gồm Google/phone claim một–một, contact/student atomic, certificates, tutor receipts và OJ accounts. [Runbook chuyển đổi/reset](../docs/PORTAL_GOOGLE_GRANTS_ROLLOUT.md). Đã áp19/21/22/29/30/31/32 trên Supabase hiện tại ngày03/11 sau backup/phục hồi và rehearsal; registry27 phiên bản, mới nhất32. Kiểm lại04/11 đạt; ứng dụng tương thích đã deploy, nghiệm thu phiên/Storage/OJ thật còn chờ. Không chạy lại các migration này hoặc26 để triển khai Google. Migration28 cũ được giữ lịch sử,32 thu hồi RPC bindings nếu có.

Quyết định04/11 thay phạm vi03/11: dùng `scripts/portal-reinitialize.cjs` cho đợt một lần đã được phép, giữ Auth/tutors/hồ sơ/Storage/intake/lịch sử/catalog/registry/audit, xóa lớp/học sinh/phụ huynh/liên kết/phát sinh rồi nhập lớp mẫu. Đã backup/phục hồi90 bảng, diễn tập reset+import và thực hiện trên Supabase hiện tại; không chạy lại. `portal-activity-reset.cjs` vẫn là công cụ riêng chỉ xóa phát sinh/giữ lớp; `portal-reset.cjs --apply` cũ tiếp tục bị chặn. [Phạm vi và kiểm chứng](../docs/DATABASE_REINITIALIZATION_20261104.md).

## Migration là gì?

Migration đăng nhập [29](migrations/20261024_29_login_identity_budget.sql) nâng budget định danh từ 10 lên 20 trong 15 phút, giữ nguồn 50 và bộ đếm/phiên hiện có. Phụ thuộc 27, độc lập OJ 28 (có thể áp trước hoặc sau 28); đã áp Supabase hiện tại03/11. Chỉ thay `consume_auth_attempt`, giữ chữ ký và quyền service role. Kiểm thử `login-identity-budget.test.cjs` và PostgreSQL native kiểm biên, bảo toàn bộ đếm và tranh chấp lượt 20.

Migration là bản SQL thay đổi cấu trúc, quyền/RPC hoặc dữ liệu có kiểm soát. Deploy Next.js lên Vercel **không tự chạy migration**. Nguồn thứ tự/phụ thuộc là file SQL trong `migrations/`; trạng thái môi trường lấy từ registry và kiểm chứng thực tế, không lấy số file lớn nhất.

```sql
SELECT version FROM csat_internal.schema_migrations ORDER BY version;
```

Registry bắt đầu từ 05; thiếu dòng 01–04 không có nghĩa phải chạy lại. Dùng `csat_internal.schema_migrations`, không giả định bảng `supabase_migrations.schema_migrations` của CLI tồn tại. Bằng chứng production ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md); kiểm tra lại registry, cấu trúc và quyền trước thao tác, không chạy lại migration đã có.

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
| 23 | Aggregate số buổi completed của lớp cho chỉ báo chặng phụ huynh; cần 20 |
| 24 | Đăng ký intake v2 không tạo outbox/email; lịch sử trạng thái có revision; cần 18 |
| 25 | Mã A/B/AB/C/E/PREVOI/K, lịch sử phân loại; giữ tên/giáo án/học phí; cần 23 |
| 26 | Nền Auth phụ huynh/rate limit/provisioning lịch sử; cần 23; luồng Auth được 27 thay thế |
| 27 | Tra cứu phụ huynh bằng số, thu hồi lookup/RPC Auth cũ, chống spam chung với staff; cần 26. [Runbook](../docs/PARENT_PHONE_ACCESS.md) |
| 28 | OJ metadata/bindings cũ, cần27; chưa chứa grant exchange mới |
| 29 | Nâng budget định danh login, cần27; độc lập28 |
| 30 | Google parent identity một–một, contact/student RPC, revision/audit, retire lookup; cần29 |
| 31 | Certificates và tutor receipts; cần22 và30 |
| 32 | OJ accounts/grants, operation/receipt, quota, server context; cần31 |

20 chỉ phụ thuộc 17, nên có thể có 20 trong khi 18/19 chưa áp dụng. 21 cần 19 và 20; 22 cần 21; 23 chỉ cần 20 và bảo toàn các trường 21/22 nếu có. Có thể phát hành 23 độc lập; kiểm thử xác nhận 21/22 áp sau vẫn giữ aggregate. Dependency hồ sơ là **19 →21 →22** (cần18/20 theo precondition); chuỗi này đã có trong registry hiện tại, không chạy lại. Xác minh registry trước mọi thao tác. Không chỉnh migration đã phát hành; sửa bằng migration mới sau số cuối thực tế. Migration26 đã áp cùng RLS, mọi sửa đổi tiếp theo dùng migration mới.

## Khởi tạo database thử mới

Dùng project Supabase thử **trống**, có schema Auth và roles chuẩn. Không chạy trên production hoặc project chứa dữ liệu cần giữ.

1. Đọc `CSAT_master_schema.sql`: hiện là baseline tổng hợp **đến 10**, không phải schema mới nhất đến 27.
2. Chạy baseline một lần trên project trống; kiểm tra registry 05–10. Không chạy lại 01–10 sau đó.
3. Áp dụng11–27 rồi29 theo precondition/verification để dựng hệ thống hiện hành; chỉ thêm28 khi cần kiểm adapter OJ cũ. Nếu kiểm toàn bộ schema repo thì chuỗi11–29 gồm cả28. `upgrade-learning-portal.sql` là gói lịch sử11–15; chỉ chọn gói hoặc từng file, không cả hai. Kiểm cả chuỗi đầy đủ và chuỗi tối thiểu theo registry đích. Auth mock không thay nghiệm thu Supabase thật; Áp30–32 để kiểm Google/grants mới; cần22 trước31.
4. Tạo tài khoản và fixture giả qua luồng được phép; không seed dump production. Bucket avatar/policy là bước Supabase Storage riêng sau 22.
5. Kiểm tra API/RLS theo vai trò và UI. Bộ test cục bộ có Auth helper giả, không thay thế Supabase thật.

`build-master.cjs` chỉ dựng lại baseline 05–10 từ fixture/migration lịch sử; `build-learning-upgrade.cjs` dựng gói 11–15. Không dùng chúng để tuyên bố master đã chứa các migration mới; không chạy generator rồi commit diff ngoài phạm vi.

## Kiểm chứng và maintenance

Ba luồng backend hiện có dùng **18 → 24**, **23 → 25**, **23 → 26 → 27**; không cần 19/21/22. Nếu chạy các migration email/hồ sơ cũ sau24–27, kiểm chứng lại quyền/projection trên schema kết hợp trước. [Runbook lookup](../docs/PARENT_PHONE_ACCESS.md) mô tả cửa sổ chuyển đổi27 → ứng dụng, không cấp lại Auth theo provisioning mật khẩu26. Google dùng30–32, cần nghiệm thu môi trường thật riêng. Hiện chưa có staging Supabase; nghiệm thu thật còn chờ. Người dùng tự chạy SQL production, không chạy từ task xây dựng mã.

[Preflight](verification/20261012_backend_preflight.sql) và [postflight](verification/20261012_backend_postflight.sql) đều READ ONLY, trả aggregate/grants/digest, không PII. Lưu kết quả nội bộ; chạy lại preflight sau thay đổi schema để đối chiếu digest lịch sử/nháp/công bố/tài chính. Digest classes bỏ cột program mới, parent_accounts bỏ auth_uid; các phần còn lại phải giữ nguyên khi không có ghi nghiệp vụ. Postflight backend mô tả hợp đồng tại migration 26, không dùng nguyên kỳ vọng Auth cũ để kết luận 27 lỗi. Sau 27 dùng thêm [verification hiện hành](verification/20261014_parent_phone_access.sql) cho quyền RPC/phiên lookup; provisioning Auth đã ngừng. Giữ kiểm chứng không có outbox từ đơn mới và digest bảo toàn. Không dùng SQL kiểm tra để cấp user hoặc sửa hồ sơ.

- `verification/`: đọc từng file trước khi chạy. Phần lớn là SQL kiểm tra; **`20260923_tutor_avatar_storage_setup.sql` có ghi**, tạo bucket và policy, cần cho phép đúng môi trường.
- `maintenance/20260923_student_phone_fallback.sql`: thao tác dữ liệu một lần đã dùng, có guard/audit; không phải chính sách tự copy số cho hồ sơ mới và không chạy mặc định khi onboarding.
- `tests/`: dữ liệu giả + kiểm tra quyền/bảo toàn/concurrency. Giữ fixture cũ vì kiểm tra nâng cấp, không xóa vì trông giống schema trùng.
- `upgrade-*.sql`, baseline, seed/tag cũ: có vai trò kiểm thử/khởi tạo/lịch sử; không xóa trước khi xác minh mọi nơi tham chiếu.

Backup, kết quả đối soát có ID/PII, ảnh Storage thật nằm ngoài Git. Backup ứng dụng `public`/`csat_internal` không phải backup đầy đủ Auth/Storage. Không restore đè lên production đang có dữ liệu phát sinh; dùng thay đổi bù được kiểm chứng.

Setup/rollout: [Vercel–Supabase](../docs/SETUP_VERCEL_SUPABASE.md). Hiện trạng/backlog: [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md).
