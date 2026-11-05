# Audit giao diện phụ huynh

## Điều chỉnh05/11 — palette mới và tiến độ lớp

Đích màn hình: **Con có duy trì luyện tập, và lớp đang đi đến đâu?** Giữ hướng **Accent ladder**, seed **849983658**, không redraw; áp palette chủ trung tâm chọn, Archivo và bố cục hiện tại. Ngoại lệ có chủ đích với giới hạn màu/bóng của skill: neo brutalism, menu trái dạng mục lục và xanh tím `#1F06AC` được yêu cầu trực tiếp. Không thêm ảnh, số liệu thật hoặc chuyển động marketing.

| Màu | Vai trò |
|---|---|
| `#1F06AC` | Viền nhận diện, dữ liệu đậm nhất, nhấn chữ trên nền nhạt |
| `#0F42C0` | Nút chính, tiêu đề xanh, số bài đúng |
| `#5882E8` | Mức trung gian của lịch, điểm nhấn phụ |
| `#E3EF4F` | Nhịp luyện tập/lộ trình và các điểm dẫn chính |
| `#E3F2FD` | Nền ô dữ liệu nhẹ; nền trang mặc định trắng |

Chữ dài dùng mực trung tính, thẻ trắng; giữ các màu trạng thái nghiệp vụ. Không dùng chữ trắng cỡ nhỏ trên `#5882E8` (chỉ3,64:1), hoặc trên vàng/nền nhạt. Chữ trắng trên `#0F42C0` đạt8,20:1; trên `#1F06AC` đạt12,50:1 theo phép tính tương phản. Không dùng vàng để biểu thị cường độ lượt nộp; các mức lịch dùng sáng–đậm và legend cùng tooltip/số lượt.

Đã bỏ avatar chữ đầu, hai liên kết hồ sơ và chú thích lặp; thay bằng sách + ô **CSAT cùng con luyện tập**, chữ ngày dưới số. Theo chốt bổ sung, số ngày luôn dùng12 tháng gần nhất từ summary gốc, không hiện chú thích kỳ và không đổi khi chọn năm của lịch. Nhịp luyện tập tách ba ô: lượt nộp trong kỳ nền xanh, bài đã thử tích lũy nền xanh nhạt, bài giải đúng tích lũy nền vàng; khoảng cách và viền riêng giữ rõ trên điện thoại. Bộ chọn năm cùng hàng tiêu đề, phần ngày/giờ không còn hiển thị. Kết quả có3 số tích lũy, chi tiết thi đấu mở sẵn, xếp hạng theo buổi rồi lịch sử60px có màu. **Định hướng phát triển của lớp** nằm cuối Đồng hành cùng con. Nội dung định hướng vẫn chỉ là mục tiêu chương trình.

Điện thoại dưới768px: danh sách nội dung theo chặng mở sẵn, nút **Xem bản đồ kiến thức** thay SVG/điều khiển tại báo cáo. Trang `/parents/lo-trinh/[classId]` mở cùng renderer đầy đủ, kiểm lại parent active/giáo án công bố từ RPC và giữ context khi quay lại. Desktop giữ bản đồ tại chỗ. Không đổi API hoặc gán nội dung buổi từ số buổi đã qua.

Thanh pixel: **số buổi completed đã kết thúc từ đầu lớp / tổng số nội dung các chặng hiệu lực ×100**, tối đa100%. Tổng dự kiến theo nội dung giáo án đã chọn, không theo số buổi được tạo trong lịch, tháng đang xem hoặc điểm danh riêng của con. Giữ số buổi thật khi vượt dự kiến; thiếu số buổi/mẫu số không vẽ tỷ lệ giả. Thanh chỉ hiện tên, phần trăm và pixel, bỏ chú thích số buổi; aria vẫn giữ tỷ lệ và số đếm để đọc bằng công nghệ hỗ trợ. Đây là quyết định chủ trung tâm sau thảo luận, không thêm trường kế hoạch. Chặng vẫn theo resolver hiện hành; nội dung thực học của một buổi chỉ lấy từ bản công bố của buổi đó, không gán tự động từ tỷ lệ.

