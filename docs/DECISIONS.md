# Quyết định sản phẩm và kỹ thuật

Ba cổng admin, gia sư và phụ huynh có quyền riêng. Nhân sự dùng Google vẫn vào cổng nhân sự. URL chuẩn dùng tiếng Anh, nội dung giao diện tiếng Việt. Trang Đội ngũ chỉ công khai thông tin nghề nghiệp của 10 hồ sơ hoạt động đã đối chiếu. [Quy tắc, URL và nghiệm thu](PORTAL_ACCESS_AND_ROUTES.md).

Tóm tắt các lựa chọn chủ trung tâm đã chốt. Quy định chi tiết nằm ở tài liệu được dẫn; trạng thái triển khai ở [PROJECT_STATUS](PROJECT_STATUS.md). Mã cũ hoặc prototype không tự thay thế quyết định hiện hành.

## Website và nhận diện

Repository này là nguồn phát triển/phát hành chính thức. Mã nguồn công khai; quyền sử dụng nội bộ nhóm gia sư CSAT theo [LICENSE](../LICENSE.md). Gói nguồn, version/tag và checksum theo [RELEASES](RELEASES.md). Email công khai: contact@csatoj.vn, csattutor@gmail.com và phantranthiennhan1310@gmail.com; không tự cấp quyền Google/GitHub từ việc công bố email.

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

Chặng lớp dựa số buổi completed đã kết thúc từ đầu lớp, không theo tháng hoặc nghỉ riêng; thiếu aggregate dùng chặng gia sư công bố. Thanh pixel **Tiến độ lộ trình lớp** lấy số buổi đã hoàn thành chia tổng số nội dung của các chặng hiệu lực theo giáo án lớp (sau chọn tầng/loại trừ), tối đa100%; mỗi nội dung tương ứng một buổi dự kiến theo quyết định05/11. Thiếu số buổi hoặc nội dung thì không hiện phần trăm. Giữ số buổi thật khi vượt dự kiến; không hiện chú thích số buổi hoàn thành/dự kiến dưới thanh. Đây là chỉ báo nhịp lớp, không gán chủ đề cho buổi, ghi nhận thành thạo hoặc tự công bố.

Trang phụ huynh dùng palette mới `#1F06AC #0F42C0 #5882E8 #E3EF4F #E3F2FD`, giữ Archivo/neo brutalism và menu trái; nền trang mặc định trắng, không dùng nền trang trí. Ô số ngày nộp bài trên hồ sơ mang nhãn **CSAT cùng con luyện tập**, đơn vị **ngày** dưới số, cố định12 tháng gần nhất và không hiện chú thích kỳ; không đổi số này khi chọn năm của lịch. Nhịp luyện tập tách ba ô có màu riêng: lượt nộp theo kỳ (xanh), bài đã thử tích lũy (xanh nhạt), bài giải đúng tích lũy (vàng). Chi tiết thi đấu mở sẵn, bỏ nút làm mới thông thường và tải summary mới một lần mỗi lần mở cổng. **Định hướng phát triển của lớp** nằm cuối Đồng hành cùng con, sau gia sư/học phí. Điện thoại mở sẵn nội dung học, dùng nút sang trang bản đồ riêng có kiểm quyền; desktop giữ bản đồ trong báo cáo. Không đổi nhận diện public/staff.

## Đăng ký, truy cập và bảo vệ

