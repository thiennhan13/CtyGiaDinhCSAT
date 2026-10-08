# Thiết kế website CSAT

Nguồn quy định thiết kế hiện hành của website công khai. Áp dụng cùng [catalog](PUBLIC_COURSE_CATALOG.md), [cấu trúc website](PUBLIC_WEBSITE.md) và [motion](UI_MOTION_WORKFLOW.md). Quyết định trực tiếp đã duyệt của chủ trung tâm có ưu tiên hơn gợi ý tự động của skill và prototype cũ.

## Định hướng: neobrutalism và playful edtech

Thiết kế làm rõ tư duy lập trình, thứ tự phát triển và giá trị học tập bằng typography, màu, sơ đồ và hình học. Neobrutalism là ngôn ngữ chủ đạo ở thẻ/facts/banner: mặt màu phẳng, đường viền rõ, bóng cứng lệch, góc vuông hoặc cắt góc, chữ có trọng lượng và phân cấp rõ. Playful edtech thể hiện bằng terminal, pixel, code, mạch điện, huy chương và tương tác nhẹ; không biến nội dung học thuật thành đồ chơi hoặc nút giả.

Kết hợp editorial cho nội dung dài/chặng học; bento khi nội dung cần ưu tiên khác nhau; timeline/sơ đồ khi có trình tự hoặc quan hệ thật. Không ép mọi section thành tiêu đề lớn → đoạn dẫn → hàng thẻ giống nhau. Art có thể dẫn nội dung, nhưng section vẫn có tên truy cập và thứ tự heading đúng.

Không tự thay nhận diện bằng mẫu của skill. design định hướng art; ui-ux-pro-max hỗ trợ bố cục/UX; ui-styling hiện thực token/component; banner-design hỗ trợ phân cấp hero/banner. Tra cứu đúng ngữ cảnh, không cài thêm thư viện hay dịch vụ chỉ vì mẫu có dùng.

## Font, logo và màu

| Nhóm | Quy định |
|---|---|
| Font UI | Archivo tự phục vụ qua next/font; fallback Segoe UI, Lucida Grande, Arial, sans-serif. Ký hiệu A/B/C/E/K và C/ELITE dùng font menu --font-nav. Không cài KVANT |
| Logo | csat-logo-compact.svg, csatoj-logo-compact.svg giữ tỷ lệ, màu và chữ dạng path. Chỉ cắt khoảng trắng viewBox ở bản dẫn xuất |
| Dòng phụ | CSAT: Lập trình thi đấu & Tư duy thuật toán; CSATOJ: Kho đề thi & bài tập |
| Bảng màu chung | Kem #F8F7F2, cobalt #2B50E0, lime #D9E64C, cam #EE683E; ink tương phản. Dark mode nền nâu ấm theo token hiện có |
| Bảng màu E | Mint #8AD6D1, teal #359FA0, kem #FFF0C5, coral #FF8C52. Tổng quan E nền ngoài xanh đậm #122C31, mặt đọc sáng, cam chủ đạo banner/sơ đồ |
| Token | Giá trị gốc → vai trò semantic → component. Không hardcode màu của một lớp vào shell chung |

Nét KVANT trong logo/watermark SVG không phải font chữ UI. Dark mode có mặt kem nhỏ bảo vệ logo, không tự đảo màu logo. Giữ nội dung/ảnh gia sư đã duyệt; không suy thành thành tích trung tâm.

Favicon trên tab giữ logo CSAT dạng path và nền kem bo góc; góc ngoài trong suốt. Nguồn `public/icon/favicon.svg`, PNG 32px và ICO 16/32/48px là bản dẫn xuất. Metadata có phiên bản URL để trình duyệt lấy bản mới khi favicon thay đổi.

## Hình khối, typography và khả năng đọc

- Thẻ mới theo neobrutalism dùng viền 2–3 px và bóng cứng lệch 4–5 px; góc nhỏ/vuông/cắt góc theo component. Không thêm tilt hoặc hover nhấc mạnh khiến thẻ thông tin giống nút.
- Heading công khai viết hoa theo CSS, body viết câu tự nhiên. Chữ thật đọc/copy được; dùng font heading cho tên phần học, font menu cho ký hiệu/nhãn phụ.
- Dải tag dùng màu để phân nhóm, vẫn có nhãn rõ nghĩa; màu không là cách duy nhất biểu đạt lớp/mức độ/trạng thái.
- Thẻ đọc và form có mặt đặc hoặc đủ tương phản. Gradient/orb/line ở phía sau, không phủ chữ. Ngoại lệ mặt mô tả E được quy định riêng dưới đây.
- Kính chỉ giữ tại navbar/dock/select/kết quả đã có; blur cố định 8–12 px, fallback đặc. Không mở rộng glassmorphism thành phong cách thẻ mới hoặc animate blur.
- Nhịp khoảng cách 4/8 px; ưu tiên nội dung gọn nhưng không cắt chữ, thu nút hoặc khóa chiều cao.
- Mục tiêu tương phản: chữ thường ≥4,5:1, chữ lớn/ranh giới thao tác ≥3:1; target ≥44×44 CSS px. Cần đo nền composited khi chữ đặt trên ảnh/gradient.
- Icon thao tác giữ hệ Lucide/Base UI hiện có; art SVG nét vuông, góc gãy, pixel và mạch. Art aria-hidden, không nhận focus/pointer; không dùng emoji thay thao tác.

