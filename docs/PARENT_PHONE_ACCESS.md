# Tra cứu phụ huynh bằng số điện thoại

## Quyết định hiện hành

Theo yêu cầu của chủ trung tâm, phụ huynh chỉ nhập số điện thoại đã đăng ký: không mật khẩu, OTP hoặc Supabase Auth. Quyết định này thay phương án Auth của migration26. Gia sư/admin vẫn dùng email và mật khẩu qua Supabase Auth.

Đây là tra cứu bằng thông tin liên hệ, không xác minh danh tính. Người biết số điện thoại có thể mở thông tin học tập/học phí gắn với số đó. Giới hạn lượt thử không chứng minh sở hữu số và không ngăn một lượt truy cập có chủ đích. SEC-02 vẫn mở; không mô tả luồng này là xác thực an toàn hoặc đã xác minh phụ huynh.

## Luồng và quyền

- Form chỉ POST `phone` tới `/api/parents/auth`. Chuẩn hóa 0/+84/0084; kiểm tra Origin, schema nghiêm ngặt, thân yêu cầu tối đa 4 KiB.
- `start_parent_phone_session` chỉ service role gọi được; kiểm tra giới hạn trong cùng transaction, hồ sơ hoạt động và có liên kết học sinh chưa xóa. Không cần `parent_accounts.auth_uid` và không gọi Auth.
- Cookie ngẫu nhiên 256 bit, HttpOnly/SameSite=Lax/Secure ở production, hạn 12 giờ. Database chỉ lưu SHA-256 của token. Số điện thoại không nằm trong URL hoặc cookie.
- `parent_phone_session_valid` kiểm tra phiên, thời hạn, hồ sơ active và liên kết. Dashboard/bài viết vẫn gọi RPC kiểm tra học sinh–lớp và giáo án đã công bố; không bỏ quyền đọc chéo. Giữ private/no-store và noindex.
- Đăng xuất thu hồi lookup session; không đăng xuất phiên gia sư/admin cùng trình duyệt. Khóa hồ sơ hoặc đổi số qua quản trị thu hồi phiên; bỏ liên kết con có hiệu lực ở lần đọc tiếp theo.
- Gỡ nút/form đổi mật khẩu. `/parents/account` chuyển về dashboard; API mật khẩu cũ trả 410, không sửa Auth.
- `/admin/parents/provisioning` giữ URL cũ nhưng đổi thành đối soát liên hệ, dùng `parent_contact_candidates`. Dùng hồ sơ + liên kết, không dùng việc có Auth để kết luận sẵn sàng.
- Giữ Auth users, `auth_uid`, metadata và lịch sử provisioning cũ để bảo toàn dữ liệu. Các RPC mở phiên/cấp Auth cũ bị thu hồi quyền. Không tạo, xóa hoặc đặt lại mật khẩu Auth phụ huynh.

## Chống spam chung

`lib/login-security.ts` tạo HMAC từ nguồn truy cập và định danh; không lưu IP/số/email thô trong bảng giới hạn. Phụ huynh và gia sư/admin dùng chung `csat_internal.auth_attempts` và `consume_auth_attempt`:

| Phạm vi | Giới hạn |
|---|---|
| Một số điện thoại hoặc email | 20 lượt / 15 phút sau migration 29; trước đó là 10 |
| Cùng nguồn truy cập, cộng cả hai luồng | 50 lượt / 15 phút |

Đếm cả lượt thành công và số không tìm thấy. Mỗi worker dùng cùng database, không reset khi cold start. Vượt giới hạn trả 429 với Retry-After=900; lỗi hệ thống giới hạn trả 503, không tiếp tục đăng nhập. Nguồn production lấy từ header Vercel tin cậy; local dùng một nhóm `local`. Hai role có namespace định danh riêng, nhưng cùng khóa nguồn. NAT có thể dùng chung ngân sách; đây là giới hạn đã chọn, không phải CAPTCHA hoặc chống DDoS.

Theo yêu cầu ngày 24/10/2026, [migration 29](../database/migrations/20261024_29_login_identity_budget.sql) nâng riêng budget định danh lên 20. Phụ thuộc 27, độc lập migration OJ 28; không sửa migration 26 đã phát hành, không xóa bộ đếm/phiên, không đổi cửa sổ 15 phút hoặc budget nguồn 50. Deploy ứng dụng không tự áp SQL. Trạng thái môi trường ở PROJECT_STATUS; chưa coi mức 20 có hiệu lực trên production khi chỉ có mã local.

