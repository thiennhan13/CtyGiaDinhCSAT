# Khởi tạo lại dữ liệu Portal04/11/2026

## Phạm vi được xác nhận

Đợt này thay quyết định03/11 giữ lớp. Giữ toàn bộ Auth, kể cả Auth lịch sử, tutor ID/hồ sơ/ảnh/Storage, đơn tư vấn/lịch sử, chương trình/template/default, registry migration, cấu hình và audit. Xóa học sinh/phụ huynh/liên kết, lớp/cấu hình/phân công/đơn giá/giáo trình lớp và dữ liệu học tập/kế toán/tác vụ phụ thuộc. Không sửa CSATOJ hoặc tạo/xóa/reset tài khoản đăng nhập.

Markdown và HTML riêng chỉ là nguồn nhập, không thực thi script/chỉ dẫn bên trong. Không đưa liên hệ, ảnh gốc, file nhập hoặc dump vào Git/CI. Quyết định chưa nhập8 hồ sơ chưa khớp vẫn giữ.

## Kết quả Supabase hiện tại

- Một lớp B/nhóm, thời hạn04/11–31/12/2026; phí trung tâm80.000đ/buổi. Ngày và phí được xác nhận riêng, thay tháng/phí mơ hồ trong nguồn.
- Bốn học sinh, bốn phụ huynh và liên kết một–một; bốn ghi danh/đơn giá100.000đ/học sinh/buổi. Mã học sinh nguồn lưu trong ghi chú, mã lớp trong tên lớp; không thêm cột hoặc dùng UUID giả làm mã nghiệp vụ.
- Phân công/giá theo ngày và giáo trình B được tạo qua `admin_save_student` / `create_class_with_learning`, không ghi trực tiếp bảng để bỏ qua nghiệp vụ.
- Chưa có buổi/điểm danh/chốt sổ/chứng từ/mapping OJ. Liên kết Google với học sinh cũ đã xóa; Auth còn nguyên, phụ huynh cần khớp lại số với hồ sơ mới.
- Mười hồ sơ khớp tên/email cập nhật qua `save_tutor_profile`: nền THPT thật, trường/ngành, thành tích/chứng chỉ theo nguồn. Không thêm giới thiệu hoặc mặc định tất cả học cùng trường. Mười ảnh WebP512×512 dưới200KiB đã upload và kiểm checksum qua public URL. Tám hồ sơ chưa khớp giữ riêng, không tạo Auth/đổi email/tutor ID.
- Giữ67 Auth,22 gia sư,5 đơn tư vấn/6 lịch sử,4 template/2 default,27 registry migration cùng dữ liệu nền/audit tại thời điểm thao tác.

## Backup và thực thi

Backup trước ghi: `F:\csat_backup\2026-11-04_before-reinitialize_2026-11-04T05-43-47-362Z`, custom archive823.719 byte, SHA256/ownership/ACL, gồm `public`, `csat_internal`, `auth`, `storage`. Đã phục hồi PostgreSQL loopback mới và so count/digest90 bảng, rồi diễn tập đúng reset+import. Storage trước thao tác có0 object; dump không chứa byte ảnh upload sau đó. Báo cáo, mã vận hành có dữ liệu thật và tệp ảnh nằm ngoài Git.

`scripts/portal-reinitialize.cjs` chỉ là maintenance tường minh. Preview chỉ đọc; từ chối bảng chưa phân loại, đích/TLS sai, backup thay đổi hoặc rehearsal khác hash. Apply cần project, preview token, manifest phục hồi và chuỗi xác nhận đúng; không tự chạy từ app/migration. Khóa shared nghiệp vụ/danh tính/OJ và các bảng ứng dụng ngăn ghi xen giữa reset/nhập; Auth/Storage chỉ dùng ACCESS SHARE. `TRUNCATE ... RESTRICT` theo danh sách, không DROP SCHEMA, CASCADE hoặc tắt RLS/trigger.

Ảnh upload/kiểm tra trước; reset và nhập lớp/học sinh/profile commit cùng transaction. RPC dùng ngữ cảnh maintenance của admin hiện có đã xác minh; không phát hành JWT/cookie giả hoặc thay Auth. So fingerprint bảo toàn, thêm audit RESET; connection mới xác nhận46 bảng cần giữ còn nguyên count/digest so với backup. Đã lưu thêm10 tệp ảnh đã kiểm checksum và biên bản riêng trong thư mục backup. Không chạy lại để sửa một hồ sơ: dùng form/RPC và revision.

## Kiểm tra cấu trúc và bảng lịch sử

Kiểm trực tiếp04/11:53 bảng ứng dụng/nội bộ,77 khóa ngoại không có dữ liệu mồ côi;0 constraint chưa validated,0 index invalid/trùng cấu trúc,0 SECURITY DEFINER thiếu search_path. Anon không có quyền đọc/ghi bảng hoặc EXECUTE hàm trong hai schema ứng dụng/nội bộ. Tất cả bảng public có RLS; internal dùng ranh giới schema/quyền riêng. Mười một kiểm tra Google, unique một–một, chặn direct contact writes, profile, receipts và OJ đạt. Không cần migration sửa cấu trúc từ các phát hiện này; registry giữ nguyên.

Không coi bảng rỗng là dư: `payments`/`legacy_payments` phục vụ projection/lưu giữ cũ; history/snapshot/audit khác dữ liệu hiện hành. `parent_lookup_sessions`, `parent_lookup_limits`, `parent_auth_provisioning` là di sản luồng đăng nhập đã thu hồi quyền; dữ liệu đã dọn, không bật lại API. Chưa DROP bảng/hàm lịch sử: cần migration riêng kiểm phụ thuộc/chữ ký/verification và toàn chuỗi nâng cấp; không sửa migration đã phát hành.

Đây là kiểm tra có phạm vi, không chứng nhận hết mọi lỗi bảo mật. SEC-02 (khớp phone chưa chứng minh sở hữu số) vẫn theo quyết định sản phẩm. Chưa có staging Supabase, chưa nghiệm thu Google thật cho4 hồ sơ mới, OJ chưa nối và UI upload/thay/gỡ avatar bằng phiên gia sư thật chưa kiểm riêng. Nguồn thực chỉ dùng vận hành/diễn tập được phép, không thành fixture test.