ROUND 1

Seen in one second: Lịch xanh và số ngày luyện tập dẫn mắt; nhận diện mạnh hơn nhưng còn khoảng trống quanh bộ chọn năm.

Idea (one sentence): Lượt nộp thật và số buổi của lớp trở thành hai thước đọc khác nhau: nhịp luyện tập và nhịp lộ trình CSAT.

Live thing: Đổi năm/chọn ngày, mở chi tiết thi đấu, xem xếp hạng theo buổi và lịch sử cuộc thi.

Layout words by section: hồ sơ=identity + count / hoạt động=calendar / nhận xét=list / lộ trình=stage + pixel + map / buổi học=table / OJ=metrics + rating + results / đồng hành=profiles + ledger + directions.

Scores: design7.2 · usability7.5 · creativity7.0 · content8.5 → overall6.0 do còn FAIL (tự đánh giá).

Caps applied: App screen, không áp sàn ảnh/chuyển động của landing page; nhãn SVG10px bị inspector đánh FAIL.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. `scratch/parent-blue-production/practice-1440.png`: bộ chọn năm ở một hàng riêng dưới tiêu đề làm lịch cao thừa → đưa cùng hàng tiêu đề, bỏ tên biểu đồ lặp.
2. `scratch/parent-blue-final/report-1440.png`: lộ trình từng lặp số buổi ở thẻ chặng và thanh tiến độ → thẻ chặng chỉ định hướng hiện tại, thanh chỉ giữ phần trăm/pixel theo yêu cầu mới nhất; số đếm giữ trong aria.
3. `scratch/parent-blue-final-inspect/report.json`: nhãn Chủ đề của24 node SVG10px → tăng12px scoped ở Portal; nhãn định hướng đổi sentence case, loại font mono trong stylesheet phụ huynh.

ROUND 2

Seen in one second: Hồ sơ/số ngày dẫn vào lịch trọn ngang; các nhóm thông tin có màu và chức năng rõ.

Idea (one sentence): Nhịp nộp bài mở báo cáo, số buổi và giáo án hiệu lực giải thích nhịp lớp, kết quả thi là phần chứng cứ riêng.

Live thing: Chọn năm/ngày và đọc kết quả theo buổi; một summary mới khi mở cổng, không polling.

Layout words by section: hồ sơ=count split / hoạt động=calendar / nhận xét=list / lộ trình=pixel + map / buổi học=table / OJ=metrics + open rating + results / đồng hành=profiles + ledger + directions.

Scores: design7.8 · usability8.2 · creativity7.2 · content8.5 → overall7.9, tự đánh giá, không phải chấm độc lập.

Caps applied: Chỉ quy tắc app screen; ngoại lệ palette tím/bóng cứng/nút được yêu cầu. Cổng nghiệm thu inspector cuối và các ảnh xem bên dưới; không suy từ kết quả local thành phát hành.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Báo cáo nhiều mục dưới fold (`desktop-page-01/02`) → giữ theo phạm vi được duyệt, menu nhóm bên trái hỗ trợ đi thẳng; chưa chuyển thành nhiều màn hình.
2. Danh sách giáo án trên điện thoại dài khi mở đủ24 nội dung (`mobile-page-01`) → giữ đầy đủ theo yêu cầu, có từng mục gấp/mở và nút bản đồ riêng; desktop/tablet giữ bản đồ cuộn trong vùng riêng.
3. Form/thẻ học phí còn radius cũ (`desktop-page-02`) → giữ component hiện có trong đợt này; nút/heading/mặt dữ liệu mới dùng góc4–7px và viền nhất quán.

Bằng chứng dưới đây có trước điều chỉnh cuối sang nền trắng/bỏ SiteBackground; chủ trung tâm yêu cầu không chạy lại kiểm thử cho thay đổi nền.

