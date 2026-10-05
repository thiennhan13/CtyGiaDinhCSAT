# Website công khai CSAT

Tài liệu vận hành giao diện giới thiệu, lộ trình và catalog A/B/C/E/K. Nguồn nghiệp vụ là [chương trình đào tạo](CHUONG_TRINH_DAO_TAO.md) và [catalog](PUBLIC_COURSE_CATALOG.md); thiết kế theo [nhận diện](PUBLIC_UI_DESIGN_SYSTEM.md) và [quy tắc chuyển động](UI_MOTION_WORKFLOW.md).

## Cấu trúc mã

| Phần | Nơi sửa |
|---|---|
| Trang chủ, nội dung và tương tác buổi học | `app/page.tsx`, `components/marketing/HomeExperience.tsx`, `home-experience.css` |
| Hero và đội ngũ dùng chung, trang gia sư công khai | `TutorShowcase.tsx`, `app/gia-su/page.tsx` |
| Lưới/trang bài viết và nội dung frontend | `app/bai-dang/`, `lib/public-posts.ts`, `posts.css`; xem [hướng dẫn bài đăng](PUBLIC_POSTS.md) |
| Học liệu miễn phí, video và form tài liệu | `app/hoc-lieu-mien-phi/page.tsx`, `LearningMaterialsExperience.tsx`, `learning-materials.css`, `PracticeVideo.tsx` |
| Bốn lý do học lập trình thi đấu | `HomeExperience.tsx` (`values`, `LearningValues`), `home-experience.css` |
| Hệ sinh thái gia sư CSAT Tutor | `WhyCSAT.tsx`, `why-csat.css`, `EcosystemIcon.tsx` |
| Liên hệ công khai | `lib/public-contact.ts`, `PublicShell.tsx` (footer), `PublicNavigation.tsx` (dock) |
| Chọn hướng học, hero và các nhóm lớp | `app/lo-trinh/page.tsx`, `components/marketing/RoadmapExperience.tsx`, `roadmap-experience.css` |
| Chi tiết lớp, liên kết cũ | `app/lo-trinh/[program]/page.tsx` |
| Menu, logo, liên hệ, theme | `PublicShell.tsx`, `PublicHeader.tsx`, `PublicNavigation.tsx`, `RoadmapNavigation.tsx`, `public-design.css` |
| Glyph, icon, reveal và phản hồi click | `PublicMotion.tsx`, `PublicFeedback.tsx` |
| Chuẩn bị thông tin tư vấn/tài liệu | `PublicConsultation.tsx` — frontend, kiểm tra và sao chép; API hiện có chưa được nối |

Các thành phần nằm trong `components/marketing/`. CSS giới hạn trong `.csat-public`; không đưa reset hoặc token trang công khai sang nội dung nghiệp vụ. Font Archivo là cấu hình toàn hệ thống. PublicHeader bao scope riêng cho menu tại login/tutor/ParentShell; sidebar, dữ liệu và thao tác phụ huynh nằm ngoài scope đó. Trang dùng React/Next.js trực tiếp, không tải HTML, script hoặc dữ liệu từ prototype.

Bộ HTML trước tích hợp đã được chuyển sang kho nội bộ ngoài Git; server demo cũ đã dừng. Dùng `node scripts/preview-public-site.cjs` để xem ứng dụng tại cổng 3100. Không cần xin bản prototype để phát triển hoặc chạy QA.

Menu “Đội ngũ” đi tới `/gia-su`, “Bài đăng” tới `/bai-dang`, “Trang liên lạc” tới `/login` với switch Phụ huynh/Gia sư. Hai form nằm trong `components/auth/`, giữ xác thực hiện hành; `/tutor` chuyển người chưa đăng nhập tới `/login?role=tutor`. Các đường dẫn công khai mới được khai báo trong `proxy.ts`; việc này không thay quyền của route nghiệp vụ hay API. Thành tích đi tới `/thanh-tich`, khung CSAT riêng với phần học sinh/đội ngũ và liên kết đang hoạt động; chưa có bản ghi, số liệu, lọc hoặc API thành tích. Nội dung kết quả chờ trung tâm cung cấp. Menu thu gọn dưới 1281 px, caption cạnh logo ẩn tại desktop hẹp để tránh chèn ép liên kết.

## Nội dung đã duyệt

