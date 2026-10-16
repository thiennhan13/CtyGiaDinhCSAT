# Quyết định sản phẩm và kỹ thuật

Tóm tắt các lựa chọn chủ trung tâm đã chốt. Quy định chi tiết nằm ở tài liệu được dẫn; trạng thái triển khai ở [PROJECT_STATUS](PROJECT_STATUS.md). Mã cũ hoặc prototype không tự thay thế quyết định hiện hành.

## Website và nhận diện

- Phát triển trực tiếp bằng Next.js/React. Prototype phục vụ duyệt, không là dependency runtime.
- Website công khai dùng **neobrutalism / playful edtech**: viền rõ, bóng cứng, typography mạnh, art code/mạch/pixel; phối editorial, bento, sơ đồ theo nội dung. Giữ Archivo, logo và bảng màu đã duyệt. Không dùng KVANT cho chữ UI.
- Portal ưu tiên dữ liệu, thao tác và khả năng đọc; không áp hero/hiệu ứng marketing lên giao diện nghiệp vụ. Chi tiết ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md).
- Thành tích dùng **bố cục 3**, nhãn cạnh ảnh, WebP responsive và dữ liệu riêng trong repo. Bài viết công khai cũng dùng catalog tĩnh, chưa thêm CMS/database.
- Zalo trung tâm dùng **0917791599**; giữ nguyên số điện thoại liên lạc. Nguồn mã: `lib/public-contact.ts`.

## Chương trình và nội dung học

| Phạm vi | Quyết định |
|---|---|
| Công khai | Năm lớp A/B/C/E/K riêng; không có trang hoặc lựa chọn tuyển sinh A+B |
| Cơ bản | Quản lý có A/B/AB; AB hiển thị A+B và là mặc định lớp Cơ bản. Không tách vật lý lớp hiện có |
| Nâng cao | Tên chung C cho toàn bộ C/D và lớp nâng cao tương lai; giữ 19 chủ đề, mã C01–D07/scope CD và lịch sử lớp |
| E — CHỦ LỰC | Tuyển chọn từ lớp C khi đủ năng lực và đạt bài thi riêng; không bắt buộc hoàn thành toàn bộ lớp C. Hướng chuyên Tin, thuật toán, tư duy toán học và thi đấu |
| PreVOI | PreVOI/HSGQG/Ôn thi VOI dùng mã PREVOI, giáo án riêng; **không dùng E** |
| K | Kèm riêng/Luyện thi/Tùy chỉnh theo nhu cầu; không mặc định HSGQG. Cơ chế phối nguồn/version giáo án vẫn là đề xuất chờ duyệt |

Mã quản lý A/B/AB/C/E/PREVOI/K điều khiển lựa chọn và mặc định hiện hành; không tiếp tục suy phân loại từ tên lớp. Đổi mã cần quyền admin, xác nhận, revision/audit; không tự đổi tên, giáo án đã công bố, học phí hoặc lịch sử. E/K/PreVOI chưa có giáo trình chuẩn mới thì giữ nội dung tùy chỉnh đang có. Nguồn chi tiết: [catalog](PUBLIC_COURSE_CATALOG.md), [đào tạo](CHUONG_TRINH_DAO_TAO.md).

Trang phụ huynh giữ tóm tắt, chặng và định hướng; nút Đọc chuyên đề mở bài riêng. **43 chủ đề A/B/C, 54 bài** lưu Markdown trong repo, không CMS/database. Vận dụng cách dẫn dắt của VNOI, đối chiếu USACO Guide/Viblo, CS50 cho nhập môn; tự viết ví dụ và code, không sao chép. Code ngầm dùng namespace std, không ghi `using namespace std;` hoặc tiền tố `std::`; hai câu tự kiểm tra mở đáp án, nguồn tham khảo thêm ngắn và minh họa/video khi hữu ích. [Quy tắc chuyên đề](PARENT_TOPICS.md).

Chặng lớp dựa số buổi completed đã kết thúc từ đầu lớp, không theo tháng hoặc nghỉ riêng; thiếu aggregate dùng chặng gia sư công bố. Đây là chỉ báo định hướng, không ghi nhận thành thạo hoặc tự công bố.

## Đăng ký, truy cập và bảo vệ