- **Định hướng phụ huynh đã chốt:** đăng nhập Google → nhập số điện thoại → tự liên kết ngay khi khớp hồ sơ phụ huynh hợp lệ gắn học sinh và số chưa có chủ liên kết. Chủ trung tâm chọn **không OTP, không admin duyệt, không mã mời Portal**, thay đề xuất mã mời trước đó. Google không chứng minh sở hữu số tự nhập; người biết số chưa được nhận liên kết vẫn có thể nhận quyền xem, SEC-02 tiếp tục mở. Mã Google/claim đã phát hành04/11; nghiệm thu trên bộ dữ liệu sau reset còn chờ. [Cấu trúc và chuyển đổi](PARENT_IDENTITY_DATABASE_DESIGN.md).
- **Giới hạn liên kết đã chốt:** một tài khoản phụ huynh – một số điện thoại – một học sinh; mỗi học sinh chỉ một phụ huynh. Google khác nhập số đã được liên kết phải nhận lỗi, không được ghi đè/chuyển quyền; cùng tài khoản thử lại nhận kết quả hiện có. Chuẩn hóa phone và cưỡng chế unique/transaction ở DB kể cả hai yêu cầu đồng thời. Thay hướng nhiều con/nhiều phụ huynh trước đây; migration30 đã áp Supabase hiện tại, cưỡng chế tại database.
- Admin OJ tạo mã kết nối tài khoản học sinh; admin Portal chọn hồ sơ học sinh rồi đổi mã, lưu instance/profile/grant revision. Phụ huynh và admin xem dữ liệu OJ qua mapping học sinh này; quyền phụ huynh độc lập với grant OJ. Không dùng mã OJ cho phụ huynh; không tự tạo thêm đăng nhập học sinh Portal từ yêu cầu này. Docs OJ còn mô tả mã mời là hướng cũ của phần Portal; hợp đồng API OJ vẫn giữ.
- Đăng ký/tư vấn **lưu chung** `consultation_requests`. Consent và nút **Đăng kí ngay** gửi trực tiếp; chỉ báo thành công khi database xác nhận. Giữ dữ liệu khi lỗi, chống trùng bằng request ID; không tự tạo học sinh/xếp lớp.
- Khóa quan tâm mặc định theo trang lớp; không khôi phục Sinh viên, Đại học, mục tiêu HSG Quốc gia hoặc cấp học Trao đổi thêm. Học liệu giữ xem lại/sao chép/liên hệ, chưa gửi tự động.
- Email trung tâm bổ sung sau; đơn intake v2 không tạo outbox. Chưa bật gửi mail, không coi chỉ bật cờ cũ là đã nối email cho đơn mới.
- **Chuyển đổi Auth:** Google/claim đã phát hành04/11; lookup27 là lịch sử đã thu hồi, không cấp/reset theo provisioning26. Giữ toàn bộ Auth, quyền admin/gia sư; role phụ huynh là liên kết bổ sung. Admin chuyển/khóa bằng revision và lý do tới Google đã đăng nhập.
- Gia sư/admin giữ Supabase Auth. Chống spam login dùng budget chung theo nguồn trong DB; quyền dữ liệu tiếp tục kiểm tra ở máy chủ/RPC.
- Turnstile **chỉ ở đăng nhập phụ huynh và gia sư/admin**, không ở đăng ký/tư vấn. Kiểm Siteverify phía server; CAPTCHA không chứng minh danh tính.
- Vercel Bot Protection dùng **Log**, chưa chặn diện rộng. CSP **Report-Only**; chưa tự enforce, thêm WAF rule hoặc đổi cơ chế truy cập. [Bảo vệ website](PUBLIC_SECURITY.md).

## Vận hành và giới hạn phạm vi

- Gia sư được ghi nhận **toàn bộ dư nợ dương từng chứng từ đã chốt thuộc lớp đang phụ trách**; không thu tạm tính/từng phần/hoàn/đảo. Kiểm lại phân công, expected balance, request ID và actor trong RPC. Admin giữ quyền chốt/đính chính/hoàn/đảo; lịch sử thu giữ nguyên khi đổi gia sư.
- **Reset04/11 thay quyết định03/11:** giữ toàn bộ Auth, gia sư/hồ sơ/avatar/Storage, đơn tư vấn/lịch sử, chương trình/template/default/registry và audit. Xóa lớp/phân công/giá/thành viên/giáo trình lớp, học sinh/phụ huynh/liên kết Portal/OJ cùng phát sinh; không xóa dữ liệu CSATOJ. Nhập một lớp B/nhóm,4 học sinh/4 phụ huynh từ Markdown riêng; phí trung tâm80.000đ/buổi, học phí100.000đ/học sinh/buổi, thời hạn04/11–31/12/2026 theo xác nhận sau cùng. Chưa tạo buổi/điểm danh/OJ grant. Cập nhật10 hồ sơ/ảnh khớp tên/email;8 chưa khớp vẫn chờ admin. Backup phải phục hồi/diễn tập, reset+nhập liệu atomic qua RPC, so fingerprint bảo toàn. Đợt này đã thực hiện; không coi là quyền reset định kỳ. Công cụ mới `portal-reinitialize.cjs`; CLI reset cũ vẫn bị chặn. [Bằng chứng và vận hành](DATABASE_REINITIALIZATION_20261104.md).

