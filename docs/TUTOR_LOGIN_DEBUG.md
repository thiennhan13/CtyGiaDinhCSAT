# Chẩn đoán đăng nhập gia sư

## Thông báo và điểm kiểm tra

`app/api/auth/login/route.ts` kiểm tra lần lượt Origin/body → CAPTCHA → giới hạn đăng nhập → Supabase Auth → `app_metadata.role` → hồ sơ gia sư hoạt động.

| Thông báo | Ý nghĩa |
|---|---|
| Email hoặc mật khẩu không chính xác. | Supabase Auth không xác thực được |
| Tài khoản chưa được cấp quyền. | Auth thành công nhưng role không phải `admin` hoặc `tutor`; phiên vừa tạo bị đăng xuất local |
| Hồ sơ gia sư chưa được cấp quyền hoạt động. | Role là `tutor`, nhưng hồ sơ liên kết thiếu, không hoạt động, bị xóa hoặc truy vấn hồ sơ lỗi |

Quyền quản trị chỉ lấy từ `app_metadata.role=admin`. Không dùng `user_metadata`, email cố định hoặc tên tài khoản để cấp quyền. Tạo gia sư mới qua `app/api/admin/tutors/route.ts` hiện đặt `app_metadata.role=tutor`.

## Chẩn đoán trước sửa · production ngày 18/10/2026

Kiểm tra bằng transaction `READ ONLY`, TLS xác thực CA; database và Supabase endpoint cùng project. Không gọi đăng nhập thật, không sửa dữ liệu và không xuất email, UUID, mật khẩu, token hoặc toàn bộ metadata.

- Tài khoản được báo lỗi có Auth liên kết duy nhất với hồ sơ gia sư hoạt động, email khớp, không bị ban; `app_metadata.role=staff`.
- Trong 21 hồ sơ gia sư hoạt động: 19 liên kết Auth có role `staff`, một `tutor`, một `admin`; không thiếu Auth hoặc role, không trùng liên kết và không lệch email.
- Vì API chỉ nhận `admin`/`tutor`, role `staff` bị từ chối đúng tại điều kiện tương ứng với thông báo người dùng báo. Không phải lỗi mật khẩu, CAPTCHA hoặc trạng thái hồ sơ của tài khoản này.
- Chưa xác định tác vụ hoặc hệ thống nào đã đặt `staff`; dữ liệu hiện tại không đủ để quy nguyên nhân cho một đợt deploy cụ thể.

## Đã chuẩn hóa toàn bộ role staff · production ngày 18/10/2026

Chủ trung tâm đã cho phép đổi **tất cả** tài khoản role `staff` thành `tutor`. Preflight toàn bộ Auth xác nhận 20 tài khoản, gồm 19 hồ sơ gia sư hoạt động và một hồ sơ ngừng hoạt động; tất cả có liên kết, không trùng Auth. Đã cập nhật đủ 20 tài khoản qua Supabase Auth Admin API lúc khoảng 00:11 giờ Việt Nam, chỉ gửi `app_metadata` đã merge và thay key `role`. Không nới whitelist đăng nhập hoặc lấy role từ thông tin người dùng tự sửa.

Công cụ nội bộ `scratch/repair-all-staff-roles.cjs` mặc định dry-run; trước nhánh apply đối chiếu project, số lượng, fingerprint tập tài khoản và trạng thái hồ sơ với dry-run. Mỗi lần ghi đọc lại Auth, chỉ nhận đúng định danh có role `staff`, merge metadata và đọc lại để xác minh. Báo cáo chỉ chứa số lượng/trạng thái và fingerprint, không chứa email/UUID/secret. Công cụ/báo cáo ở kho local ngoài Git/runtime, không phải migration cần chạy lại.

Postflight đọc lại đủ **20/20** tài khoản có role `tutor`; toàn bộ Auth còn **0 staff**, 21 tutor, một admin và 44 parent. Digest trước/sau xác nhận mật khẩu, email/phone, ban, user metadata, các key app metadata ngoài role và mốc xác nhận liên hệ của tập được sửa không đổi; metadata/role các tài khoản ngoài tập được sửa, toàn bộ hồ sơ gia sư và phân công lớp không đổi. Hồ sơ ngừng hoạt động vẫn ngừng hoạt động, API tiếp tục chặn đăng nhập bằng kiểm tra hồ sơ hiện hành.

Kiểm thử Node 24.19.0: chạy chung fixture Auth/CAPTCHA/quyền và guard/bảo toàn metadata của hai công cụ đạt 31/31. Audit chỉ đọc độc lập sau sửa xác nhận tài khoản được báo đã có role `tutor`, hồ sơ vẫn hoạt động và không bị ban; mọi hồ sơ gia sư hoạt động chỉ còn role `tutor` hoặc `admin`. Không chạy full DB suite, build hoặc browser QA vì không sửa mã runtime/schema/UI. Không gọi đăng nhập bằng mật khẩu thật; kiểm chứng role production không thay nghiệm thu đăng nhập thật của người dùng.

Người dùng đăng nhập lại để lấy phiên mới. Không cần deploy website. Chưa xác định tác vụ/hệ thống đã đặt role `staff`; nếu tái diễn cần kiểm tra nơi quản lý Auth bên ngoài, không tự sửa whitelist hoặc cấp lại quyền từ dữ liệu client. Cấp quyền production tiếp tục theo [AGENTS](../AGENTS.md) và [SECURITY](../SECURITY.md).