Portal admin/gia sư/phụ huynh ưu tiên dữ liệu, quyền và thao tác chính xác. Không áp hero typography, lớp màu hoặc hiệu ứng trang trí công khai lên bảng nghiệp vụ.

## Responsive và mật độ

Khung công khai chung tối đa 1.408 px, co theo viewport; Thành tích có ngoại lệ riêng. Dùng grid/flex, minmax, clamp và sizes đúng với ảnh hiển thị. Không fix chiều rộng poster desktop hoặc phóng bằng một số pixel để đáp ứng mọi màn hình.

Trang giới thiệu dùng khoảng đệm dọc 70% mức gốc; tổng quan lộ trình 50%. Token ở public-density.css, scope home-overview/roadmap-overview. Không áp tỷ lệ này sang portal, đội ngũ hoặc chi tiết lớp. Giữ khoảng trống menu, focus, nút và trường nhập.

QA bao gồm màn hình ngang/dọc, 320 px, breakpoint hai phía và zoom 200%; ảnh/đường nối không đè nội dung, thẻ co theo chữ dài.

## Quy định theo trang

### Giới thiệu

Hero CSAT → bốn lý do học thi đấu → đội ngũ → hệ sinh thái → lớp học → sáu bước buổi học → phụ huynh → tư vấn. Bóng đèn ở cạnh nhãn trong luồng bố cục, không phủ heading.

Hệ sinh thái dùng terminal ở giữa bốn nhánh: Kho bài & máy chấm, Nhóm học nhỏ, Gia sư chuyên Phan, Đồng hành sát sao. Hai hàng, mỗi hàng hai ô trên desktop, cột phải lệch nhẹ; dưới 901 px chuyển dọc. Đường mạch/chip nằm sau nội dung, art dẫn section không cần heading lớn lặp lại. CSATOJ có CTA thật.

### Tìm hiểu lộ trình

Mở đầu bằng tiêu đề/art terminal trước bốn ảnh góc khuyết → chọn điểm bắt đầu → cụm 9 icon → A/B/C/E/K → tư vấn. Không phục hồi hero cũ hoặc sơ đồ A/B/C lặp đã bỏ.

Ảnh A/B/C.jpg, E.jpg và Custom.jpg cho K dùng bản WebP tối ưu ở catalog. Ảnh nằm dưới nền tên/miêu tả, không tràn xuống kiến thức; zoom 110% để hover không lộ viền. Vị trí absolute không bị CSS trigger ghi đè khi chuyển route. Tổng quan không cho click mở ảnh, không link/button/tabindex/dialog hoặc nút Xem ảnh lớp. Không parallax, sticky hoặc di chuyển ảnh theo cuộn; hover phản hồi ảnh/bóng hữu hạn, reduced motion tắt.

A/B/C bỏ tiêu đề phụ và dải thuật toán ngay dưới giới thiệu. Phần nội dung học giữ tên chặng và tag thuật toán theo đúng thứ tự, không hiển thị dòng “Kiến thức nối tiếp · Tư duy phát triển”; không mô tả kỹ năng phía dưới hoặc nhãn Tư duy rèn luyện. Các ô roadmap dùng một hue với đậm nhạt khác nhau; phần tính chất/đối tượng có thể phối nhiều màu, rõ tương phản. Nhãn Nền tảng để phát triển được giữ.

Hashtag chỉ A/B/C, góc phải ảnh và không chèn chữ; E/K không có hashtag. K: ba ô Một hướng học từ nhu cầu cụ thể cùng hàng trên 600 px, dọc khi hẹp. Heading lớp và heading tư vấn không có glyph.

### E trong tổng quan

- Đúng một mục nổi bật, nền ngoài xanh đậm/orb rõ và art code/ngoặc/binary/huy chương. Ba trọng tâm sáng, giữ bảng màu E; số 03 teal đậm/chữ trắng để tách nền kem.
- Tên CHỦ LỰC viết hoa, heading lớn; bỏ khẩu hiệu Chuyên sâu tri thức. Vững tư duy thi đấu. Tag Thi đấu & phát triển ở hàng thời lượng/sĩ số.
- Ảnh roadmap-e-v3.webp, 3200×2400, Next Image quality 90 riêng E; crop/transform-origin 50% 75%, zoom 110%, opacity 1, không blur. Gradient kem nhẹ phía trên, nửa dưới trong suốt.
- Mô tả căn giữa; nền transparent, radial kem từ tâm ra trong suốt (82% → 54% → 0), không viền/nền kem đều. Chữ trên ảnh dùng --e-photo-ink #0D0D0C, không tự đổi trắng/kem chỉ vì nền ngoài tối.
- Sơ đồ gọn ba ô: C / NỀN TẢNG NÂNG CAO → THI TUYỂN RIÊNG → huy chương / ELITE. Không heading Từ nền tảng đến Chủ lực hoặc chú thích lặp.
- Ô 1/3 căn giữa cả hai chiều; C cùng hàng dòng dưới, không icon C lặp; huy chương cùng hàng ELITE, không chữ E/Chủ lực lặp. Các nhãn cùng Archivo 750, line-height 1,4, 14 px desktop/12 px mobile, in hoa. Ba ô tối thiểu 72 px và tăng theo chữ, viền 2 px/bóng 4 px, không giả nút.
- Icon thi tuyển ClipboardCheck nét 1,5; huy chương nền nét 0,8, code/ngoặc/binary nét 2,2. Không thêm font/dependency để vẽ icon.
- Nội dung ba trọng tâm: tri thức/phương pháp; đội ngũ/môi trường; bài tập/cọ xát. Không tự tạo danh mục giáo trình/giá/contest.