- **Hồ sơ gia sư:** hiển thị thành tích và chứng chỉ (mỗi loại nhiều mục), trường đại học, giới thiệu bản thân. Tái dùng `achievements`, `university`, `introduction` đã có trong schema/mã local; migration31 bổ sung `certificates`. Lưu thành công hiển thị ngay, gia sư sửa của mình/admin sửa theo quyền; không tự tạo thành tích/chứng chỉ. [Thiết kế hồ sơ](TUTOR_PROFILES_20260923.md).
- **Node.js 24** cho local/CI/deploy. Local QA dùng Edge, không cài Chromium local; CI cài Chromium trên runner.
- Tiếp tục dùng gói Vercel/Supabase miễn phí theo ngân sách đã chọn. Không tự nâng gói/đổi hosting; điều kiện sử dụng và quota phải đối chiếu trước thay đổi. Chủ trung tâm xác nhận usage ổn, chưa có staging Supabase.
- Search Console dùng URL-prefix `https://portal.csatoj.vn/` và tệp HTML do chủ trung tâm cung cấp; chủ trung tâm phụ trách xác minh/gửi sitemap.
- Backup lưu tại `F:\csat_backup`; lịch tự động, mã hóa, bản ngoài máy và thời hạn lưu/xóa chưa chốt. Không tự restore đè production hoặc dùng dump thật làm fixture.
- Ngoài đợt reset nhập lại đã chốt, không reset/xóa lịch sử để sửa nghiệp vụ; không sửa migration đã phát hành hoặc tính lại kỳ cũ bằng giá hiện tại. Sau khởi tạo lại vẫn giữ snapshot/audit và dùng đính chính. Chốt sổ/công bố do người có quyền thao tác; cron chỉ nhắc việc/tổng hợp.
- CSATOJ và Storage thật thuộc cổng nghiệm thu của kế hoạch; email, luồng mời/đổi mật khẩu gia sư và tái cấu trúc module là backlog riêng. Không tạo số liệu, giáo trình hoặc cam kết đầu ra giả.

## Duy trì quyết định

Trang phụ huynh theo lựa chọn04/11: bản gọn, Việt hóa và giải thích phụ. Tổng quan OJ giữ bài đã làm thử/bài giải đúng/lượt nộp; lịch **lượt nộp theo ngày** nằm đầu báo cáo sau hồ sơ học sinh và giãn trọn bề ngang, không phải lịch bài AC. Menu trái chia nhóm; giữ trình tự các nội dung còn lại. Bỏ bảng số liệu theo ngày và nút tổ chức khỏi trang phụ huynh; giữ nhãn ngày/tooltip/bàn phím và các cảnh báo dữ liệu thiếu. Hạng lớp/toàn cuộc thi theo đúng buổi/cuộc thi. Điểm và hạng rating chuyển vào Chi tiết thi đấu, bỏ performance khỏi UI, giữ API tương thích. Tiêu đề dùng palette phụ huynh hiện hành nêu trên, viền và bóng rõ. [Contract OJ](CSATOJ_PARENT_DATA_CONTRACT.md) chốt dữ liệu Portal cần; activity là phần mở rộng OJ còn phải triển khai/nghiệm thu, không tự suy lịch từ số bài đúng.

Cập nhật mục tương ứng khi có lựa chọn mới, bỏ phương án hết hiệu lực khỏi hướng dẫn hiện hành và dẫn đúng tài liệu nghiệp vụ. Git giữ lịch sử; tài liệu vận hành giữ bằng chứng tối thiểu. Phân biệt rõ **đã chốt**, **đã triển khai** và **đã nghiệm thu**.

## Trang Tự học

Theo yêu cầu chủ trung tâm, `/tu-hoc` dùng nguyên nội dung, nhánh học, cấu trúc sơ đồ/danh sách và tương tác từ project `csat-roadmap`, thay phần hero/diễn giải của bản cũ. Giữ menu/logo và Archivo của website, lời mời đăng ký dẫn `/lo-trinh#tu-van`. Thiết kế hiện hành dùng cây dọc: Tự học là trang giấy cuộn tự nhiên, mục lục/CTA nổi trái và toolbar nổi dưới; Portal dùng khung cây dọc riêng, thẻ số buổi ngoài giấy, tô toàn chặng và bỏ mục lục nội bộ. Snapshot này là tài liệu tự học; không thay khung chuẩn/giáo án công bố hoặc bài đọc phụ huynh. [Nguồn và cách tích hợp](KNOWLEDGE_MAP.md).
