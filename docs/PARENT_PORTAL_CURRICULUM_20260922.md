> Hồ sơ lịch sử 22/09; migration 20 đã áp dụng sau đó. Trạng thái hiện hành đọc [PROJECT_STATUS](PROJECT_STATUS.md).

# Cổng phụ huynh và khung kiến thức — 22/09/2026

## Trạng thái

Đã triển khai trong workspace; chưa commit/push, chưa chạy migration production và chưa triển khai Vercel. Không gửi email thật. Production được kiểm tra chỉ đọc ở bước khảo sát cũ: migration 17; các lớp Cơ bản/Nâng cao có lộ trình; Luyện thi nằm ngoài chuyển đổi. Số liệu vận hành giữ trong gói nội bộ.

## Nội dung thay đổi

- Nguồn chuẩn: `docs/CHUONG_TRINH_DAO_TAO.md` và `lib/learning-curriculum-20260922.json`: đủ 43 chủ đề, không ấn định 30/35 buổi.
- Cơ bản A/B/A+B; Nâng cao một khung gồm C+D. Admin và gia sư phụ trách lớp chọn nội dung, bỏ/khôi phục chặng và chủ đề. Chọn B không suy ra đã thành thạo A.
- `LearningBody.curriculum` tùy chọn để tương thích bản cũ, gồm `parts`, `excluded_stage_ids`, `excluded_topic_codes`, `current_stage_id`. Mã chặng/chủ đề ổn định, không dùng chỉ số hiển thị để ghi nhận tiến độ. Bản mới không dùng `stage_index`; bản cũ vẫn đọc được.
- Giữ RPC `/api/learning` và `parent_learning_portal`, bổ sung validation tại SQL và Zod. RPC phụ huynh đã trả toàn bộ body/template JSON nên không cần đổi chữ ký; chỉ trả dữ liệu đã công bố.
- Cổng phụ huynh dùng shell riêng: hồ sơ → nhận xét → lộ trình → định hướng phát triển → buổi học → OJ → gia sư/học phí. Giữ nhận xét, đính chính, phân trang, học phí ròng, dư/cần hoàn và khoản chưa đủ dữ liệu. Logo bên trái thanh trên cùng, theo prototype, là liên kết về trang chủ.
- Các chỉ số OJ chưa nối API; `ParentOJMetrics` mô tả dữ liệu nullable có lớp/contest/thời điểm. Chưa suy ra tổng bài từ chỉ tiêu trong Excel.
- `docs/prototypes/` được gitignore; không đưa prototype và Excel nguồn lên GitHub.

## Migration 20

File: `database/migrations/20260922_20_curriculum_frameworks.sql`.

Chỉ yêu cầu migration 17. Không cần migration email 18/19, không thay cấu hình cron/email. Trang quản lý chương trình tự đọc trường email cũ khi migration 19 chưa có và ẩn công cụ vận hành email cho đến khi nâng cấp. Migration chạy trong một transaction, khóa các bảng giáo án/lớp, có timeout và chặn áp dụng lần hai. Tạo phiên bản giáo án mới, đặt mặc định, chuyển mọi lớp Cơ bản/Nâng cao bất kể trạng thái hoạt động.

Mỗi lộ trình lưu snapshot trước/sau tại `csat_internal.curriculum_migration_snapshots`, không cho client đọc/sửa. Mục tiêu, thẻ, hình thức học, nội dung riêng được giữ; nháp và công bố được chuyển độc lập, nháp không tự thành công bố. Ghi thêm lịch sử. Chặng hiện tại đặt về chưa ghi nhận vì chặng cũ và mới khác nhau. Không sửa bản ghi học sinh, buổi học, điểm danh, nhận xét, đính chính, thanh toán và kỳ đã chốt.

## Các bước đưa lên production — chờ duyệt riêng

