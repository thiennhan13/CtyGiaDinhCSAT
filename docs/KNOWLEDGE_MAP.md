# Trang Tự học

`/tu-hoc` giữ nội dung và quan hệ của project `csat-roadmap`, trình bày theo mẫu Sổ tay đã duyệt: cây ngang, mục lục cam bên trái, node cắt góc với header cobalt/lime, khung đọc bên phải. Đây là tài liệu tự học công khai; chương trình lớp và bài đọc phụ huynh tiếp tục dùng khung đã duyệt riêng.

## Nguồn và cấu trúc

Nguồn được chỉ định: `D:\Cty_gia_đình_CSAT\csat-roadmap`, commit `a30fc0e142b4295d2482594417a8e15d7a4779f7`, working tree sạch khi tiếp nhận. Dữ liệu 43 chủ đề/57 quan hệ và năm SVG gốc giữ nguyên byte tại `public/self-study/`; checksum và commit nguồn nằm trong `lib/self-study-source.json`. SVG giao diện mới được tạo riêng tại `public/self-study/notebook/`, đường dẫn có fingerprint trong `lib/self-study-diagrams.json`; không ghi đè nguồn.

- `lib/self-study-markup.ts`: giao diện Sổ tay, giữ chọn lớp/cách xem, tìm kiếm, công cụ zoom/tải SVG, sơ đồ, danh sách và drawer dùng native dialog.
- `lib/self-study-runtime.js`: tương tác nguồn, đổi truy vấn DOM sang root component; fetch và listener có AbortController, ResizeObserver/rAF được dọn khi rời trang.
- `components/marketing/SelfStudyRoadmap.tsx`: mount/unmount tương tác trong Next.js.
- `self-study-roadmap.css`: CSS scope trong `.self-study-roadmap`, dùng Archivo/palette hiện hành. Nền ngoài trong suốt để hiện `SiteBackground` chung; giấy kẻ chỉ trong canvas. Mobile chuyển mục lục thành hàng nút; dark mode có màu tương ứng. Logo/menu/footer do PublicShell cung cấp.
- `self-study-enrollment.css`: giữ lời mời đăng ký hiện hành và đích `/lo-trinh#tu-van`, thêm sáu icon trang trí hai bên và thu gọn nền lime sau chữ “ngay”.
- `scripts/build-self-study-diagrams.cjs`: tạo lại năm SVG từ JSON chuẩn bằng Node 24, không cần Graphviz hoặc package mới. Bố trí DAG phân tầng trái → phải, giữ phép rút gọn bắc cầu của source và hiển thị nền ngoài lớp bằng mã. Dòng chữ được ngắt bảo thủ, browser QA kiểm glyph Archivo thực không tràn/đè header/footer.

Dữ liệu nguồn quyết định tên, mô tả, thứ tự theo nhánh, kiến thức chi tiết, điều kiện học trước và URL bài tập trên trang này. Không ghép thêm diễn giải từ curriculum Portal. Đây là quyết định thay thế bản Tự học cũ với hero, mục Một vòng tự học và 13 chặng; không đổi giáo án hoặc quyền đọc 54 bài phụ huynh. Mapping `knowledge-map-links.json`/helper `csatoj-practice.ts` của phụ huynh vẫn độc lập, các tag hiện khớp snapshot nguồn.

## Hành vi

- Hai chế độ Sơ đồ/Danh sách; lọc Toàn lộ trình, A, B, C hoặc Quy hoạch động.
- Tìm không dấu trên mã, tên, mô tả và nội dung chi tiết. Tìm kiếm không tải lại SVG, không đặt lại vị trí/zoom.
- Năm SVG mới tải theo nhu cầu và cache trong phiên component. Node hỗ trợ Tab/Enter/Space; drawer đóng bằng Escape và trả focus. Kéo nền bằng chuột, cảm ứng dùng cuộn tự nhiên; node không kéo đổi vị trí.
- URL giữ cấu trúc hash nguồn: `#view=C&mode=list&q=...&tag=D03`; back/forward khôi phục trạng thái. Anchor cũ `#chu-de-D03` vẫn mở đúng chủ đề. Alias `/ban-do-kien-thuc` tiếp tục chuyển hướng.
- Khi không JS có liên kết mở SVG toàn bộ như trang nguồn. CSS in giữ sơ đồ/danh sách, ẩn điều khiển và CTA.
- Mặt node giữ sáng để đọc rõ; nền canvas, bảng, chữ và drawer hỗ trợ theme chung. SVG tải xuống/no-JS dùng cùng node mới, có thể mở độc lập.
- Không API OJ, đăng nhập, ghi tiến độ hoặc trạng thái thành thạo. Không import Markdown/metadata bài riêng tư vào dữ liệu public.

## Cập nhật và kiểm chứng

Khi tiếp nhận bản nguồn mới, đối chiếu JSON và SVG gốc, cập nhật fingerprint/checksum nguồn, rồi chạy `node scripts/build-self-study-diagrams.cjs`. Kiểm lại các tập cạnh và hộp chữ của cả năm bản mới; chỉ xóa derivative cũ khi đã chắc không còn caller. Project nguồn chỉ đọc; runtime không phụ thuộc ổ D, scratch hoặc công cụ sinh SVG.

`node --test scripts/tests/knowledge-map.test.cjs` kiểm checksum, 43 mã, A9/B15/C19, tag mapping, không chu trình và tập cạnh/mã đầy đủ trong năm SVG mới. `node scripts/tests/knowledge-map.browser.cjs` kiểm đủ 43 dialog/URL/detail, lazy load/cache, zoom, history, bàn phím, mobile và retry. `node scripts/tests/self-study-design.browser.cjs` kiểm 22 bố cục sáng/tối ở 320–1920 px, hộp chữ SVG, nền chung/giấy kẻ, CTA/icon/nền chữ, kéo canvas, no-JS, in và zoom 200%. Dùng `PUBLIC_QA_BASE_URL` trỏ preview loopback; ảnh/báo cáo tại `scratch/knowledge-map-qa/`, ngoài runtime/Git.

Bằng chứng môi trường và việc còn chờ xem [PROJECT_STATUS](PROJECT_STATUS.md). Nghiên cứu PDF và chuẩn hóa bài phụ huynh xem [PARENT_LESSON_AUDIT](PARENT_LESSON_AUDIT.md).
