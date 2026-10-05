# Chuyển động và workflow giao diện CSAT

Cập nhật 05/10/2026 cho bản React/Next.js. Đọc cùng [website công khai](PUBLIC_WEBSITE.md), [nhận diện](PUBLIC_UI_DESIGN_SYSTEM.md) và [catalog](PUBLIC_COURSE_CATALOG.md). Kết quả kiểm thử/phát hành ghi trong [PROJECT_STATUS](PROJECT_STATUS.md).

## Nguyên tắc

Chuyển động dẫn mắt vào nội dung và phản hồi thao tác. Tiêu đề, liên kết, form và focus luôn ổn định. Không khóa cuộn, dựng cảnh cuộn trống hoặc trì hoãn điều hướng để chạy hiệu ứng. Không dùng ranking để suy ra mức độ thành thạo.

- Cobalt, lime, cam; hình học góc cắt, nét vuông, nhịp pixel. Biến thể giới hạn, không ngẫu nhiên hóa nội dung hoặc vị trí nút.
- Hover thao tác 160–240 ms, icon trang trí 350–720 ms, click khoảng 260 ms; reveal trượt 820 ms, mảng màu 700 ms, lệch nhịp thẻ 90 ms. Theo điều chỉnh tiếp ngày 05/10, reveal trở lại nhịp nhanh để thanh màu không đến sau nội dung; phản hồi nút/form giữ nhanh.
- Chỉ arm vùng ngoài viewport khi hydrate, kích hoạt ngay khi vào màn hình (rootMargin 0). Vùng đã hiện lúc tải không bị che lại. Wipe giữ nội dung hidden đến mốc 43% khi thanh phủ kín; visibility và thanh dùng cùng timeline CSS, không timer riêng hoặc đổi văn bản. Focus/reduced motion kết thúc hiệu ứng ngay; print giữ nội dung hiện.
- Scroll theo cuộn gốc, rAF được gộp; chỉ trang trí di chuyển. Dừng ngoài viewport/tab ẩn. Tối đa 24 icon desktop, 10 mobile một cảnh.
- Blur kính cố định 8–12 px. Hero làm mờ nhẹ cố định riêng ảnh trang trí; chữ và CTA không bị ảnh hưởng.
- Reduced motion thấy trạng thái hoàn chỉnh ngay; kiểm tra cả JavaScript và CSS.

## Hiệu ứng

| Mã | Khu vực và hành vi | Fallback |
|---|---|---|
| M01 | Hero trang chủ: ảnh phóng thêm 10%, neo trên và cắt trong khung; hai vòng tròn đồng tâm; C++ trắng, icon/pixel hover theo hướng và nhịp khác nhau. Bảng tên/thành tích không bị che | Chữ và ảnh luôn hiện; reduce bỏ chuyển động hover |
| M01b | Trang đội ngũ dùng chung hero; bài đăng dùng reveal lên lệch nhịp 90 ms, link điều hướng trực tiếp | No-JS/reduce đọc được, bàn phím mở bài |
| M01c | Video writing tại Không gian luyện tập: lazy, muted/loop trong viewport, dừng khi tab ẩn; có nút dừng/phát | Poster khi no-JS/reduce/save-data/lỗi; reduce/save-data cho phép chủ động phát |
| M02 | Icon giá trị mở nội dung bằng hover, focus hoặc click | Nội dung đọc được không cần hover |
| M03 | Bóng đèn: silhouette lime chuyển sang ảnh khi cuộn tới | Reduce/no-JS thấy ảnh hoàn chỉnh |
| M04 | Ba thẻ gia sư xuất hiện lệch nhịp, hướng lên/phải, phản hồi viền/nhấc nhẹ | Mobile xếp dọc |
| M05 | Sáu bước buổi học, minh họa cao hơn bám cạnh desktop, ba icon code nhỏ phản hồi hover; nút chọn cuộn theo cùng đường đọc của observer | Mobile từng bước độc lập; màn hình thấp thu chiều cao card |
| M06 | Reveal lên/trái/phải cho chữ và khóa học; mảng màu chỉ ở ảnh. Quãng trượt 26–38 px, easing cubic-bezier(.16,1,.3,1) | Reduce bỏ overlay |
| M07 | Hero lộ trình: bốn ảnh góc khuyết; icon hội tụ A/B/C, mở E/K | Mobile gọn, không cảnh cuộn rỗng |
| M08 | Selector phản hồi lựa chọn, cập nhật kết quả sau nút bấm | Các lớp vẫn đọc được |
| M09 | A+B, C, E/K: ảnh/đường nối tạo nhịp, nội dung cố định | Mobile một cột |
| M10 | Glyph tối đa bảy grapheme cùng dòng, khoảng 420 ms; nhận vị trí mới mỗi 35 ms; đổi glyph mỗi 80 ms (lộ trình 88 ms, chậm thêm 10%) | Tắt touch, selection, reduce, tab ẩn, thiếu CSS Highlight API |
| M11 | Click ba biến thể pixel ngắn, không chặn hành động | Reduce bỏ hoàn toàn |
| M12 | Menu/dock: focus liên kết đầu, Escape trả focus, không mở chồng | Menu tĩnh khi no-JS |

