# Đội ngũ và bài đăng công khai

## Phạm vi hiện tại — 05/10/2026

`/gia-su` giới thiệu đội ngũ, dùng chung hero và thẻ gia sư trong `TutorShowcase.tsx` với trang chủ. Nội dung và thành tích là thông tin công khai đã được trung tâm cung cấp; không đọc hồ sơ riêng hay thay dữ liệu `tutor_public_profiles`. Trang đăng nhập gia sư vẫn ở `/tutor`, menu mang tên “Kênh gia sư”.

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

## Khi nối hệ thống đăng bài

Chốt quyền biên tập, bản nháp/công bố, lịch sử/revision, nguồn và quyền dùng ảnh trước khi tạo migration. Chỉ bài đã công bố được trả cho website và sitemap; không đưa service role vào client. Chuyển nguồn dữ liệu qua adapter, giữ URL cũ hoặc redirect khi đổi slug. Bài HTML/rich text cần sanitize ở máy chủ; upload cần kiểm tra định dạng, giới hạn và quyền Storage.

Chức năng bình luận, phản ứng, chia sẻ và đồng bộ Facebook chưa thuộc phạm vi. Không thêm nút giả hoặc dữ liệu xã hội tự tạo. Kiểm thử quyền/database và cache sẽ được thực hiện cùng đợt tích hợp, không suy ra từ build frontend hiện tại.
