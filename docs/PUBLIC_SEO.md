# SEO và khả năng khám phá website CSAT

Phạm vi: website công khai tại `https://portal.csatoj.vn`. Giữ thiết kế, nội dung đào tạo đã duyệt và ranh giới dữ liệu Portal. Trạng thái/bằng chứng ở [PROJECT_STATUS](PROJECT_STATUS.md); quy trình UI ở [FRONTEND_WORKFLOW](FRONTEND_WORKFLOW.md).

## Nguồn và cấu trúc

- `lib/public-seo.ts` giữ domain chuẩn, ảnh chia sẻ, các bản tóm tắt SEO riêng cho lớp và helper metadata. Catalog lớp/bài viết sinh danh sách URL cho sitemap. Không lấy domain canonical từ Host hoặc APP_ORIGIN của API.
- Title/description là thông tin cho trình duyệt, kết quả tìm kiếm và bản xem trước liên kết. Chỉnh metadata không thay tiêu đề/đoạn giới thiệu trong giao diện. Description lớp là bản tóm tắt tự biên soạn, không cắt nguyên đoạn giới thiệu dài. E xét đủ năng lực và đạt bài thi riêng, không bắt buộc học xong C.
- Mỗi trang công khai có canonical, Open Graph, locale vi_VN và Twitter summary_large_image. Query chọn lớp không trở thành URL canonical riêng. Root layout chỉ đặt metadataBase, không đặt canonical hoặc index:true toàn ứng dụng.
- Ảnh `public/images/site/csat-share.png` là PNG tĩnh 1200×630, logo CSAT từ SVG đã duyệt trên nền kem #F8F7F2. Không dùng favicon nhỏ làm ảnh chia sẻ và không tải font/runtime để tạo ảnh.
- `lib/public-structured-data.ts` tạo EducationalOrganization/WebSite tại trang chủ, Course A/B/C + ItemList tại tổng quan, Course hoặc WebPage E/K + BreadcrumbList tại chi tiết, BlogPosting tại bài công khai. JSON-LD render server và escape ký tự HTML. Không dựng giá toàn khóa, sao đánh giá, địa chỉ hay ngày xuất bản.

## URL và lập chỉ mục

Sitemap chỉ chứa trang công khai chuẩn, hiện 15 URL. Không chứa alias, query/hash, đăng nhập, nghiệp vụ hoặc 54 bài chuyên đề phụ huynh. Không cập nhật lastmod theo thời điểm build khi nội dung chưa thay đổi.

Alias chuyển 308: nang-cao/advanced → C; custom/tuy-chinh → K; co-ban/basic → tổng quan; hsgqg/voi/prevoi → đăng ký chung. Alias C/K giữ các lựa chọn level/goal/background hợp lệ; bỏ query khác. Không đổi tên lớp quản lý hoặc giáo án C/D vì làm sạch URL công khai.

Trang đăng nhập được crawl để Google đọc noindex. Robots vẫn hạn chế admin/tutor/parents/API; noindex ở metadata và header riêng tư bổ sung cho kiểm tra quyền. Robots/noindex không phải cơ chế bảo vệ dữ liệu. Giữ private/no-store, xác thực và liên kết học sinh–lớp ở luồng phụ huynh.

`/llms.txt` là văn bản công khai dựng tĩnh từ catalog và các tóm tắt đã duyệt. Chỉ dẫn đến nội dung public; không xuất docs nội bộ, API, hồ sơ hoặc bài riêng tư. Đây là quy ước hỗ trợ công cụ AI, không thay sitemap và không hứa tăng thứ hạng tìm kiếm.

## Search Console

Quyết định: URL-prefix riêng `https://portal.csatoj.vn/`, không Domain property toàn csatoj.vn. Người dùng cung cấp phương thức tệp HTML: `public/google8e5ffbef59a10505.html`, nội dung đúng `google-site-verification: google8e5ffbef59a10505.html`. Đây là bằng chứng công khai được phép đưa vào repo. Proxy cho phép đọc đúng tệp, không gọi Auth; không bỏ kiểm tra Auth cho mọi tệp HTML.

