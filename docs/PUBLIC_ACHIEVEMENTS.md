# Thành tích công khai

Chủ trung tâm đã chọn **bố cục 3 — nhãn gắn cạnh ảnh**, phong cách neobrutalism; lưu dữ liệu riêng và dựng trang tĩnh. Đây là danh mục biên tập công khai, tách khỏi hồ sơ học sinh Portal. Không có database/API quản trị phần này.

## Cấu trúc và nơi sửa

| Phần | Nguồn |
|---|---|
| Danh mục | lib/public-achievements.ts, publicAchievements |
| Hero/nội dung/HTML | app/thanh-tich/page.tsx |
| Layout/tag/art/motion | components/marketing/achievements.css |
| Ảnh đã chọn | public/images/site/achievements/ |
| Lời mời học liệu | PublicNavigation.tsx ẩn riêng trên trang này để không che thẻ |

Mỗi record có id ổn định, name, school, achievements và image (src/width/height/srcSet). Thành tích có thể nhiều dòng; school null bỏ khối trường, không tạo giá trị thay thế. Route dùng dynamic = 'error' để phát hiện việc vô tình thêm dữ liệu theo request.

Nội dung có sẵn trong HTML, không gọi Supabase/API, không nối học sinh Portal hoặc lưu hồ sơ vào trình duyệt. Cập nhật catalog và asset rồi build/phát hành theo workflow; không cần query database mỗi lượt đọc. Quản trị/CMS chỉ cân nhắc khi có nhu cầu và hợp đồng riêng.

## Nội dung được phép

Nguồn gồm 17 poster do người dùng cung cấp trong public/images/students. Agent đã đọc tên/trường/thành tích, phần chữ và năm học được đối chiếu lại trên ảnh gốc. Poster ghi **trúng tuyển lớp 10 chuyên Tin, năm học 2026–2027**; không có căn cứ thêm giải thưởng hoặc thứ hạng. Nhãn thành tích rút gọn tránh lặp trường ở dòng bên cạnh.

**15 mục không mơ hồ** đang ở runtime. Hai nguồn bắt đầu 791129869 (vest) và 791684061 (áo tốt nghiệp) cùng tên/trường nhưng chân dung khác, chờ chủ trung tâm chọn bản hoặc xác nhận hai người khác nhau. Không tự gộp, tạo hai thẻ trùng hoặc công bố tổng số học sinh duy nhất. Chi tiết đọc/manifest ở scratch nội bộ; không lấy số ảnh làm số học sinh.

## Bố cục đã duyệt

- Hero căn giữa: BỀN BỈ NỖ LỰC · TỰ HÀO TIẾN BƯỚC; heading Từng nỗ lực. / Thêm dấu mốc. Mô tả chủ trung tâm biên tập nói về nỗ lực, chúc mừng và niềm vinh dự đồng hành hôm nay/tương lai; giữ nguyên khi chỉ sửa layout.
- Bỏ link Những dấu mốc học sinh; phần danh sách tên **BẢNG VÀNG VINH DANH**.
- Art huy chương/terminal SVG nhiều lớp: màu phẳng, viền đậm, bóng cứng, lưới/pixel/dải màu/tia. Hai bên desktop, tâm giữa mép wrap và mép cột chữ tối đa 680 px. Art tăng 10% qua scene riêng, ngoài co theo vùng bên; ≤1200 px cột theo tỷ lệ, ≤800 px hai art cùng hàng dưới chữ.
- Desktop >1100 px wrap tối đa 1760 px, lề tối thiểu 12 px mỗi bên; không đổi menu/trang khác.
- Lưới: 3 thẻ ≥1440 px, 2 ở 901–1439 px, 1 ≤900 px. Khung ảnh vuông, 48% chiều ngang desktop/42% màn hình nhỏ, căn giữa cạnh nhãn. Ảnh và nhãn vẫn liền cạnh trên mobile; thẻ tăng chiều cao theo chữ, không crop poster.
- Thẻ viền 3 px/bóng cứng 5 px; tên trên lime/cam/cobalt, mặt nội dung trắng/chữ ink. Không gradient/blur trong thẻ. Nhãn HỌC SINH không số.
- Chữ tên/thành tích/trường được tăng 10%, đệm/chi tiết giảm 10% so với bản đã duyệt ban đầu; không scale toàn thẻ làm chữ nhỏ đi. Hero line-height 1,144.
- Art hoàn toàn trang trí, aria-hidden và không focus; ảnh học sinh không mở modal.

## WebP và chuyển động

Poster giữ 1:1 và đủ nội dung. Dựng WebP tĩnh quality 88, cạnh tối đa 960 px, biến thể 320/640 khi nguồn cho phép; không upscale nguồn 526 px. Picture chọn bản theo sizes/DPR; Image unoptimized giữ fallback/kích thước/lazy load, không nén lại ở runtime.

15 bản lớn tổng 892.932 byte từ nguồn 3.387.348 byte; mọi biến thể tổng 1.607.100 byte là dung lượng tài nguyên lưu, không phải tải mỗi lượt. Đo local tải đủ 15 ảnh ở DPR2: 375 px 218.028 byte, 1440 px 526.262 byte, chưa gồm HTML/CSS/font. Không suy thành số liệu băng thông production.

Thẻ reveal lướt lên 24 px/520 ms một lần; chữ hero rise 16 px. Hover thẻ 220 ms, art 260 ms và trở về khi rời chuột, chỉ trên thiết bị hover phù hợp. Không animation lặp/glyph trên tên; no-JS/reduced motion/print đọc đầy đủ. Tái dùng Reveal và cleanup hiện có, không thêm listener cho art CSS.

## Workflow cập nhật

1. Đối chiếu trực tiếp chữ/năm học với poster gốc và quyền công bố; không suy thông tin bằng khuôn mặt.
2. Nếu nguồn mơ hồ, giữ ngoài runtime và ghi mục cần xác nhận trong PROJECT_STATUS.
3. Chọn/tối ưu ảnh, giữ manifest nội bộ; chỉnh record với ID ổn định và srcSet đúng kích thước.
4. Kiểm tra layout chữ dài, ảnh đủ lớn/vuông, tương phản, lazy load, no-JS/reduce, hover và client navigation/history.
5. Node.js 24: TypeScript/lint/build theo [frontend workflow](FRONTEND_WORKFLOW.md); ghi kết quả local tại [tiến độ](PROJECT_STATUS.md).

JPG gốc, JSON agent, prototype và ảnh QA không đưa vào runtime/Git/gói deploy. Không tự commit/push/deploy sau kiểm thử.