Kiểm thực tế: Node24.22.1, repo42/42; database/API291/291 không skip, gồm PostgreSQL concurrency local. Typecheck/lint strict/production build đạt. Edge build cuối `scratch/parent-practice-cards-production/` kiểm320/375/390/768/1440, nhãn CSAT mới,3 ô màu riêng/khoảng cách mobile, bỏ chú thích số buổi, ô vuông tất cả ngày, năm nhuận/0/null/thiếu activity/lỗi giữ kỳ, ngày12 tháng không đổi khi chọn năm, thu hồi xóa cả3 vùng, một summary mỗi lượt mở, chi tiết thi đấu mở/đóng, menu/keyboard/dark/reduced motion và các luồng thu tiền/chứng chỉ/claim. Bản đồ mới200/private/no-store/noindex; sai học sinh/lớp và nháp404, bị khóa/chưa Auth chuyển hướng; node/chuyên đề/quay lại context hoạt động. Test resolver kiểm50%,0%,100% vượt dự kiến, scope loại trừ và dữ liệu thiếu; helper chỉ nhận giáo án lớp công bố trong projection được phép. Fixture:1 học sinh giả, lớp A+B24 nội dung/12 buổi, hoạt động tính từ dòng giả;1 buổi/1 contest hạng2/10 và5/50. Không dùng hồ sơ thật.

Inspector cuối ở `scratch/parent-practice-cards-inspect-{1440,768,390}/`: **0 FAIL** từng viewport, đã mở đủ9 ảnh; Archivo100%. Lượt gộp viewport trước đó lỗi CDP capture, không tính pass; chạy từng viewport Edge độc lập giữ đủ kiểm tra. Snapshot dùng CSS/font build thật; thêm script chỉ khôi phục căn giữa SVG và trạng thái danh sách theo viewport như component thật, không thêm số liệu hoặc sửa CSS để qua kiểm tra. Các tương tác/kiểm quyền chạy trên Next production server trong runner, không trên snapshot.

Có5 nhóm WARN còn lại: nền cream của body/header public dùng chung (canvas Portal đã xanh nhạt), viền đậm và tỷ lệ màu được yêu cầu neo brutalism, radius cũ ở form/học phí, báo cáo nhiều mục dưới fold được yêu cầu giữ. Ngoại lệ inspector chỉ `heavy-shadow`, `button-fx`, `palette-purple` theo nhận diện người dùng chọn. Lint skill app ở4 file trực tiếp sửa lần cuối:0 FAIL,10 WARN về bóng cứng có chủ đích. Không cho qua lỗi tương phản/font/overflow/tiny-text.

HTML local `docs/prototypes/parent-blue/index.html` là bản xem bố cục dữ liệu giả, không kết nối API; bộ lọc/thao tác tài khoản/link bản đồ mới chỉ đọc, không giả gọi backend hoặc dẫn tới route production chưa phát hành. Đã kiểm font, ô vuông, menu/sáng tối và nội dung mobile ở320/390/768/1440. Bản đồ riêng thật đã được kiểm trên ứng dụng local. Không đưa prototype/ảnh QA vào Git/runtime. Chưa nghiệm thu OJ thật hoặc giao diện production sau cập nhật; commit/push đã được chủ trung tâm yêu cầu.

## Bằng chứng bố cục trước05/11

## Phạm vi và phương án

Audit và chỉnh trực tiếp giao diện đang có theo yêu cầu chủ trung tâm; giữ Next.js/React, CSS Module/CSS scoped, Archivo và palette CSAT. Không đổi dữ liệu học tập, quyền, schema hoặc số liệu OJ. Dữ liệu trong ảnh QA là fixture giả của `scripts/run-oj-ui.cjs`, không phải hồ sơ thật.

Skill `design-taste-frontend` chạy theo nhánh **app screen**. Sheet đã chọn **Accent ladder**, seed **849983658**, giữ palette/type; không redraw. Lấy nguyên tắc màu dẫn mắt vào dữ liệu, phân cấp bằng tỷ lệ và các vùng nội dung. Yêu cầu trực tiếp của chủ trung tâm ưu tiên hơn ngân sách một màu/bề mặt tĩnh trong skill: giữ cobalt/lime/mint, viền và bóng cứng neo brutalism, menu trái dạng mục lục. Vạch chéo ô thiếu dữ liệu là ký hiệu ngữ nghĩa, không phải gradient trang trí. Không dùng ảnh/animation marketing hoặc dữ liệu giả ở runtime.

