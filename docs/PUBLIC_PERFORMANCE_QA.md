# Hiệu năng và QA website công khai

Phương pháp đo, thay đổi đã giữ và giới hạn kết luận. Trạng thái phát hành ở [PROJECT_STATUS](PROJECT_STATUS.md), quy trình UI ở [FRONTEND_WORKFLOW](FRONTEND_WORKFLOW.md). Không dùng điểm Lighthouse làm điều kiện CI mỗi commit.

## Phạm vi kiểm tra thiết yếu

- Public: trang chủ, lộ trình, chi tiết, đăng ký, thành tích; điều hướng client/back/forward, chọn khóa mặc định, gửi form bằng API mock, consent/retry.
- Responsive: mobile/tablet/desktop và hai phía breakpoint; kiểm tràn ngang, ảnh, font, keyboard/focus, dark, reduced motion và no-JS.
- Kiểm bố cục trước/sau khi đổi CSS/server-client; không xóa rule theo Coverage một trang hoặc trì hoãn CSS thiết yếu.
- Portal private có runner riêng; public smoke không thay nghiệm thu quyền/Storage/Supabase thật.
- Local dùng Node24, production build và Edge có sẵn; không đo dev server hoặc cài Chromium local.

Runner: `scripts/check-public-site.cjs`, `scripts/tests/public-ui.browser.cjs`, `scripts/tests/public-seo.http.cjs`, `scripts/run-parent-topics-ui.cjs`. Fixture chỉ loopback, chặn mạng ngoài/request ghi ngoài mock. Ảnh/trace/HTML ở scratch ngoài Git.

## Báo cáo đầu vào và xử lý

Ảnh PageSpeed của chủ trung tâm ghi LCP 4,1 s, Speed Index 4,3 s, CSS chặn render ước tính 880 ms, ảnh bóng đèn dư khoảng 26 KiB và polyfill khoảng 14 KiB. Chưa có điều kiện/URL báo cáo để so trực tiếp; tổng thời lượng request song song không phải LCP có thể tiết kiệm.

| Vấn đề | Thay đổi đã giữ |
|---|---|
| Hydration nội dung tĩnh | HomeExperience, TutorShowcase, RoadmapExperience/CourseKnowledge render server; chỉ selector/form/motion ở client, children không thêm DOM |
| CSS ngoài phạm vi | Tách học liệu/video, theme E và CSS chi tiết; giữ thứ tự/cascade/reset. Thử tách CSS form làm FCP tăng nên không giữ |
| Ảnh quá lớn | Bóng đèn WebP 156×234, 6.676 byte, ảnh/mask cùng URL; hero có HTML sẵn, eager/fetchPriority high và sizes responsive |
| Đọc/ghi layout | Reveal dùng geometry từ IntersectionObserver; giữ cleanup/focus/reduced motion |
| Tải Excel | Bốn handler dùng dynamic import khi bấm; workbook kiểm round-trip bằng fixture |
| Polyfill framework | Chưa sửa bundle Next hoặc tắt prefetch chỉ để xóa cảnh báo; cần bằng chứng tác động trước thay đổi |

Các tối ưu giữ typography/palette, breakpoints, nội dung, tỷ lệ ảnh và chức năng. Đối chiếu 24 vùng ở 375/768/1440 px giữ hình học sau refactor lộ trình; hồi quy phát hiện và sửa lỗi cascade mobile trước phát hành.

## Cách đo

Lighthouse 13.5.0 qua Edge, mỗi lượt profile mới, chạy tuần tự ba lượt/trang và lấy trung vị riêng từng chỉ số. Mobile 412×823, DPR 1,75, RTT 150 ms, 1.638,4 Kbit/s, CPU slowdown 4×, throttling simulate.

- Local: next build/start loopback, cache server đã làm nóng, mạng ngoài bị chặn. Speed Insights local không đại diện hosted.
- Hosted: HTTPS thật, không mock/chặn Speed Insights. Cache/CDN/máy chạy khác local nên không so trực tiếp.
- TBT không phải INP; CLS lần tải không phải CLS cả phiên. Reflow viewport tương đương 200% không thay kiểm zoom thật/thiết bị vật lý.
- Điểm và tài nguyên gồm prefetch phải được ghi rõ; không coi toàn bộ bytes là bắt buộc để vẽ màn hình đầu.

## Kết quả được giữ làm đối chiếu

Baseline local trước tối ưu: 12 lượt, không runtime error/run warning.

| Trang | Điểm trung vị | LCP | TBT | CLS |
|---|---:|---:|---:|---:|
| Trang chủ | 72 | 3,94 s | 538 ms | 0 |
| Lộ trình | 75 | 4,20 s | 407 ms | 0 |
| Đăng ký | 76 | 3,76 s | 536 ms | 0 |
| Thành tích | 87 | 3,45 s | 223 ms | 0 |

Lượt local cuối cho trang chủ/lộ trình lần lượt LCP 3,62/4,07 s, TBT 21/22 ms. Trang đối chứng gần như không đổi bytes vẫn dao động lớn: không quy toàn bộ chênh lệch cho refactor. Lộ trình giảm khoảng 10,5 KB JS nhưng tăng 7,9 KB HTML; tổng giảm khoảng 3,7 KB trong lượt có prefetch. Thay đổi này chưa giải quyết hết CSS chặn render.

Hosted của bản **2171653**, kiểm chứng **15/10/2026**, ba lượt/trang:

| Trang | Điểm trung vị (khoảng) | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|
| Trang chủ | 95 (95–97) | 2,46 s | 1,11 s | 163,5 ms | 0 |
| Lộ trình | 90 (89–92) | 2,98 s | 1,11 s | 257,5 ms | 0 |

Sáu lượt không runtime error/run warning. Chưa có baseline hosted cùng điều kiện; không suy mức cải thiện production từ ảnh PageSpeed/local, không tuyên bố Core Web Vitals thực đạt.

Bằng chứng nội bộ: `scratch/performance-baseline/`, `scratch/performance-final/`, `scratch/performance-production-2171653/`, `scratch/roadmap-geometry-diff.json`. Các tệp có thể chỉ tồn tại trên máy thực hiện, không là dependency để chạy ứng dụng.

## Việc tiếp theo

Ưu tiên LCP/TBT lộ trình theo phần tử gây chậm thật; CSS chặn render, polyfill và ảnh dư vẫn có trong audit. Đo lại khi thay đường tải đáng kể, tối thiểu ba lượt cùng điều kiện. Chờ dữ liệu người dùng thực từ Speed Insights/Search Console trước kết luận INP/CWV.

Không tải trước mọi font/ảnh, thêm preconnect cùng origin, inline toàn bộ CSS thử nghiệm hoặc đổi giao diện chỉ để tăng điểm. Nghiệm thu đơn hợp lệ và login thật là việc nghiệp vụ riêng, không được suy từ kết quả hiệu năng.
