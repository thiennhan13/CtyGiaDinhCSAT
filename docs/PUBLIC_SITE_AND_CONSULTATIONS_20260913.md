# Trang giới thiệu, lộ trình và tư vấn — 13/09/2026

## Phạm vi được duyệt

Đợt này triển khai trang chủ, trang lộ trình và tiếp nhận tư vấn. Cron nhận xét ngày 28 thuộc đợt riêng; không tự động chốt sổ hoặc công bố nhận xét. Chưa áp dụng migration production, chưa gửi email thật, chưa triển khai Vercel.

## Nội dung và căn cứ

Thông điệp trang chủ: **Hiểu bài toán. Vững cách giải.** Đây là thông điệp của trang giới thiệu, không thay thế logo hoặc tự công bố slogan chính thức trên toàn bộ thương hiệu.

| Nội dung | Căn cứ | Cách sử dụng |
| --- | --- | --- |
| Cơ bản 30 buổi, Nâng cao 35 buổi, mỗi chương trình 6 chặng | Hai lộ trình đã được người dùng duyệt; `lib/learning-template-seeds.json`; Kiến thức dự kiến C++.xlsx/PDF trong Downloads | Dùng chung thứ tự, tên chuyên đề và khoảng buổi; không sửa template đã ghim cho lớp |
| Quan hệ giữa các mảng kiến thức | Danh sách kiến thức.xlsx và phần diễn giải của template | Giải thích ngắn giá trị học tập; không xem dấu đánh dấu trong tài liệu là năng lực của học sinh |
| Các diễn giải còn ghi đề xuất | Template: Legendre, pair/struct, cộng dồn 2D, modulo, băm xâu, phân chia bài DP | Không công khai các phần mở rộng này như nội dung đã duyệt. Danh sách buổi công khai chỉ lấy tên và thứ tự. Mô tả chặng Nhị phân & băm dùng diễn giải khái quát |
| Cách học và phụ huynh đồng hành | Sổ tay vận hành; source portal; CSATOJ công khai | Gia sư hướng dẫn, học sinh luyện bài, sửa bài; portal hiển thị thông tin đã công bố. Không tuyên bố đồng bộ tiến bộ OJ vào portal |
| HSGQG | Quyết định người dùng ở bước lập kế hoạch | Trang giới thiệu ngắn, nội dung chi tiết bổ sung sau, tư vấn riêng; không đồng nhất với Luyện thi tùy chỉnh |
| Đại học | Quyết định người dùng | Tư vấn riêng; không công bố khóa ICPC/đại học chưa có căn cứ |
| Thành tích, đầu ra, học phí | Chưa có căn cứ thống nhất để công bố trong đợt này | Không đưa số giải, tỷ lệ đỗ, cam kết kết quả hoặc giá vào trang mới |

Nguồn tham khảo định hướng và cách truyền đạt, đã nghiên cứu ở bước lập kế hoạch:

