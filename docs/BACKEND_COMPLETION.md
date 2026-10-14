# Bàn giao ba luồng backend

Phạm vi mã hiện tại: tiếp nhận đăng ký public, phân loại chương trình lớp và tài khoản phụ huynh bằng số điện thoại/mật khẩu. Kiểm chứng local đã đạt theo bảng cuối tài liệu; **chưa nghiệm thu end-to-end staging/production** vì chưa có project Supabase staging. Người dùng đã tự chạy SQL 18/24/25/26; theo ủy quyền tiếp theo đã cấp 44 Auth parent và đối soát production ngày 14/10/2026. Ứng dụng backend mới chưa deploy.

## Hợp đồng đã triển khai trong mã

| Luồng | Hành vi và ranh giới |
|---|---|
| Đăng ký | `PublicConsultation` → `/api/consultations` → `submit_registration` (24). Schema v2 có consent, source path và lựa chọn khóa; validate phía API/RPC, giới hạn body, Origin, honeypot, rate limit và idempotency. Lưu `consultation_requests`; đơn mới không tạo outbox hoặc gửi email. Admin đọc đơn cũ/mới, đổi trạng thái bằng revision và `consultation_status_history`. Học liệu vẫn là luồng xem lại/sao chép/liên hệ hiện có. |
| Chương trình | `classes.program_code`: A/B/AB/C/E/PREVOI/K; AB hiển thị A+B. `program_revision`, RPC `admin_set_class_program` và `class_program_history` bảo vệ thay đổi admin. Mapping chỉ dựa loại lớp nhận diện rõ; trường chưa nhận diện giữ null để admin đối soát. Không đổi tên lớp, giáo án cũ, giá hoặc lịch sử. |
| Phụ huynh | Supabase Auth phone/password, role parent và liên kết `parent_accounts.auth_uid`. Phiên Portal 12 giờ gắn Auth user/session; kiểm tra Auth, cookie hash, phiên DB và parent–student links. Đổi mật khẩu tự chọn tại `/parents/account`, cần mật khẩu hiện tại; thành công thu hồi phiên và yêu cầu đăng nhập lại. Admin/gia sư dùng API login riêng, role được kiểm tra máy chủ. |

A/B/AB dùng basic với phần tương ứng, C dùng advanced C+D; giữ C01–D07/scope CD. PREVOI (PreVOI/HSGQG/Ôn thi VOI) dùng chương trình `voi` và giáo án riêng, **không dùng E**. E và K dùng `custom`; chưa có giáo trình E hoặc cơ chế K phối nguồn chéo chương trình được duyệt. Đổi nhãn chương trình không thay nội dung giáo án đã công bố. Lớp mới tiếp tục theo luồng nháp/công bố của RPC, không tạo nội dung đào tạo giả.

## Cấp tài khoản có đối soát

Màn hình `/admin/parents/provisioning` chỉ dành admin, dùng `parent_auth_candidates` để xem hồ sơ cần bổ sung/xử lý. Chỉ xét học sinh chưa xóa, trạng thái Đang học, tham gia active trong lớp active. Số điện thoại/tên phụ huynh, tài khoản parent active và liên kết phải hợp lệ; xung đột tên, thiếu liên hệ hoặc thiếu liên kết chuyển đối soát. Không tự ghép người bằng tên hay lấy số học sinh thay số phụ huynh.

Chạy Node.js 24 với biến môi trường cấp riêng qua kho secret: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Script không tự nạp `.env` production, chỉ in tổng hợp, dry-run mặc định:

```sh
node scripts/provision-parent-accounts.cjs
node scripts/provision-parent-accounts.cjs --apply --project-ref=PROJECT_REF_DA_DOI_CHIEU
```

Chỉ lệnh thứ hai có ghi. Trước apply, cấp `CSAT_PARENT_INITIAL_PASSWORD` qua môi trường tiến trình từ kho secret; mật khẩu ban đầu do chủ trung tâm lựa chọn, không viết giá trị vào repo, lệnh lịch sử, log hoặc chat. Đây là secret của công cụ vận hành, không cần đưa vào biến frontend/deployment. Script yêu cầu ít nhất 10 ký tự. `--project-ref` phải khớp hostname project; cờ xác nhận project không thay quyền thao tác thật.

