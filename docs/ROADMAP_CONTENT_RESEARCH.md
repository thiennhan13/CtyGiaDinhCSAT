# Nghiên cứu và biên tập nội dung lộ trình công khai

Phạm vi: nội dung frontend công khai. Tài liệu ghi căn cứ cho `lib/public-roadmap-content.ts`; không đổi giáo trình, template, quy tắc xếp lớp hoặc dữ liệu học tập.

## Nguồn của CSAT

**Mục tiêu cuối khoá:** chủ repo yêu cầu mô tả tư duy, dạng bài, mức độ vận dụng thuật toán và nền tảng học tiếp ngay trước mục tư vấn trên các trang chi tiết. `lib/public-course-outcomes.ts` tổng hợp từ A01–A09, B01–B15 và C01–D07 cùng diễn giải hiện có, không thêm chủ đề. A hiểu và kết hợp cấu trúc C++; B nhận diện/vận dụng phương pháp cơ bản theo giới hạn dữ liệu; C mô hình hóa, lập luận tính đúng/độ phức tạp và kết hợp kỹ thuật. E dùng định hướng chủ repo đã duyệt: đào sâu nền C, tư duy toán học, đề thi/contest và nhóm chọn lọc, không tự lập danh mục thuật toán E. K giữ phạm vi được trao đổi từ chương trình đã duyệt. Nội dung là mục tiêu học, không phải đánh giá thành thạo, bảo đảm kết quả thi hoặc tự động chuyển lớp; C → E vẫn qua thi tuyển riêng. Không đổi catalog/giáo trình hoặc dữ liệu admin/gia sư.

**Định hướng E do chủ trung tâm duyệt:** E chọn lọc từ lớp C, định hướng chuẩn chuyên Tin và thứ hạng cao trong lập trình thi đấu; chú trọng thuật toán, tư duy toán học và giải quyết vấn đề. Gộp mở rộng tri thức/liên hệ phương pháp thành một trọng tâm; hai trọng tâm còn lại là đội ngũ từ giải Nhất cấp Tỉnh đến HSG Quốc gia với tập thể cùng chí hướng, và bài tập chuyên sâu từ đề thi thật/đề luyện thi cùng ưu tiên contest/giao lưu/cọ xát. Nguồn này được ưu tiên hơn diễn giải poster cũ. Không gán thành tích tập thể này vào hồ sơ cá nhân, không tạo số giải/số bài/lịch contest. Phân biệt CSATOJ luyện/chấm bài với CSAT Portal theo dõi việc học; API đồng bộ CSATOJ còn là tích hợp tương lai theo HANDOFF. Bản viết mới ở `publicRoadmapContent.E` và ba phần `development`, dùng chung tổng quan/chi tiết.

Đã xem trực tiếp bốn poster 2160 × 2160 trong `public/images/courses`, đối chiếu với [catalog công khai](PUBLIC_COURSE_CATALOG.md), [chương trình đã duyệt](CHUONG_TRINH_DAO_TAO.md) và `lib/learning-curriculum-20260922.json`.

| Nguồn ảnh | Thông tin xác thực dùng để biên tập |
|---|---|
| `01-rank-a-font-2160[1].png` | Nhập môn lập trình, lớp 5–7, định hướng chuyên Tin / lập trình thi đấu; A01–A09; 99.000đ, 90 phút, 5–8 học sinh |
| `02-rank-b-font-2160[1].png` | Lập trình thi đấu cơ bản, lớp 7–9, HSG cấp Phường hoặc chuyên Tin các tỉnh không quá cạnh tranh; B01–B15; 99.000đ, 90 phút, 5–8 học sinh |
| `03-rank-c-2160[1].png` | Lập trình thi đấu nâng cao, lớp 7–9, HSG cấp Tỉnh hoặc chuyên Tin các tỉnh mạnh, cạnh tranh; C01–C12 và phần D; 109.000đ, 90 phút, 5–8 học sinh |
| `04-cac-lop-khac-2160[1].png` | E Chủ lực thi tuyển đầu vào riêng từ C, cần kiến thức khó hơn và không chỉ ôn thi lấy thứ hạng; 3–4 học sinh, 2 giờ, lịch theo thành viên. K học 1–1 hoặc nhóm đăng ký riêng; thời lượng/lịch theo yêu cầu. E/K trao đổi học phí và kiến thức cùng trung tâm |