1. Rà soát diff riêng của đợt này, tránh đưa nhầm các thay đổi email đang có trong workspace. Xác nhận `git check-ignore docs/prototypes/parents-portal.html` và `git ls-files docs/prototypes` không có tệp được theo dõi.
2. Lấy bản sao lưu Supabase, ghi nhận số lượng và trạng thái migration. Chạy bản migration trên staging từ bản sao đã loại dữ liệu cá nhân trước; kiểm tra bản nháp riêng nếu hiện đã phát sinh.
3. Sau khi được cho phép, chạy đúng migration 20 trong Supabase SQL Editor bằng quyền quản trị. Không chạy lại migration cũ và không chạy toàn bộ thư mục tự động.
4. Chạy `database/verification/20260922_curriculum_frameworks.sql`; đối chiếu tổng lớp theo từng loại/trạng thái và số snapshot. Thực hiện kiểm tra phụ huynh với tài khoản được phép, gồm nhiều học sinh và dữ liệu học phí thật nhưng không ghi ra log.
5. Deploy phiên bản ứng dụng đã kiểm thử lên Vercel. Đợt này không có biến môi trường mới. Giữ nguyên cờ tắt email nếu chưa hoàn tất rollout Resend.
6. Gia sư/admin xác nhận lại chặng đang tập trung; thay đổi mục tiêu/nội dung riêng tiếp tục đi qua Lưu nháp → Công bố.

Nếu lỗi: transaction migration tự rollback khi thất bại. Nếu migration đã hoàn tất, không xóa lịch sử hay snapshot để quay lại. Dừng phát hành; dùng bản sao lưu/snapshot để chuẩn bị một migration bù được rà soát riêng. Giao diện mới vẫn đọc giáo án cũ, nên có thể triển khai ứng dụng trước rồi áp dụng migration khi đã duyệt.

## Kiểm chứng cục bộ

- Database nhúng: chuyển đổi mọi trạng thái lớp, bảo toàn bản nháp/công bố/lịch sử/học phí; quyền tutor/admin, chặn service giả danh; không lộ dữ liệu học sinh khác; mã ngoài danh mục, chặng bị bỏ, công bố rỗng và revision cũ bị chặn.
- Danh mục: 43 mã duy nhất; A=9, B=15, A+B=24; Nâng cao=19; bỏ/khôi phục đúng thứ tự; đọc được phiên bản cũ.
- Browser fixture chỉ dữ liệu giả, chặn kết nối ngoài localhost: 1440/768/375, menu mobile, vị trí nhận xét, duy nhất logo về trang chủ, dialog bàn phím, dark mode, in A4, chọn A/B và bỏ/khôi phục. Route QA tạm thời được xóa khi kiểm thử kết thúc.
- Ảnh và PDF kiểm thử ở `scratch/` (được gitignore); không phải hồ sơ học sinh thật.

Kết quả: 229/229 kiểm thử hồi quy đạt; kiểm thử browser đạt. TypeScript, ESLint phạm vi sửa đổi và production build cục bộ đạt. Không có thay đổi production trong đợt triển khai local này.

## Điều chỉnh theo phản hồi 22/09/2026

- Đưa logo về bên trái như prototype; giữ một liên kết về trang chủ và các thao tác in/đăng xuất bên phải.
- Thêm “Định hướng phát triển của con” ngay sau lộ trình, cùng mục điều hướng riêng.
- Dựa trên chương trình của bản kế hoạch lớp đã công bố: Cơ bản → HSG Tỉnh lớp 9 (hiện tại), Chuyên Tin (hướng tiếp theo); Nâng cao → HSG Tỉnh cấp THPT (hiện tại), HSG Quốc gia (hướng mở rộng cần bổ sung chương trình).
- Đây là định hướng chương trình, không suy ra trình độ/mục tiêu cá nhân từ tên lớp hoặc cấp học. Không có kế hoạch Cơ bản/Nâng cao đã công bố thì hiển thị lời hẹn trao đổi, không tự gán hướng thi.
- Nội dung HSGQG chỉ giải thích hướng phát triển; chưa thêm chủ đề chưa duyệt vào khung đào tạo. Không thay đổi database hoặc các kỳ đã chốt.

Kiểm tra sau điều chỉnh: TypeScript, ESLint các component thay đổi và `git diff --check` đạt; browser QA xác nhận logo bên trái, vị trí mục định hướng, phân biệt Cơ bản/Nâng cao và trạng thái chưa công bố; không tràn ngang ở 1440/768/375px, menu mobile, dark mode và xuất A4 hoạt động. Không chạy migration hoặc triển khai production trong lần chỉnh sửa này.


## Bản phát hành kết hợp 22/09/2026

Đợt kết hợp bổ sung migration 21 và kiểm thử chuỗi 18–21. Xem [Hướng dẫn phát hành và nghiệm thu](RELEASE_PARENT_EMAIL_20260922.md) để dùng thứ tự migration mới, công cụ thư mẫu cố định người nhận, dữ liệu phí từng buổi và trạng thái production mới nhất. Các thao tác production/gửi thật vẫn cần được cho phép.
