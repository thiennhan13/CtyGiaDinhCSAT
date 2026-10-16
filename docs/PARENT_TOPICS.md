# Chuyên đề học tập dành cho phụ huynh

Cơ chế truy cập ở [PARENT_PHONE_ACCESS](PARENT_PHONE_ACCESS.md); CAPTCHA ở [LOGIN_CAPTCHA](LOGIN_CAPTCHA.md). Trạng thái phát hành/kiểm chứng ở [PROJECT_STATUS](PROJECT_STATUS.md).


## Quyết định và phạm vi

Trang phụ huynh giữ tóm tắt, định hướng và chặng lớp ngay sau nhận xét. Nút **Đọc chuyên đề** mở bài riêng trong Portal. Thư viện đủ 43 chủ đề A9/B15/C19, gồm 54 bài: B09 bốn bài; C01 hai; C07 ba; C09/C11/D03/D06/D07 mỗi chủ đề hai; còn lại một. Series không tăng số chủ đề hoặc quy định thêm số buổi.

Bộ mẫu A04, B14, C01 và D03 đã được chủ trung tâm duyệt kế hoạch để nhân rộng, kèm quy tắc biên tập mới. Thư viện triển khai đủ 54 bài cho 43 chủ đề; E/K vẫn bổ sung sau.

VNOI là nguồn tham khảo cách lập luận; USACO Guide/Viblo đối chiếu kỹ thuật; CS50 hỗ trợ nhập môn. Nội dung, ví dụ và code được viết riêng. Tư duy và Nội dung học mỗi phần 3–5 ý, tiếp nối bằng bài toán, nhận xét, cách giải, tính đúng, code/mã giả, độ phức tạp, trường hợp biên và thực hành. Tiếng Việt mạch lạc, giải nghĩa thuật ngữ, không ghi phiên bản C++ trên bài. Code trọng tâm viết thoáng; ngầm hiểu namespace std, không hiển thị dòng khai báo hoặc tiền tố `std::`. Giữ giả thiết đầu vào và giải thích ngữ cảnh của đoạn mã; khung biên dịch kiểm chứng bổ sung namespace này.

Cuối mỗi bài có **Tự kiểm tra** với hai câu hỏi ngắn về lý thuyết, chi phí hoặc điều kiện áp dụng. Đáp án mở bằng native disclosure, đóng mặc định, dùng được bằng bàn phím và khi không JavaScript; bản in hiện đáp án. Markdown dùng hai blockquote có nhãn `Câu hỏi 1:`/`Câu hỏi 2:` và `Trả lời:`, renderer chuyển cấu trúc đã nhận diện sang `details`, không cho chạy HTML tùy ý. **Nguồn tham khảo thêm** chỉ ghi tên và liên kết. Bảng/sơ đồ giải thích trực tiếp phần trừu tượng; liên kết YouTube thật đặt gần phần liên quan, không nhúng player hoặc tải video về repo. Xác minh liên kết không đồng nghĩa đã xem toàn video. Nguồn/giới hạn kiểm chứng tại [nghiên cứu](PARENT_TOPIC_RESEARCH.md).

## Nguồn và ranh giới

Đợt chuẩn hóa có [bảng đối chiếu 54 bài](PARENT_LESSON_AUDIT.md) với khung chuẩn, roadmap và PDF, kèm phản ví dụ/đề xuất ngoài khung. Mỗi bài có mục **Luyện tập**, giữ hoạt động hiện có và nút **Bài tập cùng chủ đề trên CSATOJ**. Series dùng chung tag chủ đề, không coi là bài giao riêng hoặc bằng chứng thành thạo.

`lib/csatoj-practice.ts` tạo URL từ mapping tag đã xác minh trong `lib/knowledge-map-links.json`; Tự học và Portal dùng chung helper. Renderer bài riêng không import dữ liệu toàn trang Tự học. Không thêm URL vào 54 Markdown; mã không có mapping hợp lệ trả về `undefined`. Mapping mới chỉ được đưa vào nguồn này sau khi kiểm đích. Nút mở tab mới, không gửi ngữ cảnh học sinh/lớp/tháng hoặc referrer sang OJ.