- [Code.org — Values](https://code.org/en-US/about/values): diễn đạt giá trị của nền tảng Tin học theo hướng dễ tiếp cận.
- [Raspberry Pi Foundation — About](https://www.raspberrypi.org/about/): liên hệ kiến thức máy tính với khả năng giải quyết vấn đề.
- [Bebras — About](https://www.bebras.org/?q=about): dùng bài toán cụ thể để nói về tư duy tính toán.
- [FIRST — About](https://www.firstinspires.org/about): trình bày mối quan hệ giữa thực hành, người hướng dẫn và sự đồng hành. Không sao chép slogan hoặc chuyển thành tích FIRST thành thành tích CSAT.
- [USACO Guide](https://usaco.guide/): tham khảo cách tổ chức hướng học và bài luyện tập; không coi đây là giáo trình chính thức của USACO hay chương trình CSAT.
- [CSATOJ](https://csatoj.vn): căn cứ cho chức năng bài tập, bài nộp, chấm tự động, kỳ thi.

Văn phong: nói rõ người học làm gì và giá trị của việc làm đó. Lợi ích được diễn đạt là quá trình rèn luyện, không phải bảo đảm năng lực hay kết quả. Nội dung STEM là bối cảnh tham khảo; không tự thêm dịch vụ robotics, AI hoặc kỹ thuật vào CSAT.

## Các trang và hành vi

- `/`: CSAT dạy gì → phù hợp với ai → lợi ích lập trình thi đấu → hai chương trình → cách học → hệ sinh thái và phụ huynh → tư vấn.
- `/lo-trinh`: chọn cấp học/mục tiêu; bấm Xem hướng học để đọc lý do, sau đó mới mở chương trình. Có hai thẻ chương trình và form cuối trang.
- `/lo-trinh/co-ban`, `/lo-trinh/nang-cao`: đối tượng, nền tảng đầu vào, 6 chặng với các nhóm buổi mở rộng, hướng học tiếp.
- `/lo-trinh/hsgqg`: định hướng ngắn và tư vấn; không tự tạo chương trình.
- `/admin/consultations`: danh sách, lọc, phân trang 50 yêu cầu; nội dung chi tiết; cập nhật Mới / Đã liên hệ / Đã hoàn tất; xem trạng thái mail và thử lại khi đủ điều kiện. Nằm trong menu Học sinh → Yêu cầu tư vấn.

| Lựa chọn | Kết quả |
| --- | --- |
| HSG cấp THCS / Chuyên Tin | Cơ bản |
| HSG tỉnh cấp THPT | Nâng cao, kèm điều kiện nền tảng |
| HSG Quốc gia | Trang HSGQG |
| Chưa rõ | Xem hai chương trình và tư vấn |
| Đại học, mọi mục tiêu | Tư vấn riêng |

Cấp học là ngữ cảnh, không phải kết luận về trình độ. Học sinh THCS vẫn có thể chọn mục tiêu THPT/HSGQG. URL chỉ mang lựa chọn cấp học, mục tiêu; không chứa thông tin liên hệ. Các nội dung chương trình dựng trên server; chỉ phần lựa chọn/form là tương tác client. Styles công khai được giới hạn trong `.csat-public` và tái sử dụng Archivo, kem, xanh, lime, viền và bóng hiện tại.

## Luồng tư vấn

1. Client kiểm tra trường bắt buộc; server kiểm tra lại, chỉ nhận JSON tối đa 16 KB và nguồn gửi hợp lệ.
2. Chuẩn hóa số điện thoại di động Việt Nam. Xác nhận đồng ý chưa được đánh dấu sẵn. Trường bẫy bot phải rỗng.
3. Server tính HMAC cho nguồn IP. Trên Vercel chỉ đọc `x-vercel-forwarded-for`; ngoài Vercel dùng một nhóm local, không tin forwarding header tùy ý.
4. RPC lưu yêu cầu và mail outbox cùng một transaction. Giới hạn trượt: 5 yêu cầu / 15 phút / nguồn, 3 yêu cầu / giờ / số điện thoại; khóa transaction giữ đúng khi nhiều instance đồng thời.
5. Mã UUID lặp với cùng nội dung trả về bản đã lưu; khác nội dung bị từ chối. Retry không tạo mail mới hoặc thay đổi payload đã lưu.
6. Thử gửi email ngay nếu có cấu hình và được bật. Thất bại gửi mail không đổi kết quả lưu form thành thất bại.
7. Admin theo dõi và liên hệ; retry mail qua API admin. Không có cron tư vấn trong phiên bản này.

Email cố định đến `csattutor@gmail.com`. Email người gửi chỉ làm Reply-To sau kiểm tra định dạng. Nội dung gồm mã yêu cầu, giờ Việt Nam, người liên hệ, điện thoại/email, cấp học, mục tiêu, hướng học và lời nhắn. Không ghi thông tin cá nhân, payload, khóa hay URL kết nối vào log.

Mail sử dụng khóa `csat-consultation-{request_id}`. Payload từ người gửi được lưu ngay khi nhận, địa chỉ From được đóng băng ở lần claim đầu. Lease 3 phút; retry sau ít nhất 5 phút; tối đa 3 lần, cửa sổ tự retry nhỏ hơn 23 giờ. Quá cửa sổ hoặc số lần chuyển sang cần kiểm tra thủ công. `accepted` nghĩa là nhà cung cấp đã tiếp nhận, chưa chứng minh Gmail đã giao đến inbox. Không tự retry trạng thái này.

Tham khảo kỹ thuật: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys) và [Vercel request headers](https://vercel.com/docs/headers/request-headers).

## Chuẩn bị phát hành — chỉ sau khi được cho phép

1. Duyệt bản local và nội dung. Kiểm tra ảnh trên desktop/mobile và sáng/tối.
2. Xác nhận backup và môi trường đích. Bản production hiện có các migration đến 17; chỉ áp dụng `database/migrations/20260913_18_consultations.sql`. Không chạy lại master hoặc sửa migration đã áp dụng.
3. Chạy verification riêng của đợt này. Không có thao tác cập nhật dữ liệu nghiệp vụ cũ trong migration 18.
4. Cấu hình phía server, không đưa vào biến NEXT_PUBLIC:
   - `CONSULTATIONS_ENABLED=true`: bật lưu yêu cầu (mặc định tắt nếu thiếu).
   - `CONSULTATIONS_HASH_KEY`: secret ngẫu nhiên riêng, đủ mạnh và cố định giữa các instance. Không dùng khóa công khai hoặc xuất giá trị vào tài liệu/log.
   - `APP_ORIGIN=https://portal.csatoj.vn`: origin chuẩn, không có slash cuối.
   - Supabase URL/service key của đúng môi trường.
   - `CONSULTATIONS_EMAIL_ENABLED=true`, `CSAT_EMAIL_FROM` thuộc domain đã xác minh, `RESEND_API_KEY` khi được phép bật mail.
   - Hàm gửi mail còn bắt buộc `VERCEL_ENV=production`; local và preview luôn không gửi dù bật cờ mail.
5. Triển khai khi được cho phép; kiểm tra cổng phụ huynh/gia sư/admin vẫn xác thực đúng. Gửi một yêu cầu/email kiểm thử thật chỉ sau khi được phép.
6. Vào admin kiểm tra lưu và mail; đối chiếu nhà cung cấp nếu mail cần kiểm tra thủ công. Không xóa/reset job để vượt cửa sổ chống gửi trùng.

Nếu cần dừng intake, tắt `CONSULTATIONS_ENABLED`; nếu cần dừng mail, tắt `CONSULTATIONS_EMAIL_ENABLED`. Giữ bảng đã tạo và mọi yêu cầu đã nhận; không dùng rollback xóa bảng. Cần xem hàng đợi trong admin thường xuyên khi mail lỗi vì phiên bản này retry thủ công.

## Kiểm tra local

- `node --test database/tests/consultations.test.cjs database/tests/consultation-api.test.cjs`: SQL/PGlite và API/Resend giả lập.
- `node --test database/tests/postgres-concurrency.test.cjs`: PostgreSQL Windows tạm, nhiều kết nối, không dùng DATABASE_URL production.
- Bộ regression `database/tests/*.test.cjs`, TypeScript, lint và Next build.
- Kiểm thử trình duyệt local bằng Playwright: ánh xạ mục tiêu, chọn từ trang chi tiết sang form, lỗi lưu rồi gửi lại cùng UUID, giữ thông tin khi lỗi, keyboard menu, responsive sáng/tối.

Kết quả chi tiết cập nhật trong phần cuối tài liệu sau vòng kiểm tra cuối. Thư mục `docs/prototypes/` đã có trước đợt làm việc này, không thay đổi.

## Kết quả xác minh ngày 13/09/2026

- 203 kiểm thử regression/PGlite/API đạt, không lỗi; thêm 1 kiểm thử native PostgreSQL 17 đạt (gồm nhiều kết nối gửi yêu cầu, giới hạn gửi và claim email).
- Next.js production build thành công; trang chủ và lộ trình được prerender. TypeScript đạt. Lint không có lỗi; 18 warning cũ của dự án.
- 40 tổ hợp trang/kích thước (375, 768, 1024, 1440; sáng/tối): không tràn ngang, mỗi trang một H1; không có lỗi JavaScript trong trình duyệt.
- Kiểm tra form bằng response giả: lỗi lưu rồi gửi lại cùng UUID, giữ thông tin liên hệ, đúng hướng học và không đưa thông tin cá nhân vào URL.
- Kiểm tra liên kết từ trang chương trình giữ cấp học/mục tiêu; liên kết trực tiếp `#tu-van` cuộn đúng sau hydration; menu đóng bằng Escape.
- UI admin đã chạy với máy chủ auth local và dữ liệu hoàn toàn giả: cập nhật trạng thái, thử gửi lại, trạng thái accepted ẩn nút retry. Không sử dụng tài khoản thật.
- Đã xem trực quan ảnh trang chủ, lộ trình, form, trang chương trình dark mode và admin. Ảnh kiểm tra lưu trong `scratch/csat-*.png` (không commit dữ liệu kiểm thử).
- Các thay đổi chưa commit hoặc deploy. Cron ngày 28 giữ nguyên trong đợt này.

Chạy lại preview: `node scripts/preview-public-site.cjs` (port 3100, Supabase giả, intake/email tắt). Chạy kiểm tra trình duyệt: `node scripts/check-public-site.cjs` khi preview đang mở. Cần Playwright đã có trên máy; nếu dùng runtime ngoài dự án, đặt biến `PLAYWRIGHT_MODULE` tới module Playwright đó. Script dùng Edge headless mặc định; có thể chọn channel bằng `CSAT_BROWSER_CHANNEL`. Các bài gửi form trong test đều được mock ngay trong trình duyệt.
