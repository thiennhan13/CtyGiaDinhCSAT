# Trang Tự học

`/tu-hoc` tái lập roadmap trong project `csat-roadmap` theo yêu cầu chủ trung tâm. Đây là tài liệu tự học công khai; chương trình lớp và bài đọc phụ huynh tiếp tục dùng khung đã duyệt riêng.

## Nguồn và cấu trúc

Nguồn được chỉ định: `D:\Cty_gia_đình_CSAT\csat-roadmap`, commit `a30fc0e142b4295d2482594417a8e15d7a4779f7`, working tree sạch khi tiếp nhận. Dữ liệu 43 chủ đề và năm SVG được sao chép nguyên byte vào `public/self-study/`. Checksum và commit nguồn nằm trong `lib/self-study-source.json`.

- `lib/self-study-markup.ts`: markup từ trang nguồn, giữ tiêu đề ngắn, thanh chọn lớp/cách xem, tìm kiếm, công cụ zoom/tải SVG, sơ đồ, danh sách và dialog.
- `lib/self-study-runtime.js`: tương tác nguồn, đổi truy vấn DOM sang root component; fetch và listener có AbortController, ResizeObserver/rAF được dọn khi rời trang.
- `components/marketing/SelfStudyRoadmap.tsx`: mount/unmount tương tác trong Next.js.
- `self-study-roadmap.css`: bố cục và màu nguồn, selector được scope trong `.self-study-roadmap`; giữ Archivo của website. Logo/menu/footer chung do PublicShell cung cấp, không lặp logo text trong heading roadmap.
- `self-study-enrollment.css`: lời mời đăng ký cuối trang theo phong cách trang giới thiệu, dùng nội dung chủ trung tâm cung cấp và dẫn đến `/lo-trinh#tu-van`.

Dữ liệu nguồn quyết định tên, mô tả, thứ tự theo nhánh, kiến thức chi tiết, điều kiện học trước và URL bài tập trên trang này. Không ghép thêm diễn giải từ curriculum Portal. Đây là quyết định thay thế bản Tự học cũ với hero, mục Một vòng tự học và 13 chặng; không đổi giáo án hoặc quyền đọc 54 bài phụ huynh. Mapping `knowledge-map-links.json`/helper `csatoj-practice.ts` của phụ huynh vẫn độc lập, các tag hiện khớp snapshot nguồn.

## Hành vi

- Hai chế độ Sơ đồ/Danh sách; lọc Toàn lộ trình, A, B, C hoặc Quy hoạch động.
- Tìm không dấu trên mã, tên, mô tả và nội dung chi tiết. Tìm kiếm không tải lại SVG, không đặt lại vị trí/zoom.
- Năm SVG tải theo nhu cầu và cache trong phiên component. Các node hỗ trợ Tab/Enter/Space; dialog đóng bằng Escape và trả focus.
- URL giữ cấu trúc hash nguồn: `#view=C&mode=list&q=...&tag=D03`; back/forward khôi phục trạng thái. Anchor cũ `#chu-de-D03` vẫn mở đúng chủ đề. Alias `/ban-do-kien-thuc` tiếp tục chuyển hướng.
- Khi không JS có liên kết mở SVG toàn bộ như trang nguồn. CSS in giữ sơ đồ/danh sách, ẩn điều khiển và CTA.
- Roadmap giữ mặt màu sáng như bản gốc; menu/footer/CTA tiếp tục hỗ trợ theme chung.
- Không API OJ, đăng nhập, ghi tiến độ hoặc trạng thái thành thạo. Không import Markdown/metadata bài riêng tư vào dữ liệu public.

## Cập nhật và kiểm chứng

Khi tiếp nhận bản nguồn mới, đối chiếu JSON/SVG/markup/CSS/runtime cùng nhau; cập nhật fingerprint, manifest checksum và các hằng đường dẫn trong runtime. Project nguồn chỉ được đọc; runtime không phụ thuộc ổ D hoặc công cụ sinh SVG.

`node --test scripts/tests/knowledge-map.test.cjs` kiểm checksum, 43 mã, A9/B15/C19, tag mapping và liên hệ không chu trình. `node scripts/tests/knowledge-map.browser.cjs` chạy bộ kiểm tương tác từ project nguồn trên preview loopback bằng Edge; dùng `PUBLIC_QA_BASE_URL` nếu đổi cổng. Kiểm đủ 43 dialog/URL/detail, lazy load/cache, zoom, history, bàn phím, mobile và retry. Ảnh/báo cáo ở `scratch/knowledge-map-qa/`, ngoài runtime/Git.

Bằng chứng môi trường và việc còn chờ xem [PROJECT_STATUS](PROJECT_STATUS.md). Nghiên cứu PDF và chuẩn hóa bài phụ huynh xem [PARENT_LESSON_AUDIT](PARENT_LESSON_AUDIT.md).