Glyph giữ nguyên DOM, dấu tiếng Việt, chiều rộng và tên truy cập. Copy là chữ tiêu đề (trình duyệt có thể viết hoa theo text-transform), không phải ký hiệu. Overlay aria-hidden, không bắt chuột; dọn khi scroll, selection, resize, blur, tab ẩn hoặc unmount. Không dùng menu/form hoặc đổi con trỏ thật.

## Phân công

Chỉ tạo agent khi người dùng hoặc hướng dẫn áp dụng yêu cầu. Khi làm song song, tối đa ba agent cùng điều phối:

1. Điều phối sở hữu shell, token, hợp đồng component/form, tài liệu và build.
2. Agent trang chủ sở hữu JSX, CSS và nội dung trang chủ.
3. Agent lộ trình sở hữu selector, catalog và chuyển động lộ trình.
4. QA độc lập sở hữu runner/bằng chứng, không sửa component đang có người thực hiện.

Giao việc ghi file sở hữu, nguồn nội dung, hợp đồng, test và giới hạn. Gửi phần chênh lệch cần biết, không sao chép toàn bộ lịch sử chat. Sau gián đoạn, xem trạng thái agent/Git trước khi tiếp tục; không giao cùng file cho hai người.

## Nghiệm thu

Kiểm tra bản Next.js cuối; kết quả HTML demo không thay bằng chứng tích hợp:

- Desktop/mobile, light/dark, bàn phím, zoom 200%, no-JS, reduced motion.
- Logo/menu dài, dock/safe-area, thành tích hero, glyph xuống dòng/chọn/copy chữ.
- Cuộn nhanh hai chiều, theme, đổi trang/back/forward, resize, chuyển tab; không mất nội dung/focus hoặc tích lũy listener/rAF.
- Selector chỉ lưu mã được phép trong URL; không có thông tin liên hệ, không xác nhận đủ điều kiện học.
- Form frontend: validation → kiểm tra/chỉnh lại → sao chép; không request API, không lưu bền vững, không báo đã gửi. Clipboard bị chặn thì chọn nội dung để sao chép thủ công. Luồng API/idempotency cần nghiệm thu riêng khi nối sau.
- Đo bản build: mục tiêu lab LCP ≤2,5 giây, CLS ≤0,1; ghi cấu hình/giới hạn, không gọi số lab là dữ liệu người dùng thực.

Chặn phát hành khi không đọc/thao tác được, gửi dữ liệu thật trong QA, sai nguồn nội dung, ảnh che chữ/CTA, mất nội dung nhập, lộ dữ liệu hoặc mất focus. Không tắt test để che lỗi.

Nguồn: [W3C về chuyển động do tương tác](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [web.dev về animation](https://web.dev/articles/animations-guide). Không tự tuyên bố chứng nhận WCAG hoặc bảo đảm hiệu năng production.

## Tên mẫu chuyển động để trao đổi thêm

- **Staggered reveal**: các thẻ gia sư lần lượt xuất hiện; đã áp dụng.
- **Directional slide reveal**: khóa A/C từ trái, B từ phải; đã áp dụng bằng opacity/translate, không khóa cuộn.
- **Masked image reveal / color wipe**: mảng màu mở ảnh; giữ cho các ảnh phù hợp.
- **SVG path draw**: có thể phát triển đường nối thuật toán; chưa áp dụng thêm trong đợt này.
- **FLIP / shared-layout transition**: tham khảo cho cảnh icon ghép sơ đồ phức tạp hơn; hiện vẫn là cảnh rAF có sẵn.

Tham khảo [Motion: scroll-triggered và scroll-linked animation](https://motion.dev/docs/react-scroll-animations), [GSAP: lỗi triển khai thường gặp](https://gsap.com/resources/mistakes/). Không thêm thư viện chỉ để thay vài transition, không sao chép nguyên template chưa kiểm tra license. Reveal chỉ ẩn phần ngoài viewport sau hydration, mở ngay khi focus/reduce; no-JS vẫn hiện nội dung. Các listener/observer/timer đều dọn khi unmount. Mục 04 không có glyph.