Câu hỏi đầu tiên: **Con có duy trì luyện tập không?** Lịch lượt nộp thật là phần lớn nhất, nằm sau hồ sơ học sinh. Các phần tiếp theo trả lời con được nhận xét gì, học đến đâu, học buổi nào, kết quả và hạng thế nào, ai đồng hành và học phí ra sao. Không suy mức thành thạo từ màu lịch/ranking.

Bề ngang đóng theo công thức: cửa sổ trừ hai lề28px, sidebar224px và gutter28px; phần còn lại là nội dung. Calendar lấy toàn bộ phần nội dung sau padding, có tối thiểu14px/ô và chỉ cuộn bên trong nếu thiếu chỗ. Điện thoại dùng lề16px, menu gấp và nút đủ rộng.

## Phát hiện trước chỉnh sửa

ROUND 1

Seen in one second: Ba thẻ chỉ số tổng; lịch nhỏ nằm dưới và có nhiều đoạn hướng dẫn.

Idea (one sentence): Nhịp luyện tập thật trên CSATOJ trở thành điểm mở đầu báo cáo CSAT.

Live thing: Chọn năm, xem một ngày bằng chạm/chuột/bàn phím, làm mới và xem kết quả theo buổi.

Layout words by section: hồ sơ=split / OJ=metrics rồi calendar / menu=danh sách phẳng / gia sư-học phí=split.

Scores: design 6.5 · usability 6.5 · creativity 6 · content 8 → overall 6.6 (tự đánh giá, không phải chấm độc lập).

Caps applied: Dùng quy tắc app screen; không áp sàn ảnh/chuyển động của landing page. Nhận diện neo brutalism được người dùng yêu cầu giữ.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. `scratch/parent-audit-before/parent-1440.png`: lịch chỉ khoảng900px trên vùng rộng hơn1.000px và đứng sau ba thẻ tổng → tách lịch lên trước nhận xét, giãn hết vùng nội dung.
2. Cùng ảnh: ba đoạn giải thích quanh lịch, disclosure bảng ngày và nút tổ chức làm loãng việc theo dõi → bỏ hai chức năng UI theo yêu cầu, giữ nhãn ngày/legend/cảnh báo giới hạn.
3. Sidebar cũ là một danh sách phẳng; gia sư/học phí cạnh nhau khiến bảng học phí hẹp → chia menu theo việc học/chương trình/đồng hành, giữ bên trái; gia sư và học phí xếp riêng trọn bề ngang, đúng thứ tự.

## Kết quả và kiểm chứng

Bản sau chỉnh nằm trong `scratch/parent-audit-production/`; ảnh không vào Git/runtime. Mọi số liệu là fixture:12 bài thử,8 bài đúng,1.200 lượt tích lũy; tổng lịch tính từ từng ngày nên khác tổng tích lũy. Dùng năm nhuận2024, trạng thái0/null, lỗi mạng, legacy API thiếu activity và thu hồi quyền để kiểm dữ liệu không bị diễn giải sai.

Chưa kiểm phiên phụ huynh hoặc kết nối OJ thật; chưa xác nhận deployment. API OJ cần bổ sung `activity` theo [contract](CSATOJ_PARENT_DATA_CONTRACT.md).

## Đánh giá sau chỉnh sửa

ROUND 2

Seen in one second: Lịch luyện tập mang tiêu đề lime, nút làm mới cobalt, số lượt nộp/ngày hoạt động trên dải mint; menu trái phân nhóm.

Idea (one sentence): Nhịp luyện tập trên CSATOJ dẫn vào nhận xét và lộ trình của chính học sinh CSAT.

Live thing: Đổi năm/chọn ngày trong lịch và xem hạng theo buổi; cập nhật hai vùng từ cùng state/request, mở thẳng `#oj` vẫn tải đúng một lần.