- CSAT tập trung vào lập trình thi đấu và tư duy thuật toán; đội ngũ gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu theo nội dung chủ trung tâm duyệt ngày 04/10/2026. Thông điệp tập thể không cập nhật tự động hồ sơ cá nhân trong database.
- A có 9 chủ đề; B có 15; lớp C dùng đủ 19 chủ đề C+D. E là Chủ lực, thi tuyển riêng từ C để học kiến thức khó hơn, hướng đến thứ hạng cao tại HSG Tỉnh và tuyển sinh chuyên Tin; 3–4 học sinh, 2 giờ/buổi, lịch theo thành viên lớp. Giáo trình/học phí E còn chờ trung tâm cung cấp. PreVOI giữ riêng trong quản lý gia sư. Website mời trao đổi lịch, học phí và nền tảng, không tự công bố các thông tin chưa được duyệt.
- K học riêng hoặc nhóm riêng với nội dung tùy chọn; không đồng nghĩa HSGQG. Catalog không thay đổi lớp, mã chủ đề, học phí hay lịch sử đang vận hành.
- Hải Đăng: Thủ khoa khóa 52 chuyên Tin THPT Chuyên Phan Bội Châu; Giải Nhất HSGQG 2025–2026, hạng 3 toàn quốc; Giải Nhì và Giải Ba HSGQG 2023–2025. Không diễn giải thêm loại kỳ thi của danh hiệu thủ khoa.
- Poster cung cấp: Ngô Tuấn Hiệp — Giải Nhì HSGQG, Giải Nhất tỉnh Nghệ An 2025–2026; Trần Đăng Quang — Giải Nhì HSGQG 2024–2025 và 2025–2026; Nguyễn Ngọc Bảo Toàn — Giải Nhì HSGQG 2025–2026, Giải Ba HSGQG 2024–2025.
- Không sử dụng poster thống kê tổng hợp chưa được xác nhận. Ảnh code/sách là tài nguyên hình ảnh, không dùng để khẳng định sách là giáo trình C++ hoặc màn hình là CSATOJ.

## Ảnh, font và video

Tệp phục vụ website nằm trong `public/images/site/`, gồm WebP đã tối ưu từ tài nguyên chủ trung tâm cung cấp. Ảnh nguồn dung lượng lớn, poster và video gốc được loại khỏi Git và gói Vercel; giữ tại máy/kho nội bộ để biên tập. Không xóa nguồn chỉ vì bản tối ưu đã được tạo.

Bản gốc logo, font Space Grotesk đã ngừng dùng và ảnh dẫn xuất không còn tham chiếu được lưu nội bộ ngày 05/10, cùng hồ sơ duyệt HTML; không giữ song song trong gói ứng dụng.

Hai logo compact trong `public/icon/` chỉ thu gọn viewBox, giữ nguyên đường nét và màu SVG gốc. Từ 05/10 toàn hệ thống dùng Archivo với fallback Segoe UI, Lucida Grande, Arial, sans-serif. Không còn tải Space Grotesk/IBM Plex Mono. C+SAT nền dùng SVG outline dẫn xuất từ nét KVANT của logo; không cần cài font KVANT.

Ảnh A+B: `basic-class.webp`; lớp C: `books.webp`. Nhóm ảnh hero lộ trình cùng loại ảnh chụp, cắt thành bốn khung hình học. Theo chỉ định mới 05/10, nhóm Chủ lực dùng comp-program.webp; các ảnh đều cùng khung góc khuyết, lớp blur và màu nền chung. Icon lớn dùng hình học góc cắt đồng nhất; icon thao tác dùng Lucide.

Ba video nguồn đều 4K: coding-screen khoảng 22,6 giây/119 MB, digital 3D render khoảng 19,4 giây/44 MB, writing khoảng 15,9 giây/20 MB. Ngày 05/10, chủ trung tâm chọn writing cho “Không gian luyện tập”, nay nằm tại `/hoc-lieu-mien-phi`, khung **ngang 4:3**, tự phát không tiếng/lặp trong màn hình. Bản phục vụ `public/media/writing-960.webm` dùng VP9 960×720, không audio, khoảng 1,66 MB; poster `writing-poster.webp`. Chỉ tải video khi cần phát; dừng ngoài viewport/tab ẩn; giảm chuyển động/tiết kiệm dữ liệu dùng poster và cho phép chủ động phát. Có nút dừng/phát; no-JS/lỗi media giữ ảnh tĩnh. Hai video còn lại vẫn chờ chọn vị trí. Nguồn giữ ngoài Git; `public/media/` chỉ chứa bản đã duyệt, không phục vụ nguồn 4K nguyên trạng.

## Form frontend và lần kết nối sau