Poster C viết tóm tắt phần D; phạm vi chính thức dùng đủ D01–D07 trong JSON. Các chặng là cách tổ chức đã duyệt: A có 3, B có 4, C+D có 6. Không suy số buổi từ số chủ đề. Theo quyết định hiện hành, A+B chỉ gộp tạm trong quản lý với 24 chủ đề/7 chặng; website tách A/B và không có trang/tư vấn A+B. Khi poster và quyết định được duyệt khác nhau, quyết định hiện hành trong catalog/chương trình có ưu tiên.

## Tham khảo cách trình bày

Các nguồn dưới đây được dùng để nghiên cứu cách tổ chức thông tin và giọng văn. Không sao chép slogan, bài giảng, lộ trình hoặc nội dung độc quyền vào sản phẩm; không tuyên bố CSAT được bảo trợ, liên kết hay chứng nhận bởi các tổ chức này.

- [VNOI Wiki](https://wiki.vnoi.info/): giới thiệu kiến thức theo nhóm thuật toán và mức độ; giúp người đọc nhìn thấy cấu trúc trước khi mở nội dung sâu hơn. Trang chính thức đủ căn cứ tham khảo hình thức; URL `/roadmap` không đọc được qua công cụ trong lượt này, nên không dùng nó để tuyên bố đã đối chiếu từng chủ đề của VNOI Roadmap.
- [VNOI — Resources](https://oj.vnoi.info/post/192-dquynh_2811): giọng văn đặt việc tự học, rèn luyện và nguồn tri thức làm trọng tâm. Vận dụng ở cách giới thiệu hành trình học bằng mục tiêu và phương pháp, không dùng những khẳng định uy tín của tổ chức làm lời quảng cáo cho CSAT.
- [Introduction to Competitive Programming — USACO Guide](https://usaco.guide/general/intro-cp?lang=cpp): phân biệt xây thuật toán với cài đặt chương trình. Đây là căn cứ tham khảo cho cách trình bày mối liên hệ giữa ý tưởng, mã và kiểm tra trong nội dung mới.
- [Using This Guide — USACO Guide](https://usaco.guide/general/using-this-guide?lang=cpp): phân biệt danh mục kiến thức với dự báo nội dung thi; tổ chức học theo module và bài luyện. Vận dụng nguyên tắc làm rõ phạm vi kiến thức, không suy ra cam kết bao phủ đề thi hoặc kết quả học sinh.

## Quy tắc hành văn đã áp dụng

Nội dung dùng giọng học thuật phổ thông: tên thuật toán chính xác, giải thích ngắn vai trò và liên hệ với bài toán. Tiêu đề nêu hành động hoặc sự phát triển tư duy; đoạn dẫn triển khai quan hệ nguyên nhân, tiến trình và mục đích. Tránh lặp một khuôn câu cho mọi lớp, tránh cường điệu như “chinh phục mọi đề”, “đảm bảo đỗ” hoặc “thành thạo sau khóa học”.

Mỗi lớp có một hướng riêng:

- **A:** dữ liệu và yêu cầu → cấu trúc C++ → diễn đạt, kiểm tra lời giải.
- **B:** nền tảng C++ → bộ công cụ cơ bản → so sánh và chọn phương pháp.
- **C:** biểu diễn bài toán → kỹ thuật / chiến lược / trạng thái → lập luận và hiệu quả.
- **E:** nền tảng lớp C → thi tuyển riêng → đào sâu chuyên Tin và tư duy thi đấu. Theo yêu cầu mới của người dùng, nhấn chiều rộng kiến thức và chiều sâu tư duy; không tự thêm tên thuật toán, số chặng, tiêu chí thi tuyển hay học phí chưa được cung cấp.
- **K:** nhu cầu → phạm vi từ khung được duyệt → tổ chức nhịp học riêng. Không suy ra mục tiêu HSG Quốc gia.

Ở trang tổng quan, nên đọc được tên lớp, đối tượng, thời lượng/sĩ số và hướng phát triển trước khi đi vào danh mục. Tổng quan chặng chỉ giữ tên và tag thuật toán theo thứ tự, không đoạn mô tả kỹ năng phía dưới. Trang chi tiết mở rộng mỗi chủ đề bằng ba góc nhìn: **Mục đích** (`purpose`), **Cách tiếp cận** (`approach`), **Kỹ năng trọng tâm** (`skill`). Đây là khuyến nghị trình bày, không thêm một bước nghiệp vụ hoặc một dịch vụ mới.

## Phân biệt dữ kiện với diễn giải biên tập

**Dữ kiện được giữ nguyên:** mã/tên/phạm vi chủ đề, số và thứ tự chặng, đối tượng, mức phí/thời lượng/sĩ số đã công bố, E tuyển riêng từ C, K học riêng hoặc nhóm riêng. File biên tập không chứa giá và đối tượng mới; giao diện tiếp tục lấy các dữ kiện đó từ catalog.

**Diễn giải biên tập:** tagline, headline, đoạn giới thiệu, vai trò kiến thức, liên hệ giữa chặng và kỹ năng trọng tâm. Ví dụ: “mảng cộng dồn hỗ trợ suy ra tổng đoạn từ thông tin đã tính”, hoặc “quay lui cần theo dõi lựa chọn và khôi phục trạng thái”. Những câu này giải thích ý nghĩa của chủ đề đã duyệt, không xác nhận học sinh đã đạt kỹ năng, không quy định cách dạy từng buổi và không thay danh mục nguồn.

Chủ đề chỉ có tên nhưng không có mô tả chi tiết trong JSON được giải thích trong phạm vi tên đó. Không thêm đồ thị, segment tree, cây nâng cao hoặc giáo trình quốc gia vào C/E. C05 giữ đúng `set`, `map`, mảng đếm; không diễn giải nhãn “Cây & Băm” thành giáo trình cấu trúc cây riêng. Tham lam có lưu ý kiểm tra điều kiện và phản ví dụ; không khẳng định mọi bài đổi tiền dùng tham lam đều tối ưu. Hashing có lưu ý giới hạn/va chạm băm, không hứa so sánh tuyệt đối chính xác chỉ bằng giá trị băm.

## Cấu trúc bàn giao

- `publicRoadmapContent`: các khóa A/B/C/E/K (không có AB công khai); `tagline`, `overview`, `headline`, `introduction`, `foundation`, `pathway`, `focusTags`. Trường tùy chọn `development` chỉ có ở E, gồm 3 ô trọng tâm định hướng: Tri thức & phương pháp; Đội ngũ & môi trường; Bài tập & cọ xát.
- `roadmapStageContent`: 13 khóa theo stage ID gốc; `description`, `skills`, `bridge`. Thứ tự do JSON gốc quyết định.
- `roadmapLessonContent`: đủ 43 mã A01–A09/B01–B15/C01–C12/D01–D07; `purpose`, `approach`, `skill`. Tên chủ đề tiếp tục lấy từ JSON gốc.

Pathway của E/K mô tả đầu vào, định hướng hoặc việc thống nhất cách học; không được gắn nhãn “chặng giáo trình” hay số chủ đề. `bridge` là liên hệ biên tập giữa các nhóm kiến thức; không phải điều kiện chuyển chặng tự động.

`development` của E gồm ba trọng tâm đã duyệt: **Tri thức & phương pháp** kết nối thuật toán với tư duy toán học, lập luận và giải quyết vấn đề; **Đội ngũ & môi trường** nhấn sự đồng hành của gia sư và tập thể học sinh chung định hướng; **Bài tập & cọ xát** tập trung đề thi thật, đề luyện thi và cơ hội contest/giao lưu. Đây là **trọng tâm định hướng**, tách với quy trình tuyển chọn trong `pathway`; không phải 3 chặng giáo trình, tiêu chí thi tuyển hay cam kết học sinh sẽ đạt kỹ năng. Không thêm tên thuật toán, chuyên đề hoặc số buổi chưa được duyệt.

Kiểm tra các khóa A/B/C/E/K, 13 stage ID và 43 mã chủ đề với JSON gốc; E.development chỉ là ba trọng tâm định hướng. Kiểm thử cấu trúc không thay TypeScript/build/browser của ứng dụng. Bằng chứng và môi trường duy trì trong PROJECT_STATUS.