Layout words by section: hồ sơ=compact split / hoạt động=full-width calendar / nhận xét=list / lộ trình=map / định hướng=path / buổi học=table / OJ=metrics rồi results / gia sư=profiles / học phí=ledger.

Scores: design 7.8 · usability 8.2 · creativity 7 · content 8 → overall 7.8 (tự đánh giá, không phải chấm độc lập).

Caps applied: Quy tắc app screen; ngoại lệ nhận diện theo yêu cầu người dùng cho bảng màu/viền/bóng cứng. Không áp sàn ảnh/chuyển động của landing page.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Ảnh desktop ban đầu cho thấy hồ sơ/tiêu đề chiếm quá nhiều chiều cao → đã bỏ tên lặp, đặt h1 gọn và giảm padding hồ sơ, đưa lịch vào màn hình sớm hơn.
2. Inspector phát hiện nhãn bảng điểm danh10px → đã tăng lên12px, số dùng Archivo/tabular figures; không thay đổi điểm danh hoặc học phí.
3. Phần gia sư rỗng tạo khoảng trắng trước thông báo → chỉ render grid khi có gia sư, trạng thái rỗng dùng một dòng thông báo, giảm margin tiêu đề.

Các giới hạn còn lại: báo cáo dài và có nhiều phần dưới fold do giữ nội dung/thứ tự theo yêu cầu; bảng buổi học và học phí vẫn cuộn trong vùng riêng trên điện thoại; chưa nghiệm thu tài khoản OJ thật. Không hứa đo mức tiến bộ chỉ từ số lượt nộp.

## Cách đọc bằng chứng

- Edge tương tác chạy trên **Next production build** (`next build` rồi `next start`) với cùng URL Supabase loopback đã dùng lúc biên dịch `NEXT_PUBLIC_*`; Node24.22.1. Không lấy cấu hình hoặc dữ liệu Supabase thật để làm fixture.
- Kiểm tại320/375/390/768/1440px, sáng/tối, reduced motion, bàn phím, menu, hạng theo buổi/cuộc thi, mã liên kết/retry/receipt, refresh/chọn năm,365/366 ngày,0/null, API cũ thiếu activity, lỗi mạng giữ dữ liệu và thu hồi quyền.
- Inspector dùng HTML/CSS/font nhúng xuất từ đúng bản render production fixture; đây là đo bố cục, không thay thế các kiểm tương tác ở trên. Bản HTML tĩnh không lưu lại scroll position bên trong lịch; Edge live riêng đã kiểm thao tác cuộn/focus. Archivo tải thật được assert trước xuất.
- Lần chạy inspector đầu gặp CDP capture timeout; đã chạy lại bằng Edge. Một cảnh báo font trong bản xuất đầu là do resolve URL font tương đối sai trong công cụ xuất QA; đã sửa runner, không phải thay font ứng dụng.
- Lint skill:0 FAIL,3 WARN bóng cứng được giữ theo brief. Inspector cho phép đúng `button-fx,heavy-shadow` vì người dùng yêu cầu neo brutalism; không bỏ qua overflow, tương phản, font, tiny-text hay lỗi dữ liệu.
- Các cảnh báo thiết kế giữ có lý do: `palette-cream`, `heavy-borders`, `colour-sprawl` là nhận diện CSAT được yêu cầu; `radius-mix` gồm control/card/header dùng chung được giữ; `below-fold` phù hợp báo cáo dài có thứ tự cố định. Không dùng số ảnh hoặc hiệu ứng để làm đầy một dashboard.
- Không bổ sung ảnh/clip, không có nguồn media mới phải ghi công; các ảnh/logo sẵn có không đổi. Mọi fixture chỉ nằm trong runner, không có trong màn hình thực.

Kết quả cuối: inspector1440/768/390 **0 FAIL,5 WARN** (năm nhóm đã giải thích ở trên); đã mở đủ7 ảnh fold/page cuối. Repo guard678 tệp0 finding; repo40/40; database/API291/291 không skip; typecheck/lint strict và production build đạt. Các ảnh sáng/tối và kiểm tương tác ở320/375/390/768/1440 đều đạt. Đây là nghiệm thu local với fixture, chưa xác nhận giao diện production.