Hai form hiển thị lỗi 429: “Đã vượt quá số lượt đăng nhập cho phép với thông tin hoặc mạng đang sử dụng. Vui lòng chờ 15 phút rồi thử lại. Nếu cần hỗ trợ, hãy liên hệ CSAT.” RPC trả boolean/trạng thái chung nên không khẳng định đã chạm đúng ngưỡng 20 của định danh hay 50 của nguồn. Thời gian chờ 15 phút là hướng dẫn an toàn theo cửa sổ hiện hành, không phải đồng hồ đếm ngược chính xác của bộ đếm. Giữ dữ liệu nhập và yêu cầu xác minh CAPTCHA mới sau lần gửi lỗi; không tự động gửi lại.

Giới hạn này bảo vệ endpoint website. Supabase Auth của gia sư vẫn có endpoint riêng và giới hạn của nhà cung cấp; không tuyên bố lớp API này kiểm soát mọi yêu cầu trực tiếp tới Supabase.

## Chuyển đổi database và ứng dụng

Production lần đối chiếu trước đã có 26. Không sửa hoặc chạy lại 26, không chạy master schema. Migration mới là [27](../database/migrations/20261014_27_parent_phone_access.sql), phụ thuộc 26, không cần 19/21/22. Người dùng tiếp tục tự chạy SQL production theo cách bàn giao đã thống nhất.

1. Chuẩn bị backup và bản ứng dụng tương thích; thử bằng fixture riêng trước. Chưa có Supabase staging thật, cần ghi rõ giới hạn nghiệm thu.
2. Chạy [verification chỉ đọc](../database/verification/20261014_parent_phone_access.sql) trước; trước 27 các RPC mới chưa tồn tại là dự kiến. Có thể dùng [preflight digest nghiệp vụ](../database/verification/20261012_backend_preflight.sql) để đối chiếu trước/sau.
3. Trong cửa sổ chuyển đổi, chạy migration27 **một lần**. Migration thu hồi toàn bộ phiên lookup cũ; phiên Auth và tài khoản Auth cũ được giữ nhưng không cấp quyền tra cứu. Không chạy lệnh provisioning Auth cũ.
4. Chạy lại verification. Registry có `20261014_27`; mọi `present`/`*_grant_ok` và `rls_enabled` phải true; số hồ sơ/liên kết/Auth giữ nguyên, `legacy_sessions=0`. Phiên mới có thể tăng sau khi người dùng truy cập.
5. Phát hành ứng dụng tương thích và kiểm tra runtime Node24; nghiệm thu tra cứu, nhiều con, khóa hồ sơ, bài chuyên đề, đăng xuất và 429. Phone provider có thể giữ tắt. Email vẫn tắt; không thay biến tiếp nhận đơn.

Migration và mã cần đi cùng nhau: mã cũ không mở được phiên sau 27, mã mới chưa hoạt động trước 27. Nếu lỗi, giữ cửa sổ bảo trì và sửa bằng migration bù; không restore đè lịch sử hoặc tự mở lại RPC cũ. Postflight 26 chỉ kiểm tra giai đoạn lịch sử, không dùng để đánh giá mô hình quyền sau 27.

`scripts/provision-parent-accounts.cjs` giữ tên tương thích nhưng nay chỉ đối soát tổng hợp, không nhận `--apply`; cần Node24 và môi trường máy chủ được cấp riêng. Công cụ/core và kiểm thử provisioning cũ chỉ giữ để kiểm chứng lịch sử migration26, không chạy cấp tài khoản thật.

## Trạng thái nghiệm thu

Migration27 và ứng dụng đã qua kiểm thử local trên Node24, PostgreSQL17 và Edge; gồm tranh chấp rate limit, bảo toàn dữ liệu, phiên/liên kết và đọc bài không Auth. Xác minh chỉ đọc production ngày 15/10/2026: registry có 27, hai RPC mở/kiểm tra phiên chỉ cấp cho service role, RLS bật trên parent_accounts/parent_lookup_sessions/auth_attempts. Vercel bản 2190a6f Ready và trang login hiển thị tra cứu bằng số điện thoại. Chưa nghiệm thu bằng hồ sơ thật; không suy từ đây rằng mọi phiên/liên kết đã được nghiệm thu. Kết quả kiểm thử và bước còn chờ được cập nhật tại [PROJECT_STATUS](PROJECT_STATUS.md).
