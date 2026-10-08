# Chuyên đề học tập dành cho phụ huynh

## Quyết định và phạm vi

Trang phụ huynh giữ tóm tắt, định hướng và chặng lớp ngay sau nhận xét. Nút **Đọc chuyên đề** mở bài riêng trong Portal. Thư viện đủ 43 chủ đề A9/B15/C19 khi hoàn thiện, dự kiến 54 bài: B09 bốn bài; C01 hai; C07 ba; C09/C11/D03/D06/D07 mỗi chủ đề hai; còn lại một. Series không tăng số chủ đề hoặc quy định thêm số buổi.

Bộ mẫu A04, B14, C01 và D03 đã được chủ trung tâm duyệt kế hoạch để nhân rộng, kèm quy tắc biên tập mới. Thư viện triển khai đủ 54 bài cho 43 chủ đề; E/K vẫn bổ sung sau. Đây là nội dung và mã local, chưa phát hành production.

VNOI là nguồn tham khảo cách lập luận; USACO Guide/Viblo đối chiếu kỹ thuật; CS50 hỗ trợ nhập môn. Nội dung, ví dụ và code được viết riêng. Tư duy và Nội dung học mỗi phần 3–5 ý, tiếp nối bằng bài toán, nhận xét, cách giải, tính đúng, code/mã giả, độ phức tạp, trường hợp biên và thực hành. Tiếng Việt mạch lạc, giải nghĩa thuật ngữ, không ghi phiên bản C++ trên bài. Code trọng tâm viết thoáng; ngầm hiểu namespace std, không hiển thị dòng khai báo hoặc tiền tố `std::`. Giữ giả thiết đầu vào và giải thích ngữ cảnh của đoạn mã; khung biên dịch kiểm chứng bổ sung namespace này.

Cuối mỗi bài có **Tự kiểm tra** với hai câu hỏi ngắn về lý thuyết, chi phí hoặc điều kiện áp dụng. Đáp án mở bằng native disclosure, đóng mặc định, dùng được bằng bàn phím và khi không JavaScript; bản in hiện đáp án. Markdown dùng hai blockquote có nhãn `Câu hỏi 1:`/`Câu hỏi 2:` và `Trả lời:`, renderer chuyển cấu trúc đã nhận diện sang `details`, không cho chạy HTML tùy ý. **Nguồn tham khảo thêm** chỉ ghi tên và liên kết. Bảng/sơ đồ giải thích trực tiếp phần trừu tượng; liên kết YouTube thật đặt gần phần liên quan, không nhúng player hoặc tải video về repo. Xác minh liên kết không đồng nghĩa đã xem toàn video. Nguồn/giới hạn kiểm chứng tại [nghiên cứu](PARENT_TOPIC_RESEARCH.md).

## Nguồn và ranh giới

- `content/parent-topics/*.md`: toàn văn, Markdown không HTML/MDX. `lib/parent-topic-catalog/{ab,bc,cd}.json` giữ metadata; `lib/parent-topics.ts` kiểm tra kiểu và ghép danh mục theo mã/thứ tự. Không lưu dữ liệu học sinh hoặc đưa toàn văn thư viện vào client.
- Khung chuẩn vẫn là `lib/learning-curriculum-20260922.json`. Chỉ ghép bài khi program/source/toàn bộ stages trùng khung chuẩn, body và template có cùng ID; không ghép theo tên gần giống. Khác thứ tự khóa JSONB không ảnh hưởng; mã, thứ tự hoặc nội dung khác thì dùng mô tả hiện có.
- Admin/gia sư chọn A/B/A+B, bỏ/khôi phục chặng/chủ đề và công bố theo luồng hiện hành. Không có CMS, tạo chủ đề mới hay sửa toàn văn bài trên UI trong đợt này.
- C là tên hiển thị nâng cao cho C/D; vẫn giữ mã C01–D07 và scope CD. PreVOI định hướng dùng E, lớp chưa có giáo án dùng K trong đợt bổ sung sau; không tự chuyển lớp/template/enum hiện hành. Đây là mapping đào tạo tương lai, không thay điều kiện tuyển E.

## Đọc bài riêng

`/parents/chuyen-de/[slug]?student=<uuid>&class=<uuid>&month=YYYY-MM&page=N` kiểm tra cookie lookup và RPC hiện hành ở máy chủ. Học sinh phải thuộc phiên, lớp có giáo án đã công bố, chủ đề thuộc giáo án hiệu lực sau lựa chọn/loại trừ. Bản nháp, khung tùy chỉnh, chủ đề bị loại và liên kết đã thu hồi không mở được bằng URL trực tiếp. Proxy chỉ gắn header, không thay kiểm tra quyền.

