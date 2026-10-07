# Chuyển động và tương tác công khai

Chuyển động dẫn mắt và phản hồi thao tác; nội dung, liên kết và focus luôn sử dụng được. Quy định bố cục/style ở [design system](PUBLIC_UI_DESIGN_SYSTEM.md), quy trình ở [frontend](FRONTEND_WORKFLOW.md).

## Ràng buộc

- Cuộn gốc, không scroll lock/cảnh cuộn trống; không trì hoãn điều hướng hoặc gửi form để chạy animation.
- Ưu tiên opacity/transform, không animate blur/layout liên tục. Gradient/orb/line/mạch ở phía sau là trang trí tĩnh.
- Chỉ arm nội dung ngoài viewport sau hydrate; phần đã nhìn thấy không bị che lại. Reveal chạy một lần, focus mở ngay; no-JS/reduced motion/print luôn đọc đầy đủ.
- Observer/listener/timer/rAF có cleanup khi đổi route; gộp rAF, dừng tác vụ khi tab ẩn/ngoài viewport.
- Hover chỉ bật với thiết bị phù hợp; có bàn phím/touch cho thao tác thật. Art không là nút giả hoặc nhận focus.
- Glyph chỉ là lớp aria-hidden, giữ văn bản DOM/copy/chiều rộng; không ở tên lớp, tiêu đề tư vấn, tên học sinh, menu hoặc form. Tắt touch/selection/reduce/thiếu CSS Highlight API.
- Không thêm thư viện cho vài transition, không lấy hiệu ứng template thay nội dung đã duyệt.

## Hành vi hiện hành

| Vùng | Chuyển động | Fallback và giới hạn |
|---|---|---|
| Hero/đội ngũ | Portrait trong khung, icon/pixel hover nhẹ; thẻ gia sư reveal lệch nhịp | Không che tên/thành tích; reduce giữ yên |
| Bốn lý do | Panel mở bằng hover/focus/click; bóng đèn reveal khi tới | Nội dung không phụ thuộc hover, bàn phím/no-JS dùng được |
| Hệ sinh thái | Reveal rise, icon bốn nhánh phản hồi hover khác nhau | Mạch/blob/chip tĩnh sau thẻ, không animation lặp |
| Sáu bước buổi học | Điều hướng tới bước theo đường đọc, art cạnh desktop | Mobile từng bước độc lập; không ép chiều cao màn hình thấp |
| Học liệu/video | Reveal trái/phải; video lazy/mute/loop trong viewport | Pause/play; poster no-JS/reduce/save-data/lỗi, dừng tab ẩn |
| Mở đầu lộ trình | Art trước ảnh blur cố định; 9 icon hội tụ theo cuộn | No-JS/reduce bố cục hoàn chỉnh; không phải trạng thái xếp lớp |
| Từ chọn điểm bắt đầu tới tư vấn | Reveal slide/fade 16–18 px/520 ms một lần ở wrapper | Section ngoài cố định để spacing/nút mục đúng; không wipe/glyph |
| Ảnh nền lớp tổng quan | Zoom 110%, hover ảnh/bóng rung hữu hạn khoảng 500 ms | Không click, không parallax/sticky/chạy cùng cuộn; reduce giữ yên |
| Thành tích | Thẻ lướt lên 24 px/520 ms, hero rise 16 px; hover thẻ 220 ms/art 260 ms | Reveal một lần, art trở về khi rời chuột; reduce tắt, no-JS/print hiện |
| Menu/select | Disclosure/select với focus rõ, Escape trả focus; chevron 180 ms | No-JS menu native; không chờ animation để đi link |
| Nút lên/xuống | Tới section/header liền kề, offset menu | Overlay không dành cột; reduce cuộn tức thời, cleanup khi unmount |
| Poster chi tiết/đăng ký | Mở native dialog theo thao tác, ảnh lớn chỉ khi cần | Đóng/Escape/focus-return; no-JS link WebP, không khóa root scroll |
| Glyph còn được phép | Tối đa 7 grapheme gần chuột/~420 ms | Không đổi text thật; dọn khi scroll/selection/resize/blur/tab ẩn |
| Phản hồi click | Pixel ngắn, không chặn hành động | Reduce tắt hoàn toàn |

Reveal chung ở nơi khác có slide 820 ms, wipe 700 ms khi phù hợp ảnh; không áp nhịp đó đè lên lộ trình/Thành tích đã duyệt 520 ms. Wipe chỉ che khi thanh đã phủ kín, timeline CSS thống nhất; không dùng timer riêng để thay nội dung.

## Nghiệm thu

Kiểm tra Next.js cuối, không dùng prototype HTML thay bằng chứng:
desktop/mobile, sáng/tối, no-JS/reduce, zoom 200%, focus/bàn phím; scroll nhanh hai chiều, resize, tab ẩn/hiện, client navigation/history. Không mất nội dung/focus, chồng CTA hoặc tích lũy effect.

Ảnh tổng quan phải vẫn ở nền sau đổi route và đảo thứ tự CSS; chi tiết/đăng ký mở/đóng ảnh và trả focus đúng. Chữ thật chọn/copy được. Form dùng dữ liệu giả, không gửi request ngoài quyền.

Hiệu năng là mục tiêu đo trên build (LCP ≤2,5 giây, CLS ≤0,1), không là bảo đảm production. Không tắt test để né lỗi hoặc gọi kiểm tra vài trạng thái là chứng nhận WCAG. Kết quả/phạm vi ở [PROJECT_STATUS](PROJECT_STATUS.md).

Tham khảo nguyên tắc: [W3C giảm chuyển động tương tác](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [web.dev animation](https://web.dev/articles/animations-guide). Các hiệu ứng mới như SVG path draw/shared-layout chỉ là khả năng, không là yêu cầu đã duyệt.
