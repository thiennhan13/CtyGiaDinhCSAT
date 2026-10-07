# Đội ngũ và bài đăng công khai

## Phạm vi hiện tại

`/gia-su` giới thiệu đội ngũ, dùng chung hero và thẻ gia sư trong `TutorShowcase.tsx` với trang chủ. Nội dung và thành tích là thông tin công khai đã được trung tâm cung cấp; không đọc hồ sơ riêng hay thay dữ liệu `tutor_public_profiles`. Menu Trang liên lạc dẫn `/login`; `/tutor` giữ entry kiểm tra phiên và chuyển người chưa đăng nhập tới `/login?role=tutor`.

`/bai-dang` có lưới bài viết và `/bai-dang/[slug]` có trang bài với tên CSAT, văn bản, một ảnh và liên kết đọc tiếp. Ba bài đầu là nội dung giới thiệu chương trình, cách học và đội ngũ từ tài liệu đã duyệt; không tạo ngày đăng, bình luận hoặc số tương tác. Bài không tồn tại trả 404. Đây là khung frontend, chưa có database hay công cụ đăng bài.

## Nơi sửa

| Nội dung | File |
|---|---|
| Hero/thẻ gia sư dùng chung | `components/marketing/TutorShowcase.tsx` |
| Trang đội ngũ | `app/gia-su/page.tsx` |
| Dữ liệu bài: slug, nhóm, đầu đề, đoạn văn, ảnh, liên kết | `lib/public-posts.ts` |
| Lưới/trang bài | `app/bai-dang/page.tsx`, `app/bai-dang/[slug]/page.tsx` |
| Bố cục bài | `components/marketing/posts.css` |

Giữ văn bản thuần; ảnh chỉ dùng tài nguyên tối ưu được phép. Slug ổn định, duy nhất và gồm chữ thường không dấu/số/dấu gạch ngang. Sitemap lấy bài từ cùng nguồn dữ liệu. Quy tắc thiết kế chung ở [nhận diện](PUBLIC_UI_DESIGN_SYSTEM.md).

## Thông tin gia sư đã được duyệt

| Gia sư | Nội dung công khai có căn cứ |
|---|---|
| Trần Hải Đăng | Thủ khoa khóa 52 chuyên Tin THPT Chuyên Phan Bội Châu; Giải Nhất HSGQG 2025–2026, hạng 3 toàn quốc; Giải Nhì và Giải Ba HSGQG 2023–2025 |
| Ngô Tuấn Hiệp | Giải Nhì HSGQG; Giải Nhất tỉnh Nghệ An 2025–2026 |
| Trần Đăng Quang | Giải Nhì HSGQG 2024–2025 và 2025–2026 |
| Nguyễn Ngọc Bảo Toàn | Giải Nhì HSGQG 2025–2026; Giải Ba HSGQG 2024–2025 |

Nguồn là poster/thông tin trung tâm đã cung cấp và cho phép dùng, không phải dữ liệu suy từ bài viết hoặc ranking. Không diễn giải Thủ khoa khóa 52 thành một kỳ thi cụ thể; không gán danh hiệu cá nhân thành kết quả toàn trung tâm/học viên. Poster tổng hợp chưa rõ đối tượng/giai đoạn không dùng làm số liệu quảng cáo.

## Khi nối hệ thống đăng bài

Chốt quyền biên tập, bản nháp/công bố, lịch sử/revision, nguồn và quyền dùng ảnh trước khi tạo migration. Chỉ bài đã công bố được trả cho website và sitemap; không đưa service role vào client. Chuyển nguồn dữ liệu qua adapter, giữ URL cũ hoặc redirect khi đổi slug. Bài HTML/rich text cần sanitize ở máy chủ; upload cần kiểm tra định dạng, giới hạn và quyền Storage.

Chức năng bình luận, phản ứng, chia sẻ và đồng bộ Facebook chưa thuộc phạm vi. Không thêm nút giả hoặc dữ liệu xã hội tự tạo. Kiểm thử quyền/database và cache sẽ được thực hiện cùng đợt tích hợp, không suy ra từ build frontend hiện tại.
