# Trang Tự học và bản đồ kiến thức

Trang công khai `/tu-hoc` có mục **Tự học** riêng trên menu chính, dành cho học sinh tham khảo hướng tự học. Trang `/lo-trinh` tiếp tục giới thiệu lớp và tuyển sinh. Đường dẫn cũ `/ban-do-kien-thuc` chuyển hướng 308 sang `/tu-hoc`, giữ query và anchor chủ đề. Bản đồ không ghi tiến độ, xếp lớp hoặc xác nhận thành thạo.

## Nguồn nội dung

- `lib/learning-curriculum-20260922.json` quyết định mã, tên, mô tả, thứ tự và 13 chặng: A có 9 chủ đề, B có 15, C có 19 (gồm C01–D07).
- `lib/public-roadmap-content.ts` cung cấp mục đích, cách tiếp cận và kỹ năng cần rèn đã dùng ở trang chi tiết lớp. Không tạo nguồn mô tả trùng lặp.
- `lib/knowledge-map-links.json` giữ liên hệ kiến thức và ID tag bài luyện, đối chiếu từ bản `csat-roadmap` do chủ trung tâm chỉ định. Nền tảng nên ôn là gợi ý biên tập; không phải điều kiện đăng ký hoặc chuyển chặng. Các nhánh học tiếp được suy ngược từ liên hệ này.
- Các bài trong `content/parent-topics/` dùng để đối chiếu phạm vi. Bản đồ không import catalog/toàn văn riêng tư, không tạo liên kết bài cần ngữ cảnh học sinh–lớp và không đổi quyền đọc.

## Kết quả đối chiếu tài liệu

Roadmap tham khảo khớp đủ 43 mã, nhưng tên rút gọn, thứ tự theo nhánh và một số mô tả khác khung chuẩn. Ví dụ C05 liệt kê multiset/unordered containers, C06 thêm heap; không chép các danh mục đó thành phạm vi chương trình. Bản tích hợp giữ nội dung nguồn của Portal, chỉ tiếp nhận liên hệ và ID tag.

PDF **Căn bản lập trình thi đấu** do chủ trung tâm cung cấp có 280 trang. Đã trích văn bản để khảo sát cấu trúc, đọc phần mở đầu/mục lục và đối chiếu mẫu tham lam trang 38–39; đã xem ảnh render trang 38. Đây chưa phải kiểm toán toàn bộ lý thuyết/code của sách. Sách có Euclid mở rộng, phi Euler, lũy thừa ma trận, đồ thị và các nội dung ngoài khung hiện hành; không tự thêm vào A/B/C/E.

Điểm cần kiểm chứng khi dùng sách để biên soạn tiếp: phần đổi tiền trang 39 giải thích điều kiện canonical bằng khả năng ghép mệnh giá lớn từ mệnh giá nhỏ. Điều đó chưa đủ để bảo đảm tham lam tối ưu: với mệnh giá 1, 3, 4 và tổng 6, tham lam lấy 4+1+1 trong khi 3+3 dùng ít đồng hơn. Bài C10 hiện có đã phân biệt lựa chọn cục bộ với chứng minh tính đúng và dùng bài chọn hoạt động. Vì vậy PDF là nguồn gợi ý đối chiếu, không là nguồn thay thế giáo trình hay bài đã kiểm chứng. Không sao chép toàn văn, code hoặc đưa PDF lên website.

## Trải nghiệm và ranh giới

- Hero nối ba phần A → B → C; nội dung chi tiết tổ chức theo chặng và chủ đề, giữ Archivo, palette CSAT, viền/bóng cứng và mặt màu phẳng.
- Lọc A/B/C; tìm tên, mã hoặc thuật toán có/không dấu; có số kết quả và trạng thái không tìm thấy.
- Mở chủ đề đọc cách tiếp cận, kỹ năng, nền tảng nên ôn và nhánh học tiếp. Chuyển sang chủ đề liên quan gỡ lọc, mở đúng mục, cuộn và đặt focus vào tiêu đề.
- URL `?lop=C&q=...` giữ bộ lọc; `#chu-de-D03` ưu tiên mở chủ đề trực tiếp. Back/forward và tải lại giữ ngữ cảnh URL; không lưu thông tin cá nhân.
- Native `details` đọc được khi không JavaScript; các bộ lọc cần JS được ẩn cho đến hydration. Không kéo thả, khóa cuộn hoặc chạy animation liên tục.
- Liên kết bài luyện mở tab CSATOJ theo tag, không gọi API sync, lấy điểm hoặc suy tiến độ. ID tag từ bản xuất nguồn 10/10/2026; cần rà lại khi CSATOJ thay đổi phân loại.
- Route dùng metadata/canonical, sitemap và llms công khai. Điều hướng **Tự học** nằm riêng trên menu chính và footer, không thuộc dropdown Lộ trình. Không thêm endpoint hoặc migration.

## Tiếp tục chuẩn hóa nội dung

Đã bổ sung [đối chiếu từng bài phụ huynh](PARENT_LESSON_AUDIT.md), gồm phần PDF đọc có trọng tâm và 43 đích tag kiểm lại ngày 16/10/2026. URL luyện tập nay tạo chung qua `lib/csatoj-practice.ts`; trang public không nhận nội dung/quyền của thư viện riêng tư. Kiểm HTTP và tag được chọn không đồng nghĩa nghiệm thu từng bài OJ.

1. Review cách diễn đạt cho học sinh và phụ huynh trên cùng mã chủ đề; giữ tách mục tiêu học, hoạt động và minh chứng thực tế.
2. Đối chiếu từng bài với nguồn học thuật và kiểm thử ví dụ/code trước khi thay nội dung; ưu tiên điều kiện áp dụng, trường hợp biên và phản ví dụ.
3. Chỉ thêm bài hoặc kiến thức ngoài khung khi đã duyệt phạm vi; E/K/PreVOI vẫn chờ nguồn riêng.

## Kiểm tra

`node --test scripts/tests/knowledge-map.test.cjs` kiểm khung chuẩn, 43 mã, quan hệ không chu trình/tham chiếu hỏng, tìm kiếm và dữ liệu public. `node scripts/tests/knowledge-map.browser.cjs` chạy Edge với preview loopback, chặn mạng ngoài và request ghi. Ảnh/báo cáo ở `scratch/knowledge-map-qa/`, không thuộc runtime/Git. Bằng chứng từng môi trường ở [PROJECT_STATUS](PROJECT_STATUS.md).
