# Audit giao diện phụ huynh

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