Retry bỏ qua tài khoản đã liên kết. Nếu Auth user đã được tạo nhưng link DB chưa thành công, chỉ nhận lại khi phone, role và `csat_parent_id` khớp; không reset mật khẩu, xóa user hoặc nhận tài khoản không rõ nguồn. RPC link kiểm tra lại điều kiện sau Auth API để tránh cấp quyền theo roster đã thay đổi. Ghi nhận tổng hợp `alreadyLinked/created/recovered/failed/review`; xử lý hồ sơ trong admin, không xuất PII vào Git/CI.

**SEC-02 chưa hoàn tất:** mật khẩu khởi tạo dùng chung và đổi mật khẩu tùy chọn không chứng minh sở hữu số điện thoại. `phone_confirm` do quản trị cấp không phải bằng chứng OTP. Cần quy trình bàn giao thông tin đăng nhập an toàn và nghiệm thu xác minh danh tính riêng. SEC-01 mật khẩu gia sư, MAIL-01/02, CSATOJ, avatar và backup/restore vẫn là backlog.

API đổi mật khẩu tự xác minh mật khẩu cũ bằng một Supabase anon client độc lập, đóng phiên xác minh, rồi mới `updateUser`; không dựa riêng vào trường `current_password` vì xử lý trường này phụ thuộc cấu hình provider. Khuyến nghị bật yêu cầu mật khẩu hiện tại tại provider và nghiệm thu trên Supabase staging thật: sai mật khẩu cũ bị từ chối, lỗi đóng phiên không tiếp tục, đổi thành công thu hồi mọi phiên Portal/Auth, cookie cũ không đọc được.

## Phụ thuộc và chuyển đổi

Đối chiếu production ngày **14/10/2026** xác nhận registry 05–18, 20, 23–26; còn thiếu 19/21/22 thuộc backlog email/hồ sơ. Sáu thân hàm mới/thay thế của 24/25 khớp mã local; postflight sau 26 đạt quyền/RLS và liên kết Auth. Không chạy lại 18/20/23/24/25/26. Chuỗi tối thiểu của ba luồng **18 → 24**, **23 → 25**, **23 → 26** đã đủ. Nếu bổ sung 19/21/22 sau, phải kiểm thử lại projection và quyền trên schema kết hợp.

Migration26 đã phát hành với RLS trên `csat_internal.auth_attempts` và `csat_internal.parent_auth_provisioning`, không có policy cho client. Giữ REVOKE quyền bảng/schema và giới hạn EXECUTE của RPC; RLS là lớp bổ sung, không thay kiểm tra quyền trong hàm SECURITY DEFINER hoặc API service-role. Postflight kiểm tra cả RLS và quyền bảng nội bộ. Không sửa lại migration26; dùng migration mới nếu cần điều chỉnh.

Kiểm chứng bản RLS mới trên Node24: 6/6 database, 22/22 API/provisioning và 1/1 PostgreSQL17 native/concurrency/restore (fixture giả) đạt; guard/diff check đạt. Không chạy lại build/browser/typecheck cho thay đổi SQL/test/docs này. Supabase Auth thật vẫn chờ môi trường thử.

**Migration 26 thu hồi toàn bộ lookup session cũ và đóng `start_parent_lookup` ngay khi commit.** Ứng dụng cũ không còn đăng nhập phụ huynh được. Không chạy schema rồi để đó chờ một đợt deploy khác.

1. Chuẩn bị staging Supabase riêng, fixture giả, runtime Node24, app tương thích và kế hoạch bảo trì. Nghiệm thu Auth phone/password thật, cấp tài khoản/retry, thu hồi phiên, quyền các vai trò và ba luồng end-to-end. Hiện bước này còn chờ môi trường.
2. Chủ vận hành xác nhận project, quyền, cửa sổ bảo trì và backup có restore thử; backup cần bao phủ Auth cùng database và Storage nếu có, không chỉ public. Lưu bằng chứng nội bộ.
3. Chạy [preflight](../database/verification/20261012_backend_preflight.sql) bằng kết nối SQL đủ quyền, chỉ đọc. Giữ kết quả aggregate/digest để đối chiếu; xác nhận email vẫn tắt và lịch sử/giáo án. Dừng nếu registry/grants/cấu trúc khác dự kiến.
4. Trong bảo trì, người dùng áp từng migration còn thiếu 18, 24, 25, 26 theo phụ thuộc. Chạy [postflight](../database/verification/20261012_backend_postflight.sql) ngay sau schema, trước dữ liệu QA/cấp tài khoản.
5. Chạy provisioning dry-run; chỉ apply tài khoản hợp lệ đã đối soát, đúng project và quyền. Hồ sơ còn lỗi giữ chờ; trang `/admin/parents/provisioning` có trong ứng dụng mới sau bước deploy để admin tiếp tục đối soát, không xuất hồ sơ thật sang Preview. Chạy lại postflight sau provisioning: Auth/link tăng đúng phạm vi, dữ liệu nghiệp vụ và lịch sử giữ nguyên.
6. Deploy ứng dụng tương thích, kiểm chứng runtime hosted riêng. Giữ `CONSULTATIONS_EMAIL_ENABLED=false`, email tháng tắt; chỉ bật `CONSULTATIONS_ENABLED=true` sau khi đã xác nhận schema và có admin tiếp nhận. Không gửi email mẫu/thật trong đợt này.
7. Smoke theo vai trò: đăng ký lưu đúng một đơn, admin đổi trạng thái và xử lý revision cũ; nhãn A+B/C/PREVOI; login đúng/sai, nhiều con/lớp, cấm đọc chéo, đổi mật khẩu/đăng xuất/phiên cũ, bài private, published và học phí. Dữ liệu QA dùng staging; production chỉ thao tác trong phạm vi chủ vận hành cho phép. Ghi ngày, commit/deployment, kết quả và phần còn chờ vào PROJECT_STATUS.