- `content/parent-topics/*.md`: toàn văn, Markdown không HTML/MDX. `lib/parent-topic-catalog/{ab,bc,cd}.json` giữ metadata; `lib/parent-topics.ts` kiểm tra kiểu và ghép danh mục theo mã/thứ tự. Không lưu dữ liệu học sinh hoặc đưa toàn văn thư viện vào client.
- Khung chuẩn vẫn là `lib/learning-curriculum-20260922.json`. Chỉ ghép bài khi program/source/toàn bộ stages trùng khung chuẩn, body và template có cùng ID; không ghép theo tên gần giống. Khác thứ tự khóa JSONB không ảnh hưởng; mã, thứ tự hoặc nội dung khác thì dùng mô tả hiện có.
- Admin/gia sư chọn A/B/A+B, bỏ/khôi phục chặng/chủ đề và công bố theo luồng hiện hành. Không có CMS, tạo chủ đề mới hay sửa toàn văn bài trên UI trong đợt này.
- C là tên hiển thị nâng cao cho C/D; vẫn giữ mã C01–D07 và scope CD. PREVOI (PreVOI/HSGQG/Ôn thi VOI) dùng giáo án riêng, không E. Nội dung E/K/PREVOI chưa được cung cấp không tự sáng tác hoặc dùng đổi nhãn để chuyển template/giáo án lớp cũ.

## Đọc bài riêng

`/parents/chuyen-de/[slug]?student=<uuid>&class=<uuid>&month=YYYY-MM&page=N` kiểm tra cookie lookup và RPC hiện hành ở máy chủ. Học sinh phải thuộc phiên, lớp có giáo án đã công bố, chủ đề thuộc giáo án hiệu lực sau lựa chọn/loại trừ. Bản nháp, khung tùy chỉnh, chủ đề bị loại và liên kết đã thu hồi không mở được bằng URL trực tiếp. Proxy chỉ gắn header, không thay kiểm tra quyền.

Không phiên → về login; phiên hết hạn/thu hồi → thông báo truy cập; slug/ngữ cảnh không hợp lệ hoặc chuyên đề không thuộc lớp → 404. Lỗi dịch vụ → thông báo thử lại, không trả bài. Không log/hash/token/số điện thoại vào URL. Trang private/no-store, noindex/noarchive, không có trong sitemap/bài đăng công khai. Nội dung tĩnh trong repo, trang đọc động kiểm tra phiên; không phải public SSG.

Series mở từ bài đầu, có danh sách cùng chuyên đề và bài trước/sau. Nút về lộ trình giữ học sinh/tháng/phân trang. Heading có anchor duy nhất, mục lục desktop và native disclosure thu gọn trên mobile. Code C++ tô cú pháp ở máy chủ, nền tối và monospace riêng; mã giả cùng khung, có nhãn. Sao chép nguyên văn; không chạy code. Markdown bỏ HTML, không thực thi MDX. Nội dung vẫn đọc khi no-JS; khối code cuộn trong khung và xuống dòng khi in. Next tracing đưa Markdown vào gói deploy, không phụ thuộc scratch. Dock/gợi ý học liệu quảng bá của header không hiển thị trong ParentShell để tránh che bài đọc; liên hệ CSAT vẫn ở phần kết nối của Portal.

## Chặng lớp theo buổi đã hoàn thành

Roadmap nhận `practiceLinks` tùy chọn và `variant="parent"`; caller khác giữ mặc định. Trang phụ huynh chỉ truyền liên kết cho khung chuẩn đã công bố và các chủ đề trong giáo án hiệu lực. **Chặng đang tập trung** tách khỏi **Chặng đang xem**; xem chặng không ghi tiến độ. Chủ đề mở bằng native disclosure, có hai hành động đọc và luyện tập. Khi không JS, phần toàn bộ nội dung vẫn mở được.

CSS mới chỉ nằm trong `.parent-portal .parent-roadmap` và phần đọc chuyên đề: kem/cobalt, lime cho nhãn và tự kiểm, cam cho trọng tâm/luyện tập, viền và bóng cứng. Bài dài giữ nền sáng, có token dark tương ứng; không đổi nhận xét, buổi học, phí hay liên hệ.

Migration `20261008_23_parent_class_progress.sql` mở rộng RPC bằng `class_progress?` gồm class_id/completed_sessions/as_of. Migration chỉ phụ thuộc khung 20, bảo toàn projection/quyền hiện hành và các trường 21/22 khi có. Chạy 18/19/21/22 sau 23 vẫn giữ aggregate, được kiểm chứng bằng fixture thử. Count mọi session completed đã kết thúc theo giờ Việt Nam của lớp từ đầu lịch sử; bỏ cancelled/future, không theo tháng hoặc điểm danh cá nhân. Lớp liên kết active và giáo án class published mới có aggregate.

Chặng là chỉ báo định hướng theo giáo án hiệu lực: N buổi tương ứng chủ đề thứ N, hiển thị toàn chặng chứa chủ đề; zero là chuẩn bị chặng đầu, vượt số chủ đề giữ chặng cuối. Thiếu aggregate không coi là zero: fallback chặng gia sư công bố, nếu thiếu chỉ đọc lộ trình. Không ghi tự động, không suy thành thạo hoặc hoàn tất khóa. Không sửa buổi, học phí, snapshot hay bản công bố.