Không phiên → về login; phiên hết hạn/thu hồi → thông báo truy cập; slug/ngữ cảnh không hợp lệ hoặc chuyên đề không thuộc lớp → 404. Lỗi dịch vụ → thông báo thử lại, không trả bài. Không log/hash/token/số điện thoại vào URL. Trang private/no-store, noindex/noarchive, không có trong sitemap/bài đăng công khai. Nội dung tĩnh trong repo, trang đọc động kiểm tra phiên; không phải public SSG.

Series mở từ bài đầu, có danh sách cùng chuyên đề và bài trước/sau. Nút về lộ trình giữ học sinh/tháng/phân trang. Heading có anchor duy nhất, mục lục desktop và native disclosure thu gọn trên mobile. Code C++ tô cú pháp ở máy chủ, nền tối và monospace riêng; mã giả cùng khung, có nhãn. Sao chép nguyên văn; không chạy code. Markdown bỏ HTML, không thực thi MDX. Nội dung vẫn đọc khi no-JS; khối code cuộn trong khung và xuống dòng khi in. Next tracing đưa Markdown vào gói deploy, không phụ thuộc scratch. Dock/gợi ý học liệu quảng bá của header không hiển thị trong ParentShell để tránh che bài đọc; liên hệ CSAT vẫn ở phần kết nối của Portal.

## Chặng lớp theo buổi đã hoàn thành

Migration `20261008_23_parent_class_progress.sql` mở rộng RPC bằng `class_progress?` gồm class_id/completed_sessions/as_of. Migration chỉ phụ thuộc khung 20, bảo toàn projection/quyền hiện hành và các trường 21/22 khi có; đã áp production 08/10/2026. Chạy 18/19/21/22 sau 23 vẫn giữ aggregate, được kiểm chứng bằng fixture thử. Count mọi session completed đã kết thúc theo giờ Việt Nam của lớp từ đầu lịch sử; bỏ cancelled/future, không theo tháng hoặc điểm danh cá nhân. Lớp liên kết active và giáo án class published mới có aggregate.

Chặng là chỉ báo định hướng theo giáo án hiệu lực: N buổi tương ứng chủ đề thứ N, hiển thị toàn chặng chứa chủ đề; zero là chuẩn bị chặng đầu, vượt số chủ đề giữ chặng cuối. Thiếu aggregate không coi là zero: fallback chặng gia sư công bố, nếu thiếu chỉ đọc lộ trình. Không ghi tự động, không suy thành thạo hoặc hoàn tất khóa. Không sửa buổi, học phí, snapshot hay bản công bố.

## Kiểm chứng và phát hành

Node24; kiểm tra quyền route và RPC, hiệu lực A/B/exclusions, JSONB ordering, fallback backend cũ, series/link/file integrity. Browser fixture qua RPC giả loopback dùng route thật, Microsoft Edge; không có route bypass và không đọc hồ sơ thật. Runner `scripts/run-parent-topics-ui.cjs` dùng bản build, output/HTML duyệt chỉ trong scratch.

Kiểm thử repo/database/type/lint/build và browser không thay nghiệm thu staging. Áp migration/deploy production cần phạm vi ủy quyền riêng. Giới hạn xác minh danh tính lookup SEC-02 vẫn ở [trạng thái](PROJECT_STATUS.md), không coi trang private mới là đã giải quyết.

Node 24.19.0 local: guard 524 tệp không có findings; repo tests 11/11 và database/API 242/242 không skip; typecheck, lint strict và build đạt. Test xác minh đủ 43 mã/54 bài, không bài mồ côi, thứ tự chuỗi và hai câu hỏi có đáp án từng bài. File tracing của route bao gồm toàn bộ Markdown.

Compiler portable Zig 0.15.2/Clang: **89/89 khối C++ biên dịch thành object đạt**, thêm header/`main` và fixture đúng điều kiện cho các đoạn rời. Chạy C++ thực đối chiếu với cách giải độc lập đạt **78.321 kiểm tra**: modulo sát giới hạn số nguyên, lũy thừa/cơ số, cộng dồn, hai con trỏ, nhị phân trên đáp án, cái túi, tham lam, LIS/LCS và truy vết, khoảng cách chỉnh sửa, chọn đúng k phần tử, gộp đoạn, đường đi và số học. Vòng cập nhật cái túi lấy trực tiếp từ bài, đưa đầu vào thử đa dạng. Kết quả không thay đánh giá sư phạm hoặc chứng minh cho mọi dữ liệu; nguồn và kiểm chứng độc lập Node ghi trong [nghiên cứu](PARENT_TOPIC_RESEARCH.md). Công cụ/báo cáo compiler ở scratch, không là dependency runtime.

Phát hành dùng Next.js và eslint-config-next 16.3.8 sau khi đối chiếu advisory chính thức; audit không còn mục Next.js. Audit toàn repo 08/10/2026 còn 28 cảnh báo (2 critical, 18 high, 7 moderate, 1 low), gồm dependency công cụ; chưa xem đây là chứng nhận an toàn toàn bộ. Không nâng hàng loạt hoặc bỏ qua kiểm tra quyền.

