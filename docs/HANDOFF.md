# Tiếp nhận công việc CSAT

Mục tiêu hiện tại: hoàn thiện frontend theo chỉ dẫn của chủ trung tâm; backend tiếp tục theo hợp đồng và quyền riêng. Đây là điểm bắt đầu cho agent, không phải nhật ký hội thoại.

## Thứ tự đọc

1. README, AGENTS, SECURITY; kiểm tra Git status/diff và giữ công việc có sẵn.
2. [Tiến độ](PROJECT_STATUS.md) để phân biệt mã local, bằng chứng kiểm thử và production.
3. [Kiến trúc](ARCHITECTURE.md), rồi [frontend](FRONTEND_WORKFLOW.md) hoặc [backend](BACKEND_WORKFLOW.md).
4. Chỉ đọc tài liệu của chức năng đang sửa; tra cứu tại [danh mục](README.md).

## Quyết định của chủ trung tâm

| Quyết định | Nguồn chi tiết |
|---|---|
| Website phát triển trực tiếp bằng React/Next.js; prototype chỉ phục vụ duyệt và nằm ngoài runtime | [Website](PUBLIC_WEBSITE.md) |
| Phong cách neobrutalism, playful edtech; kết hợp editorial, bento và sơ đồ theo nội dung. Giữ Archivo, logo, bảng màu đã duyệt | [Design system](PUBLIC_UI_DESIGN_SYSTEM.md) |
| A/B/C/E/K là năm lớp công khai riêng. A+B chỉ gộp tạm trong quản lý; C là tên chung của phần C/D và lớp nâng cao tương lai | [Catalog](PUBLIC_COURSE_CATALOG.md) |
| Giữ đủ A9/B15/C19, mã C01–D07 và scope CD; chưa đổi lớp cũ trên gia sư/admin/database | [Đào tạo](CHUONG_TRINH_DAO_TAO.md) |
| E là CHỦ LỰC, chọn lọc từ C qua thi tuyển riêng; không phải PreVOI. Ba trọng tâm: tri thức/phương pháp, đội ngũ/môi trường, bài tập/cọ xát | [Catalog](PUBLIC_COURSE_CATALOG.md) |
| K là kèm riêng hoặc nhóm riêng, chọn nội dung đã duyệt; không mặc định HSGQG | [Catalog](PUBLIC_COURSE_CATALOG.md) |
| Các form công khai chỉ kiểm tra, xem lại, sao chép và chủ động liên hệ; chưa nối API hoặc gửi thư | [Website](PUBLIC_WEBSITE.md) |
| Thành tích dùng bố cục 3 nhãn cạnh ảnh, dữ liệu riêng và trang tĩnh; chỉ công bố nguồn đã xác minh | [Thành tích](PUBLIC_ACHIEVEMENTS.md) |
| Không dùng font KVANT cho chữ UI; A/B/C/E/K và sơ đồ E dùng font menu Archivo. Logo SVG giữ nét gốc | [Design system](PUBLIC_UI_DESIGN_SYSTEM.md) |
| Dùng Node.js 24 cho local, CI và deploy; kiểm tra phiên bản thật, không suy trạng thái hosted từ local | [Tiến độ](PROJECT_STATUS.md) |

Đội ngũ được giới thiệu là cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu. Giữ nguyên nội dung chủ trung tâm đã biên tập; không tự thêm danh hiệu, lời hứa kết quả, học phí E hoặc số liệu CSATOJ.

## Nơi sửa nhanh

- Dữ kiện lớp/giá/đối tượng/ảnh: lib/public-courses.ts.
- Diễn giải lộ trình, đặc biệt giới thiệu E: lib/public-roadmap-content.ts, mục E.overview; ba trọng tâm ở E.development.
- Giáo trình chuẩn: lib/learning-curriculum-20260922.json; không sửa khi chỉ biên tập quảng cáo.
- Mục tiêu cuối khoá: lib/public-course-outcomes.ts.
- Danh mục học sinh vinh danh: lib/public-achievements.ts; ảnh WebP chọn lọc trong public/images/site/achievements/.
- JSX/CSS: app/ và components/marketing/; bản đồ chức năng ở PUBLIC_WEBSITE.

## Khi tiếp tục

Xem UI hiện chạy và đối chiếu mã trước khi sửa. Thay đổi nhỏ trong phạm vi được giao có thể làm trực tiếp; thiết kế hoặc nội dung mới chưa duyệt cần bản xem cụ thể. Không phục hồi phương án cũ từ prototype hay nhật ký.

Kiểm thử theo phạm vi, dùng dữ liệu giả; ghi rõ bước chưa chạy. Không tự tạo agent, commit/push, migration hoặc deploy nếu chưa có yêu cầu/quyền phù hợp. Giữ snapshot, nháp/công bố, revision và lịch sử tài chính; không tự đánh giá thành thạo từ ranking.

Phần cần người dùng xác nhận và backlog duy trì ở PROJECT_STATUS. Server preview, báo cáo scratch và đường dẫn công cụ trên máy có thể không còn sau đổi phiên; workflow chung không phụ thuộc chúng.
