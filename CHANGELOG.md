# Thay đổi và phiên bản

Gói nguồn, checksum và trạng thái phát hành nằm tại [GitHub Releases](https://github.com/thiennhan13/CtyGiaDinhCSAT/releases). Quy trình đóng gói ở [RELEASES](docs/RELEASES.md); nghiệm thu môi trường ở [PROJECT_STATUS](docs/PROJECT_STATUS.md).

## 2.1.0

- Trang phụ huynh: nền trắng, palette CSAT, lịch lượt nộp ô vuông, ba ô luyện tập tách màu, chỉ số ngày cố định12 tháng.
- Lộ trình: thanh pixel theo nội dung giáo án, tối đa100%; điện thoại đọc danh sách và mở bản đồ lớp tại route riêng có kiểm quyền.
- CSATOJ: bản gọn tiếng Việt, chi tiết rating mở sẵn, tải mới mỗi lượt truy cập và giữ trạng thái thiếu/thu hồi.
- Vá dependency: Next.js/eslint-config-next16.4.1, Zod4.6.6, minimatch11.0.1 và postcss-selector-parser6.1.5 theo advisory hiện hành.
- Chuẩn hóa repository chính thức, metadata package, giấy phép sử dụng nội bộ, liên hệ và tài liệu release/SEO.
- Bản đồ Tự học giữ ngữ cảnh history.state của router khi đổi hash, tránh mất ngữ cảnh back/forward.
- Đồng bộ fixture CI với nhãn, tiến độ, danh sách mobile và request OJ hiện hành.

Node.js24. Không thêm migration hoặc yêu cầu reset. OJ/activity thật, phiên Google với bộ dữ liệu mới và pilot học phí tiếp tục theo cổng nghiệm thu; release mã nguồn không xác nhận các bước đó đã xong.