Theo yêu cầu mới ngày 04/10/2026, cả form tài liệu tại `/hoc-lieu-mien-phi` và form tư vấn trên lộ trình/chi tiết lớp đều hoạt động **chỉ ở frontend**. Người dùng nhập thông tin, kiểm tra bản tóm tắt, chỉnh lại hoặc chủ động sao chép để nhắn qua Zalo/Facebook. Nút không mang nhãn gửi và không thông báo trung tâm đã nhận. Khi không JavaScript vẫn có các liên kết liên hệ thật.

Form kiểm tra trường bắt buộc, định dạng email và số điện thoại Việt Nam; có khóa A/B/C/E/K, cấp học, mục tiêu, nền tảng và lời nhắn. Chọn lộ trình trước đó được giữ trong ngữ cảnh tóm tắt. Không gọi endpoint trạng thái hoặc gửi, không lưu vào localStorage/sessionStorage, không đưa thông tin liên hệ lên URL; rời/tải lại trang sẽ mất bản nhập. Clipboard chỉ được ghi khi bấm sao chép; bị chặn thì chọn sẵn nội dung để sao chép thủ công.

`/api/consultations` và endpoint trạng thái vẫn giữ để nối trong đợt sau. **Chỉ bật biến môi trường chưa nối được form mới.** Cần adapter giữa lựa chọn frontend và schema strict hiện tại, consent trước lưu dữ liệu, idempotency/retry, điều kiện migration 18 và QA thực theo [setup](SETUP_VERCEL_SUPABASE.md). Không gửi nguyên các nhãn tiếng Việt hoặc trường mới vào API cũ. Email là công tắc riêng. Chi tiết hợp đồng tương lai đọc [catalog](PUBLIC_COURSE_CATALOG.md); API CSATOJ/giáo trình E đọc [tích hợp tương lai](FUTURE_INTEGRATIONS.md).

## Kiểm thử và phát hành

Chạy các bước bắt buộc trong [AGENTS](../AGENTS.md), sau đó kiểm tra Next.js thật bằng `scripts/check-public-site.cjs` với Playwright được cài trên máy. Runner chỉ cho địa chỉ loopback, chặn mọi request ghi; form dùng dữ liệu giả và clipboard giả để kiểm tra thành công/thất bại. Kiểm tra mobile/desktop, light/dark, bàn phím, không JS, giảm chuyển động, đổi trang và back/forward.

`.vercelignore` loại prototype, ảnh/video nguồn, dữ liệu nội bộ và output kiểm thử khỏi gói CLI. Deploy từ Git chỉ chứa tài nguyên đã qua review. Cấu hình database/email không tự đổi theo deploy. Trạng thái phát hành và bằng chứng mới nhất phải ghi trong [tiến độ](PROJECT_STATUS.md); build local thành công không đồng nghĩa production đã cập nhật.

## Nguồn tham khảo biên tập

