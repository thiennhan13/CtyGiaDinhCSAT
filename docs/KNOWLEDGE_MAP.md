# Bản đồ kiến thức dọc

`/tu-hoc` giữ nguyên 43 chủ đề, nội dung và quan hệ của project `csat-roadmap`, trình bày cây dọc trên toàn trang giấy kẻ. Portal phụ huynh dùng cùng hình học/node, nhưng nội dung lấy từ giáo án công bố hiệu lực của lớp.

## Nguồn và ranh giới

Nguồn Tự học: `D:\Cty_gia_đình_CSAT\csat-roadmap`, commit `a30fc0e142b4295d2482594417a8e15d7a4779f7`. JSON 43 chủ đề/57 quan hệ và năm SVG gốc giữ nguyên byte trong `public/self-study/`; checksum ở `lib/self-study-source.json`. Năm SVG dọc được sinh riêng tại `public/self-study/notebook/`, fingerprint ở `lib/self-study-diagrams.json`. Không sửa nguồn chỉ để đổi bố cục.

- `lib/roadmap-graph.ts`: hình học DAG từ trên xuống, nhóm xếp dọc, rút gọn cạnh bắc cầu, node cắt góc/cobalt, title ngắt dòng và tự tăng chiều cao; escape nội dung và namespace ID khi có nhiều bản đồ.
- `scripts/build-self-study-diagrams.cjs`: Node 24 dùng renderer chung để tạo năm SVG từ snapshot công khai, không cần Graphviz/package mới.
- `lib/self-study-markup.ts` và `lib/self-study-runtime.js`: giao diện/tương tác public scoped qua `SelfStudyRoadmap`; AbortController/ResizeObserver/rAF/timer được dọn khi unmount.
- `PublicShell presentation="map"`: giữ menu/logo/theme, bỏ footer và nền trang trí ở riêng Tự học. Nền giấy phủ trang; CSS `body:has(.self-study-page)` chỉ mở cuộn ngang trong route này, tự hết hiệu lực khi điều hướng đi.
- `components/learning/ParentKnowledgeMap.tsx`: chỉ nhận giáo án lớp hiện hành và liên kết do server caller cấp. Không import snapshot Tự học hoặc toàn văn chuyên đề. `Roadmap` của admin/gia sư giữ hành vi cũ.

Snapshot public quyết định tên/mô tả/chi tiết/kiến thức trước/URL bài tập của Tự học. Parent giữ tên bài dài từ `learning-curriculum-20260922.json` hoặc template của chính lớp, lọc phần/chặng/chủ đề bằng `effectiveStages`. Chỉ khung chuẩn mới dùng quan hệ trong `knowledge-map-links.json`; template tùy chỉnh giữ nhóm chặng và chủ đề riêng, không tự gán điều kiện học trước. Không API/migration, ghi tiến độ hay suy ra thành thạo.

## Tự học

Menu chính website cố định phía trên. Mục lục Tất cả/A/B/C/DP và liên kết đăng ký không ô màu dẫn `/lo-trinh#tu-van` nổi bên trái trên sơ đồ; mobile thu gọn bằng native disclosure. Thanh điều chỉnh nổi phía dưới gồm tìm kiếm, Sơ đồ/Danh sách, vừa chiều ngang, zoom và tải SVG. Không có vùng canvas cuộn lồng: thanh cuộn trang và thao tác cuộn/kéo nền di chuyển sơ đồ. Chừa khoảng trống trên/dưới để chủ đề không nằm sau menu.

Mặc định desktop 100%, mobile 85%; Vừa khung chỉ vừa chiều ngang khả dụng, không ép toàn cây dài vào chiều cao. Các nhánh vẫn có thể rộng hơn màn hình. Khi tìm từ khóa nhấn Enter, node được đưa vào vùng nhìn giữa các menu.

Tìm không dấu trên mã/tên/mô tả/chi tiết, không tải lại SVG hoặc reset vị trí. Chỉ tải SVG view đang dùng, cache trong component; lưu zoom/vị trí trang riêng từng view. Hash `#view=C&mode=list&q=...&tag=D03`, back/forward, anchor cũ `#chu-de-D03` và alias `/ban-do-kien-thuc` được giữ. Node hỗ trợ Tab/Enter/Space, drawer đóng Escape/trả focus. Kéo chuột từ nền hoặc node không chọn chữ, không kích hoạt drawer khi đang kéo; click thường vẫn mở chủ đề. Chặn chọn chữ chỉ trong canvas, drawer/danh sách vẫn sao chép được. Cảm ứng dùng cuộn tự nhiên, không kéo đổi tọa độ node.