Nguồn sửa mô tả E: lib/public-roadmap-content.ts, E.overview; trọng tâm ở E.development. Giữ phần chủ trung tâm tự biên tập.

### Chi tiết lớp

Poster chiếm cột co giãn cạnh heading/đoạn dẫn trên màn hình ngang, kéo xuống gần hàng nút đăng ký; dọc/mobile giữ ảnh gọn cạnh heading/facts và đưa mô tả/nút xuống hàng đầy đủ. Không đè chữ, không cố định chiều rộng ảnh theo màn hình desktop.

Breadcrumb 14–15 px một hàng, căn giữa. Ba khối Đối tượng / Cùng chọn điểm bắt đầu / Thông tin lớp dùng neobrutalism, viền 2 px/bóng 5 px, typography rõ. Lịch ở ngay dưới CTA.

Tất cả lớp dùng nền chung website; E chi tiết không mang nền tối riêng của E tổng quan. Orb/line/blob radial tĩnh theo accent từng lớp, ở góc sau chi tiết, không bắt pointer; mặt thẻ đọc đặc.

Chặng editorial: số/tên/nội dung căn giữa, thẳng hàng, mũi tên chỉ thứ tự ngang hoặc dọc. Nội dung chủ đề chi tiết vẫn đầy đủ. Mục tiêu cuối khoá đặt trước Cùng CSAT chọn bước tiếp theo; heading tư vấn thường, không glyph.

### Đăng ký học

Mẫu 3 đã duyệt: lưới 3/2/1 cột desktop/tablet/mobile, poster 144 px desktop và thu khi hẹp. Thời lượng/sĩ số ngay dưới tên; đối tượng bám nguồn ảnh đã đối chiếu, tag kiến thức, giá và CTA. E/K không tự thêm giá. Ảnh chi tiết/đăng ký vẫn mở toàn màn hình có nút tắt.

### Thành tích

Mẫu 3 nhãn gắn cạnh ảnh: poster vuông bên trái, tên/thành tích/trường bên phải, cả mobile vẫn liền cạnh. Viền 3 px/bóng 5 px, dải lime/cam/cobalt, body trên mặt trắng, không gradient/blur trong thẻ. Nhãn HỌC SINH không đánh số.

Desktop >1100 px wrap tối đa 1760 px/lề tối thiểu 12 px mỗi bên, chỉ áp trang này. Ba thẻ ≥1440 px, hai ở 901–1439 px, một ≤900 px. Ảnh chiếm 48% ngang desktop/42% hẹp, khung vuông căn giữa cạnh nhãn; không cắt poster hoặc khóa chiều cao chữ.

Hero căn giữa, line-height 1,144; huy chương/terminal hai bên, tâm giữa mép wrap và mép chữ. Art đã tăng 10%, co theo vùng bên; ≤800 px cùng hàng dưới chữ. Art nhiều lớp hình học, hover nhẹ 260 ms, không animation lặp. Thẻ lướt lên 24 px/520 ms một lần; hover 220 ms. Chi tiết ở [Thành tích](PUBLIC_ACHIEVEMENTS.md).

## Tương tác và nguồn tài nguyên

Tiêu đề lớp/tư vấn, menu, form, tên học sinh không glyph. Những nơi glyph còn được duyệt chỉ là lớp aria-hidden giữ văn bản thật, tắt touch/selection/reduced motion; không lan hiệu ứng sang toàn bộ heading.

Nút lên/xuống ở lề phải là overlay, có thể đè nội dung theo yêu cầu, không dành thanh/cột dọc hoặc giảm wrap. Lightbox có đóng/Escape/focus-return, no-JS mở WebP trực tiếp; không khóa cuộn trang bằng sửa root.

Chỉ đưa media đã chọn/tối ưu vào runtime. Raw poster/video, prototype/ảnh QA/manifest nội bộ ngoài Git và gói deploy. SVG/CSS trang trí không cần tạo bitmap. No-JS/reduced motion/print đọc đầy đủ; observer/listener/rAF có cleanup. Xem [motion workflow](UI_MOTION_WORKFLOW.md) và [frontend workflow](FRONTEND_WORKFLOW.md).