Nếu lỗi sau migration26: giữ bảo trì, giữ email tắt và dùng ứng dụng tương thích Auth mới; không mở lại login chỉ bằng số, không restore đè/xóa dữ liệu mới. Lỗi provisioning giữ Auth user để đối soát/retry. Lỗi dữ liệu cần thay đổi bù có audit và quyền riêng.

## Đọc kết quả verification

Hai SQL chỉ chạy transaction READ ONLY và trả tổng hợp, boolean/grants hoặc digest toàn bảng; không trả tên, số điện thoại, email, ID hồ sơ hay payload. Chạy trên môi trường thử trước. Preflight có thể chạy lại sau schema để so digest cùng thuật toán; các cột mới trên classes/parent_accounts đã được loại khỏi digest bảo toàn. Digest không thay backup hoặc chứng minh quyền end-to-end.

Trong bảo trì không có ghi nghiệp vụ, counts/digest của bảng lịch sử, tài chính, học tập, lớp (trừ cột phân loại), parent/links phải giữ nguyên. Các thay đổi dự kiến: registry thêm 18/24/25/26; phân loại/history mới; sessions cũ về 0; Auth/link tăng khi cấp tài khoản. `registration_outbox_rows`, `legacy_unbound_sessions`, `invalid_parent_auth_links` phải bằng 0; class null cần đối soát, không tự đoán mã. RLS/grants kiểm tra trong SQL và kiểm thử vai trò bổ sung cho nhau. Mọi sai khác chưa giải thích được phải dừng rollout.

## Nghiệm thu còn chờ

| Môi trường | Bằng chứng/giới hạn |
|---|---|
| Local | Node24: guard 544 tệp, repo 11/11, database/API 256/256 không skip/cancel, typecheck/lint strict/build cuối/diff check đạt. Có PostgreSQL17 native/concurrency/backup-restore, pre/postflight cả hai thứ tự migration tùy chọn. Browser 32 nhóm/3.752 assertions, đăng ký public 2 nhóm/119 assertions; smoke build cuối Edge155 14 nhóm/167 assertions ở 375/768/1440 px đạt, không lỗi browser/request bất ngờ. Các luồng dùng fixture giả, không xác nhận Supabase Auth thật. |
| Staging | Chưa có Supabase thử; Auth thật, provisioning, chuyển đổi schema→provision→deploy, rollback tương thích và restore chưa nghiệm thu. |
| Production | 14/10/2026: đã có 18/24/25/26; cấp mới 44 tài khoản và liên kết đúng, 0 lỗi/0 mồ côi; dry-run sau cấp còn 0 pending, 10 học sinh thiếu liên hệ. Digest 28 bảng nghiệp vụ (loại cột mới theo preflight) và 23 Auth user ngoài parent giữ nguyên. Chưa deploy hoặc thử đăng nhập/đổi mật khẩu trên ứng dụng mới. Backup trước migration có archive/checksum hợp lệ nhưng chưa gồm tài khoản vừa cấp, chưa thử restore. |

Nguồn trạng thái/backlog: [PROJECT_STATUS](PROJECT_STATUS.md). Setup chung: [SETUP_VERCEL_SUPABASE](SETUP_VERCEL_SUPABASE.md). Không coi tên tài liệu này là chứng nhận hoàn tất production.