Đã kiểm tra HTTP production ngày 15/10/2026: robots, sitemap 15 URL, llms và tệp xác minh trả 200; canonical trang chủ đúng domain. Chủ trung tâm xác nhận Search Console đã kết nối, tự hoàn tất xác minh và gửi sitemap. Chưa kiểm chứng trạng thái crawl/index trong tài khoản Google.

Các bước chủ trung tâm thực hiện:

1. Kiểm tra `https://portal.csatoj.vn/google8e5ffbef59a10505.html` trả 200 với nội dung đúng và không yêu cầu đăng nhập.
2. Trong tài khoản Google của chủ trung tâm, hoàn tất xác minh tệp HTML cho thuộc tính URL-prefix trên. Giữ tệp sau xác minh để Google kiểm tra lại.
3. Gửi `https://portal.csatoj.vn/sitemap.xml` tại Sitemaps.
4. Dùng URL Inspection cho trang chủ, /lo-trinh và /lo-trinh/a; kiểm tra canonical Google chọn, crawl và lập chỉ mục. Ghi nhận trạng thái thực tế, không coi gửi sitemap là đã index.

Nếu chuyển sang phương thức meta tag sau này, helper trang chủ hỗ trợ `GOOGLE_SITE_VERIFICATION`: chỉ dùng giá trị content của thẻ, không dùng dòng nội dung tệp HTML; biến phải có trước build/deploy. Không cần cấu hình biến này cho phương thức tệp đã chọn.

Bản tối ưu 2171653 đã phát hành 15/10/2026; smoke SEO hosted đạt 15 trang/canonical/OG/JSON-LD/H1/alt và các tài nguyên trên. Search Console xác nhận kết nối do chủ trung tâm cung cấp, không phải kết quả agent kiểm tra tài khoản Google.

## Kiểm chứng và phần làm sau

Node.js 24: guard, repo tests (gồm metadata/schema/catalog), database/API tests, typecheck, lint strict và build. Sau build, `node scripts/tests/public-seo.http.cjs` kiểm tra HTML server qua `PUBLIC_QA_BASE_URL` loopback: sitemap, canonical/OG, heading/alt, link/anchor, alias 308, query, 404, noindex riêng tư, JSON-LD, ảnh và tệp xác minh. CI chạy kiểm tra HTTP cùng server công khai đã dựng; không dùng tài khoản hoặc dữ liệu thật.

Theo phạm vi rút gọn đã duyệt, đã chạy QA Edge tập trung và baseline Lighthouse trên production build **local** cho trang chủ, tổng quan, đăng ký và thành tích; xem [kết quả và giới hạn](PUBLIC_PERFORMANCE_QA.md). Chạy lại nhóm liên quan khi thay form, bố cục hoặc component chung; không lặp toàn bộ ma trận hoặc chặn CI bằng điểm Lighthouse mỗi commit. Đối chiếu hosted và dữ liệu thực từ Speed Insights/Search Console còn chờ. Mục tiêu phân vị75: LCP≤2,5s, INP≤200ms, CLS≤0,1; nếu chưa đủ dữ liệu thực thì ghi rõ chờ. Không gọi HTML checks hoặc điểm Lighthouse là Core Web Vitals thực đạt.

Đợt SEO không tự áp migration hoặc xác minh thay chủ sở hữu tài khoản Google. Registry 27 và ứng dụng production đã được kiểm tra chỉ đọc trong đợt chuẩn bị phát hành 15/10/2026; không còn coi 27 là chưa rollout. Trước phát hành tiếp tục kiểm tra tương thích toàn bộ commit với schema thực; kết quả local không thay kiểm chứng hosted.

## Nguồn kỹ thuật

- [Metadata Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [noindex và crawl](https://developers.google.com/search/docs/essentials/technical).
- [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [Course](https://developers.google.com/search/docs/appearance/structured-data/course), [Article](https://developers.google.com/search/docs/appearance/structured-data/article).
- [Xác minh Search Console](https://support.google.com/webmasters/answer/9008080), [Core Web Vitals](https://web.dev/articles/vitals), [đề xuất llms.txt](https://llmstxt.org/).