## Đề xuất cam đào, typography và ô lịch vuông

Yêu cầu tiếp theo: xem HTML trước khi đổi màu mint. Bản local `docs/prototypes/parent-peach/index.html` tự chứa CSS/font và dữ liệu minh họa, có chọn cam đào/vàng mơ/mint hiện tại, sáng/tối, chọn năm và thao tác ngày bằng bàn phím. Không nối API hoặc dùng dữ liệu thật. Palette và typography trong bản này chưa áp vào ứng dụng.

Đề xuất **cam đào #FFD2B8**: sắc ấm để phân biệt với cobalt/lime, chữ mực giữ tương phản; dùng ở vị trí mint hiện có. Vàng mơ #FFE3A1 là lựa chọn thay thế. Giữ Archivo; body16px/1.6, tiêu đề24px/800, số32px/800, nhãn13–14px/500–600; phần chữ thường400, giới hạn đoạn75ch. Không thay font hoặc tăng độ đậm mọi dòng.

Lỗi ô chữ nhật đã sửa trong component thật: container query cho cùng kích thước hàng/cột; cố định phần nhãn/gutter/padding trong phép tính, điện thoại cuộn ngang. Runner kiểm mọi ô vuông tại320/375/390/768/1440 và vẫn chạy toàn bộ hồi quy OJ/claim/thu tiền/profile bằng production build fixture. Không đổi API/schema/quyền.

Demo Edge320/390/768/1440 đạt: ô vuông, năm nhuận366 ngày, năm hiện tại không quá mốc as_of minh họa, đổi năm không thay tổng tích lũy, đổi màu, sáng/tối, menu, phím mũi tên và font Archivo tải thật. Production build/typecheck/lint đạt; không chạy lại DB vì thay đổi CSS/preview không đổi database. Kết quả291 ca ở mục trên thuộc lượt audit trước, không phải một lần chạy mới trong lượt demo.

ROUND 3

Seen in one second: Lịch ô vuông cobalt, dải số liệu cam đào, tiêu đề lime; chữ thường nhẹ hơn số liệu.

Idea (one sentence): Nhịp luyện tập CSATOJ dẫn mắt bằng ô lịch vuông và cặp màu lạnh–ấm của CSAT.

Live thing: Chọn màu và sáng/tối để so trực tiếp, chọn năm/ngày để kiểm khả năng đọc dữ liệu.

Layout words by section: Giữ bố cục đã audit; chỉ đổi màu thay thế, tỷ lệ chữ và hình học lịch.

Scores: design 8 · usability 8.2 · creativity 7 · content 8 → overall 7.9 (tự đánh giá).

Caps applied: App screen, giữ các ngoại lệ nhận diện đã giải thích; không áp sàn ảnh/motion của trang marketing.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Ô lịch cũ giãn rộng riêng nhưng chiều cao cố định → đã dùng chung kích thước; kiểm số đo mọi ô ở tất cả viewport.
2. Màu mint cũ gần nền nên các nhóm thiếu phân biệt → bản đề xuất dùng cam đào, so sánh trực tiếp bằng picker.
3. Chữ nhãn/nội dung/số có quá nhiều cỡ và nhiều dòng cùng đậm → demo gom vai trò chữ, body16px/1.6, giảm weight chữ thường.

Giới hạn giữ lại: header/controls dùng chung còn một vài cỡ chữ riêng; báo cáo vẫn dài để giữ đủ nội dung và thứ tự. Chưa áp palette/typography demo, chưa nghiệm thu OJ thật.

Inspector HTML demo cuối1440/768/390:0 FAIL,5 WARN theo các ngoại lệ nhận diện đã giải thích; đã mở đủ7 ảnh cuối, gồm thanh chọn màu hiển thị trên lớp nền. Không bổ sung ảnh/font nguồn mới. Demo chỉ dùng fixture của runner, không là bản phát hành.