## Renderer và nguồn nội dung

Giữ Markdown trong repo, không database/CMS. Renderer server chỉ import C++/github-dark và engine Oniguruma của Shiki; tái sử dụng highlighter trên worker. Cache tối đa 54 Promise thân bài/mục lục theo nội dung và mã chủ đề công khai, xóa lỗi render khỏi cache. Không cache chung học sinh/lớp/cookie/URL ngữ cảnh hoặc kết quả RPC.

Route kiểm phiên, liên kết và bản công bố **trước mỗi lần đọc**, kể cả khi thân bài đã cache. Phản hồi private/no-store, không CDN cache. Next file tracing đóng gói Markdown; không chạy C++ trên Vercel.

Đối chiếu renderer đã ghi nhận: tracing giảm khoảng 13,6 xuống 4,9 MiB, gồm đủ 54 Markdown; đó không phải kích thước Function, RAM hoặc cold start thật. [Shiki performance](https://shiki.style/guide/best-performance).

## Biên tập và kiểm chứng

1. Sửa Markdown và metadata đúng mã/thứ tự; không đổi khung giáo án chỉ vì chia thêm bài.
2. Kiểm đủ 43 mã/54 bài, liên kết bài đầu, trước/sau, không bài mồ côi và hai câu hỏi có đáp án.
3. Kiểm ví dụ/code bằng dữ liệu nhỏ, biên và cách giải độc lập; đặc biệt modulo, nhị phân, cộng dồn/mảng hiệu, hướng duyệt cái túi.
4. Kiểm quyền qua route thật: phiên thiếu/hết hạn/thu hồi, sai học sinh/lớp, unpublished/excluded/custom và RSC prefetch không trả bài.
5. QA đọc responsive/dark/reduced motion/keyboard/no-JS/print/copy; câu trả lời đóng mặc định, bản in hiện đáp án.
6. Kiểm aggregate chặng: zero, nhiều lớp, đổi tháng, nghỉ riêng, vượt số chủ đề và backend thiếu trường.

Lần biên soạn đầy đủ đã biên dịch **89/89 khối C++** và đối chiếu độc lập **78.321 trường hợp**; khung thử bổ sung header/namespace/main cho đoạn rời. Đây là bằng chứng cho bộ bài đã thử, không chứng minh mọi dữ liệu hoặc thay review sư phạm. [Nguồn và giới hạn kiểm chứng](PARENT_TOPIC_RESEARCH.md). Công cụ compiler/HTML duyệt/báo cáo ở scratch, không là runtime.

Runner `scripts/run-parent-topics-ui.cjs` dùng build placeholder, mock RPC loopback và Edge local; CI dùng Chromium. Build cần URL giả `http://127.0.0.1:54329` trùng mock port do NEXT_PUBLIC đóng băng khi build; key placeholder/email tắt. Runner từ chối port đang có chủ, không mở cổng đăng nhập thay thế.

Khi chỉ biên tập vài bài, dùng `PARENT_TOPICS_QA_ARTICLE_SLUGS` (slug cách nhau dấu phẩy) và `PARENT_TOPICS_QA_FILTER='articles, HTTP'`. Slug rỗng/lạ bị từ chối. Không báo ca có lọc là đã chạy cả thư viện; HTML offline không kiểm chứng quyền. Test fixture không thay Supabase staging hoặc hồ sơ thật.

Demo local: sau build placeholder, chạy runner với `PARENT_TOPICS_QA_DEMO=1` (có thể đặt `CSAT_PARENT_QA_PORT`). Runner mở cửa sổ Edge bằng phiên giả, giữ mock RPC loopback; đóng cửa sổ sẽ dọn server do runner tạo. Chế độ này không chạy suite và ghi `report-demo.json` riêng, không ghi đè báo cáo QA. Không có route đăng nhập thay thế hoặc thay đổi quyền ở runtime; liên kết demo chỉ có phiên trong cửa sổ Edge đó.

Giao diện phụ huynh dùng nền chung `SiteBackground`; khối Gia sư chỉ giữ hồ sơ được phân công, bỏ ô gợi ý nội dung trao đổi/nút sao chép liên hệ. Các đoạn dẫn lặp được rút gọn; giữ cảnh báo học phí tạm tính, dữ liệu thiếu và chặng không tương đương thành thạo. Quyền, phiên và dữ liệu RPC không thay đổi.