- Đăng ký/tư vấn **lưu chung** `consultation_requests`. Consent và nút **Đăng kí ngay** gửi trực tiếp; chỉ báo thành công khi database xác nhận. Giữ dữ liệu khi lỗi, chống trùng bằng request ID; không tự tạo học sinh/xếp lớp.
- Khóa quan tâm mặc định theo trang lớp; không khôi phục Sinh viên, Đại học, mục tiêu HSG Quốc gia hoặc cấp học Trao đổi thêm. Học liệu giữ xem lại/sao chép/liên hệ, chưa gửi tự động.
- Email trung tâm bổ sung sau; đơn intake v2 không tạo outbox. Chưa bật gửi mail, không coi chỉ bật cờ cũ là đã nối email cho đơn mới.
- Phụ huynh **chỉ dùng số điện thoại đã liên kết**, không mật khẩu/OTP/Supabase Auth. Giữ Auth users và lịch sử cũ nhưng không cấp/reset thêm cho luồng này. Người biết số có thể xem dữ liệu liên kết: SEC-02 vẫn mở.
- Gia sư/admin giữ Supabase Auth. Chống spam login dùng budget chung theo nguồn trong DB; quyền dữ liệu tiếp tục kiểm tra ở máy chủ/RPC.
- Turnstile **chỉ ở đăng nhập phụ huynh và gia sư/admin**, không ở đăng ký/tư vấn. Kiểm Siteverify phía server; CAPTCHA không chứng minh danh tính.
- Vercel Bot Protection dùng **Log**, chưa chặn diện rộng. CSP **Report-Only**; chưa tự enforce, thêm WAF rule hoặc đổi cơ chế truy cập. [Bảo vệ website](PUBLIC_SECURITY.md).

## Vận hành và giới hạn phạm vi

- **Node.js 24** cho local/CI/deploy. Local QA dùng Edge, không cài Chromium local; CI cài Chromium trên runner.
- Tiếp tục dùng gói Vercel/Supabase miễn phí theo ngân sách đã chọn. Không tự nâng gói/đổi hosting; điều kiện sử dụng và quota phải đối chiếu trước thay đổi. Chủ trung tâm xác nhận usage ổn, chưa có staging Supabase.
- Search Console dùng URL-prefix `https://portal.csatoj.vn/` và tệp HTML do chủ trung tâm cung cấp; chủ trung tâm phụ trách xác minh/gửi sitemap.
- Backup lưu tại `F:\csat_backup`; lịch tự động, mã hóa, bản ngoài máy và thời hạn lưu/xóa chưa chốt. Không tự restore đè production hoặc dùng dump thật làm fixture.
- Không reset database, sửa migration đã phát hành, xóa lịch sử hoặc tính lại kỳ cũ bằng giá hiện tại. Chốt sổ/công bố do người có quyền thao tác; cron chỉ nhắc việc/tổng hợp.
- API CSATOJ, email, Storage thật, luồng mời/đổi mật khẩu gia sư và tái cấu trúc module cần phạm vi riêng. Không tạo số liệu, giáo trình hoặc cam kết đầu ra giả.

## Duy trì quyết định

Cập nhật mục tương ứng khi có lựa chọn mới, bỏ phương án hết hiệu lực khỏi hướng dẫn hiện hành và dẫn đúng tài liệu nghiệp vụ. Git giữ lịch sử; tài liệu vận hành giữ bằng chứng tối thiểu. Phân biệt rõ **đã chốt**, **đã triển khai** và **đã nghiệm thu**.

## Trang Tự học

Theo yêu cầu chủ trung tâm, `/tu-hoc` dùng nguyên nội dung, nhánh học, cấu trúc sơ đồ/danh sách và tương tác từ project `csat-roadmap`, thay phần hero/diễn giải của bản cũ. Giữ menu/logo và Archivo của website, lời mời đăng ký dẫn `/lo-trinh#tu-van`. Thiết kế hiện hành dùng cây dọc: Tự học là trang giấy cuộn tự nhiên, mục lục/CTA nổi trái và toolbar nổi dưới; Portal dùng khung cây dọc riêng, thẻ số buổi ngoài giấy, tô toàn chặng và bỏ mục lục nội bộ. Snapshot này là tài liệu tự học; không thay khung chuẩn/giáo án công bố hoặc bài đọc phụ huynh. [Nguồn và cách tích hợp](KNOWLEDGE_MAP.md).