Browser QA local 08/10/2026 trên bản build placeholder qua mock RPC loopback và Edge: **20 nhóm/3.546 assertions đạt**, không browser errors hoặc thao tác backend ngoài dự kiến. Bao gồm cookie hết hạn/thu hồi, RSC prefetch không vượt quyền, unpublished/excluded/custom/wrong student/class, 54 bài và 43 liên kết bài đầu, chặng 5 buổi/zero/fallback/đổi tháng, 320/375/768/1440 và reflow 200%, keyboard, no-JS, dark/reduced motion, copy và A4. Hai đáp án đóng mặc định, Enter/Space mở và đóng, không JavaScript vẫn mở; bản in hiện đáp án ngay cả khi trước đó đóng. Đã xem ảnh desktop/mobile và phần hỏi–đáp. Clipboard Windows chỉ chuẩn hóa LF/CRLF khi so sánh, giữ nguyên chữ và thụt dòng.

Sau khi tinh chỉnh cách gọi tổng tập con và bảng D07 chỉ tới tổng 7, đã đọc/xuất lại hai bài D04/D07 trên Edge: một nhóm có lọc/128 assertions đạt, không lỗi browser/request ngoài dự kiến. Không cộng kiểm tra này vào số nhóm toàn thư viện.

Bộ HTML duyệt và ảnh/PDF/báo cáo ở `scratch/parent-topics-qa/`, ngoài Git, chỉ dữ liệu giả. HTML offline không dùng để kiểm chứng quyền; quyền được kiểm chứng trên route thật trong runner. Chạy runner sau build fixture với `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329`, các key placeholder/email tắt và Node24; Next đóng băng NEXT_PUBLIC URL nên URL build phải trùng mock port. Runner fail khi port đã có chủ, không tự gọi server đó. Không mở server fixture thành một cổng đăng nhập thay thế cho người dùng.

Nếu chỉ biên tập một vài bài, dùng `PARENT_TOPICS_QA_ARTICLE_SLUGS` (danh sách slug phân cách dấu phẩy) cùng `PARENT_TOPICS_QA_FILTER='articles, HTTP'` để đọc và xuất lại đúng những bài ấy. Slug rỗng hoặc lạ bị từ chối. Kiểm tra có lọc không được báo là đã chạy lại cả 20 nhóm.

## Renderer và nguồn nội dung đã chốt

Chủ trung tâm chọn giữ Markdown trong repo, không triển khai database/CMS cho thư viện. 54 bài khoảng 334 KiB; biên tập bằng Markdown, catalog có kiểu dữ liệu và Git review.

Renderer server chỉ import C++/github-dark và engine Oniguruma của Shiki; giữ nguyên token/màu, kiểm chứng lossless 89 khối code. Một highlighter dùng lại trên mỗi worker. Cache tối đa 54 Promise của phần thân bài và mục lục theo nội dung Markdown; lỗi render bị xóa khỏi cache. Cache không có tên lớp, học sinh, cookie, URL ngữ cảnh hoặc dữ liệu RPC. Route vẫn kiểm tra phiên, liên kết và bản công bố trước mỗi lần đọc; phản hồi vẫn private/no-store. Cache này là bộ nhớ của worker, không phải CDN hay cache phiên.

Đo file tracing local Node24/Next16.3.8: 287 file, 5.129.386 byte (~4,9 MiB), Shiki 28 file/1.786.539 byte (~1,7 MiB), đủ 54 Markdown. Trước tối ưu: 14.224.873 byte (~13,6 MiB), Shiki 10.940.943 byte. Tổng giảm khoảng 64%, phần Shiki giảm khoảng 84%; số liệu tracing không phải kích thước Function Vercel, RAM hay cold start thực tế. HTML bài khoảng 58–93 KB, gzip ước lượng 12–18 KB trước tối ưu, chưa gồm asset tải riêng. Không chạy chương trình C++ trên Vercel. Theo [Shiki](https://shiki.style/guide/best-performance), import hẹp và tái sử dụng instance phù hợp mục tiêu giảm tải.

Phát hành 08/10/2026: Node24.19.0, guard/repo11 tests, database/API243 tests không skip, typecheck/lint strict/build đạt. Edge: phụ huynh20 nhóm/3.600 assertions; public40 nhóm/32 bố cục/478 assertions. CI dùng Chromium trên runner riêng; local tiếp tục Edge. Phần phụ huynh private cũng chạy trong CI bằng mock RPC/dữ liệu giả. Production đã áp duy nhất migration23, lưu cấu trúc/grants RPC và rollback SQL nội bộ; không sao lưu hồ sơ trong đợt này. Đối chiếu bảng ứng dụng, projection và quyền trước/sau đạt, phiên không hợp lệ vẫn bị từ chối. URL deployment/CI và giới hạn nghiệm thu được duy trì trong PROJECT_STATUS.