No-JS hiện ảnh/liên kết SVG dọc đầy đủ và CTA thật; ẩn các điều khiển cần JS. In giữ sơ đồ/danh sách, ẩn menu nổi. Dark mode đổi giấy/đường nối/drawer, node public giữ mặt sáng dễ đọc. Không khóa cuộn trang.

## Phụ huynh và số buổi

Bản đồ hiển thị toàn giáo án hiệu lực của lớp trong khung giấy cuộn riêng, không có mục lục nội bộ. Thẻ số buổi ở ngoài trang giấy; nhãn và màu lime áp dụng toàn chặng hiện tại. Nút Đến chặng hiện tại chỉ cuộn khung, không ghi dữ liệu. Các node mở drawer mô tả và hành động **Đọc chuyên đề**, **Luyện tập trên CSATOJ** khi server caller đã cung cấp. Mục tiêu/focus/bước tiếp theo, nhận xét, điểm danh, học phí và sidebar Portal giữ nguyên.

`resolveParentCurriculumProgress` giữ quy tắc: làm phẳng chủ đề của các chặng hiệu lực theo thứ tự; N buổi lớp đã hoàn thành chọn chủ đề thứ `min(N, tổng chủ đề)` khi N≥1, tô toàn chặng chứa chủ đề. N=0 là chuẩn bị chặng đầu. Số buổi thật vẫn hiển thị nếu vượt số chủ đề; không tự đánh dấu hoàn tất khóa. Thiếu aggregate không biến thành 0: dùng chặng gia sư công bố hoặc chưa xác nhận. Không hiện nhãn “ước tính” trên UI.

Count do RPC hiện hành cung cấp: mọi buổi completed đã kết thúc theo giờ Việt Nam từ đầu lịch sử lớp, không theo tháng hoặc điểm danh cá nhân. Quy tắc một buổi/một chủ đề chỉ là cách định hướng hiển thị; không quy định thời lượng thật của mỗi chủ đề, không suy thành thạo. Series 54 bài không làm tăng 43 chủ đề hoặc số buổi. Xem [chuyên đề và quyền đọc](PARENT_TOPICS.md).

## Cập nhật và QA

Khi cập nhật snapshot chuẩn, đối chiếu dữ liệu/checksum rồi chạy `node scripts/build-self-study-diagrams.cjs` bằng Node 24. Kiểm node/edge/title của cả năm view. Runtime không phụ thuộc ổ D, prototype/scratch hoặc công cụ tác giả.

- `scripts/tests/knowledge-map.test.cjs`: checksum gốc, 43 mã, tag và đủ cạnh/mã trong derivative.
- `scripts/tests/roadmap-graph.test.cjs`: hình học dọc/không chồng card dài, escape/ID, custom, chu trình; các mốc số buổi, loại trừ và thiếu aggregate không cần DB.
- `scripts/tests/knowledge-map.browser.cjs`: 43 drawer/URL/detail, cache, tìm kiếm, zoom, vị trí trang, history, bàn phím, mobile và retry.
- `scripts/tests/self-study-design.browser.cjs`: giấy toàn trang, menu nổi, cuộn document,20 bố cục sáng/tối 320–1920 px, hộp chữ SVG, điều khiển 44 px, kéo nền/no-JS/in và cleanup khi chuyển route.
- `scripts/run-parent-topics-ui.cjs`: dữ liệu giả qua RPC loopback, kiểm giáo án/quyền/series/ngữ cảnh và hồi quy các phần Portal. Không dùng hồ sơ thật.

Dùng `PUBLIC_QA_BASE_URL` loopback. Ảnh/báo cáo ở `scratch/knowledge-map-qa/` và `scratch/parent-topics-qa/`, ngoài runtime/Git. Bằng chứng thực chạy và việc còn chờ ở [PROJECT_STATUS](PROJECT_STATUS.md). Chưa phát hành thiết kế dọc khi chỉ có demo local.
