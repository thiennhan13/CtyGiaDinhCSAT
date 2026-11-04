# Tích hợp CSATOJ accounts/grants

Mã local đã chuyển sang hợp đồng `connections/exchange`, receipt cùng UUID và `accounts`. [Cấu hình, luồng dữ liệu, xử lý lỗi và phát hành](PORTAL_GOOGLE_GRANTS_ROLLOUT.md#cấu-hình-và-vận-hành-oj).

Nguồn đọc phía OJ: `PORTAL_HANDOFF.md` → `PORTAL_CONNECTION_API.md` → `PORTAL_ACCOUNT_API.md`. Admin đổi mã để gắn student; Google/phone của parent là quyền độc lập tại Portal. Không dùng mã OJ để cấp quyền parent.

- SQL mới: migration32, phụ thuộc31. Migration28 là lịch sử bindings cũ, không sửa hoặc bật lại RPC cũ.
- Server: `lib/oj-grants.ts`, `oj-grants-server.ts`, `oj-account-api.ts`; route `/api/oj/links`, `/api/oj/accounts`, `/api/parents/oj`.
- UI: `/admin/oj`, `/tutor/oj`, phần Kết quả CSATOJ trên parent. Tải theo phần/thao tác, không polling.
- Kiểm thử: `scripts/tests/oj-api.test.cjs`, `database/tests/portal-grants.test.cjs`, `portal-concurrency.test.cjs`, `scripts/run-oj-ui.cjs`. Test cũ28 giữ để kiểm migration lịch sử, không xác nhận contract đang dùng.

Chưa cấu hình secret/bật hoặc nghiệm thu OJ/Supabase thật. Theo dõi tại [PROJECT_STATUS](PROJECT_STATUS.md); không suy trạng thái deployed từ test local.