[Teach Computing](https://teachcomputing.org/curriculum/key-stage-4) trình bày kiến thức theo sự tiếp nối của khái niệm và kinh nghiệm đã học. [Competitive Programmer’s Handbook](https://cses.fi/book/book.pdf) là nguồn tham khảo cách kết nối ý tưởng, độ phức tạp và nhóm kỹ thuật. Đây là nguồn tham khảo cách giải thích, không bổ sung chủ đề vào giáo trình CSAT. [Crency](https://crency.agency/) là tham khảo bố cục/typography; không sao chép tài nguyên hoặc khẳng định đã kiểm chứng cách triển khai animation của họ.

Biên tập lộ trình ngày 05/10 có agent riêng, tham khảo thêm cách giải thích vấn đề và tư duy từ [CS50](https://cs50.harvard.edu/x/), [VNOI về tham lam](https://wiki.vnoi.info/algo/greedy-new) và [VNOI về hai con trỏ](https://wiki.vnoi.info/algo/basic/two-pointers). Giữ A9/B15/C+D19, E Chủ lực theo cập nhật 05/10, K là học riêng; nguồn tham khảo không phải đối tác CSAT và không thay nội dung đã duyệt.

Menu dùng chung không thay kiểm tra đăng nhập hoặc quyền. Dropdown tại form tư vấn/tài liệu và bộ chọn lộ trình dùng `PublicSelect.tsx`; portal popup có class riêng để không bị cắt bởi section. Root không khóa cuộn; native form value/required do Base UI quản lý.

## Cập nhật bố cục 05/10/2026

Không gian luyện tập và thẻ tài liệu được chuyển sang `/hoc-lieu-mien-phi`, vẫn xuất hiện từ trái/phải bằng Reveal hiện có. Trang chủ thay bằng cây “Hệ sinh thái gia sư CSAT Tutor”: bài luyện có định hướng, nhóm học nhỏ và gia sư chuyên Phan. Art phụ huynh thêm mô tả buổi học, nhận xét, lộ trình, học phí và gradient trang trí; không tạo dữ liệu mẫu. Lộ trình chia riêng năm phần A/B/C/E/K, gradient riêng từng phần và reveal; A+B vẫn có trang xem toàn khung. CSS phần E/K gộp cũ đã được bỏ.

Thành tích: `app/thanh-tich/page.tsx`, `achievements.css`. Trang liên lạc: `app/(auth)/login/page.tsx`, `components/auth/ContactEntry.tsx`, `ParentLoginForm.tsx`, `TutorLoginForm.tsx`, `contact-entry.css`. Đổi switch chỉ giữ enum role trong URL, giữ nội dung từng form trong trang; không tự gửi request. Không-JS có liên hệ hỗ trợ, không hiển thị form không thể đăng nhập. Luồng số điện thoại phụ huynh vẫn có hạn chế SEC-02; thay giao diện không khắc phục xác minh danh tính.

## Biên tập nội dung và học liệu — 05/10/2026

Trang học liệu tách riêng, tiếp nhận nhu cầu bằng form frontend hiện hành rồi để người dùng chủ động liên hệ. Chưa có danh sách tệp tải về hoặc gửi tài liệu tự động; không dựng liên kết tải giả. Dock có lời mời “Nhận học liệu chuyên Tin ngay bây giờ!”, có nút đóng và liên kết tới trang; lời mời ẩn khi mở menu/dock và tại trang đích. Không dùng badge số tin chưa đọc, không tự mở popup hoặc cướp focus. Liên kết học liệu nằm ở footer và trong dock; cây hệ sinh thái không có liên kết.

Footer gộp liên hệ vào cùng hàng với phần giới thiệu và các đường dẫn hiện có, không còn section liên hệ hoặc heading lớn riêng. Giữ Gmail, Zalo, Facebook, TikTok; nguồn chuẩn ở `lib/public-contact.ts`. Email chỉ là liên kết mailto, không cấu hình gửi thư. Chưa có địa chỉ pháp lý, địa điểm học, giờ hỗ trợ hoặc pháp nhân được xác nhận; không tự thêm.

Phần hệ sinh thái dựa trên nội dung chủ trung tâm cung cấp: máy chấm và bài tập chọn lọc theo dạng/cấp độ, cập nhật kho bài và contest, môi trường nhóm nhỏ, đội ngũ cựu học sinh chuyên Tin chuyên Phan. Các kỳ thi thường niên là kỳ thi Tin học học sinh có thể hướng đến, không khẳng định CSAT tự tổ chức giải thường niên. Riêng E tuyển từ C; không viết mọi lớp đều thi tuyển. Không còn heading “Hệ sinh thái gia sư CSAT Tutor”, khẩu hiệu “Tại sao chọn CSAT để đồng hành?” hoặc đoạn dẫn giải riêng; art CSAT ở nút gốc dẫn trực tiếp vào ba nhánh. Section có tên truy cập “Hệ sinh thái CSAT”. Tên từng ưu điểm nằm ngang icon, dùng kiểu chữ phụ `--font-nav` (Archivo 600, không viết hoa toàn bộ), không dùng typography heading lớn. Dây nối nằm sau nút và thẻ trong stacking context riêng; giữ nét mạch góc chéo và icon chìm.

Theo lựa chọn tiếp ngày 05/10, phần hệ sinh thái dùng art mạch điện/terminal: CSAT ở nút gốc, nối tới CSATOJ, nhóm nhỏ và gia sư chuyên Phan. Mỗi nhánh có ba gạch đầu dòng, không có liên kết bên trong. Desktop tỏa ba cột; dưới 901 px chuyển sang cây dọc. Ba blob gradient nằm sau nội dung; blur cố định, icon hover riêng từng nhánh, không có vòng animation tự chạy. Ký hiệu code là trang trí `aria-hidden`, không mô tả dữ liệu vận hành. Lời mời học liệu lớn hơn, nằm phía trên nút liên hệ và có nút đóng; không tự mở lại theo timer.

Tinh chỉnh tiếp: giao điểm đường mạch là ô vuông. Tên ưu điểm lớn thay các câu khẩu hiệu, nội dung rút gọn. `EcosystemIcon.tsx` chứa ba SVG riêng: kho bài/máy chấm, nhóm học và gia sư; dùng cả icon chính và bản chìm góc phải dưới từng khối. Bản chìm không nhận tương tác, không được trình đọc màn hình đọc và không có animation tự chạy.

Agent biên tập nghiên cứu cách diễn giải của [CS50x](https://cs50.harvard.edu/x/), [Raspberry Pi về tư duy tính toán](https://www.raspberrypi.org/blog/computational-thinking-skills-in-our-free-learning-resources/), [Raspberry Pi về dạy học](https://www.raspberrypi.org/teach/pedagogy), [Teach Computing/STEM Learning](https://teachcomputing.org/courses/CO223/python-programming-constructs-sequencing-selection-and-iteration) và [VNOI về độ phức tạp](https://wiki.vnoi.info/vi/algo/basic/computational-complexity). Nguồn giúp cách giải thích, không phải đối tác, giáo trình hoặc phương pháp được xác nhận của CSAT.

Văn phong ưu tiên hành động cụ thể: đọc yêu cầu → chia nhỏ → thử lời giải → tìm lỗi → lý giải tính đúng → xem hiệu quả. A xây cách diễn đạt bằng C++; B mở rộng lựa chọn cách giải; C kết nối kỹ thuật và độ phức tạp; E đào sâu theo mục tiêu thi tuyển đã duyệt; K chọn nội dung và nhịp học riêng. Dùng “tập”, “rèn”, “cơ hội”, tránh khẳng định học lập trình tự động tạo tư duy phản biện hoặc bảo đảm kết quả thi. Giữ A9/B15/C+D19 và nội dung thật của từng lớp.

## Bốn lý do và menu lộ trình — 05/10/2026

Chủ trung tâm duyệt phương án giá trị giáo dục: **Rèn lập luận và phản biện · Tìm cách giải có hệ thống · Hiểu tin học sau công nghệ · Kiên trì học cùng bạn bè**. Thay toàn bộ nội dung “Không chỉ là những dòng code”, giữ tương tác mở bốn phần, bàn phím, bản đọc không JavaScript và hiệu ứng bóng đèn. Giải thích gắn với tìm phản ví dụ, phân rã bài toán, biểu diễn/xử lý dữ liệu, tìm lỗi và trao đổi lời giải; không bảo đảm chuyển giao sang mọi môn học hay kết quả thi.

Agent riêng tham khảo khung [tư duy tính toán của Raspberry Pi Foundation](https://www.raspberrypi.org/blog/computational-thinking-skills-in-our-free-learning-resources/), mục tiêu [CS50x](https://cs50.harvard.edu/x/) và mô hình giải bài theo đội của [ICPC](https://icpc.global/). Đây là cơ sở biên tập, không phải đối tác hoặc giáo trình CSAT. [Meta-analysis của Scherer và cộng sự (2019)](https://doi.org/10.1037/edu0000314) ghi nhận lợi ích chuyển giao ở một số bối cảnh học lập trình; [giải thích của nhóm tác giả (2021)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.559424/full) lưu ý cần luyện chuyển giao chủ động. Không dùng nghiên cứu chung làm bằng chứng hiệu quả riêng của lập trình thi đấu hoặc CSAT.

`RoadmapNavigation.tsx` là disclosure native `details/summary`: desktop mở khi hover, bấm hoặc Enter/Space; Tab đi tới “Tìm hiểu lộ trình” và năm lớp A/B/C/E/K. Escape đóng và trả focus; ra ngoài hoặc điều hướng thì đóng. Mobile bấm mở trong menu thu gọn, không yêu cầu hover. Không-JS vẫn bấm mở được; không dùng ARIA menu cho danh sách liên kết website. Nguồn chương trình và quyền đăng nhập không đổi.

Lời mời học liệu phía trên dock bỏ nhãn lặp “HỌC LIỆU MIỄN PHÍ”, giữ “Nhận học liệu chuyên Tin ngay bây giờ!” và nút đóng; dùng kiểu chữ phụ, rộng 280 px. Không gửi request hoặc tạo thông báo nhận tài liệu giả.

Tại trang liên lạc `/login` (cả hai vai trò và query `role=tutor`), PublicNavigation không render dock liên hệ hoặc lời mời học liệu; `/tutor` cũng được loại trong lúc chuyển sang trang liên lạc. Các trang công khai khác và cổng phụ huynh vẫn giữ dock theo hành vi hiện hành. Liên hệ hỗ trợ trong form đăng nhập không đổi. Quy tắc đa dạng bố cục, không bắt buộc từng phần có heading lớn, được ghi ở [nhận diện/UI](PUBLIC_UI_DESIGN_SYSTEM.md) và [AGENTS](../AGENTS.md).
