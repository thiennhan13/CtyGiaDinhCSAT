# Cổng học tập — tham chiếu migration 11–15

Gói `upgrade-learning-portal.sql` tổng hợp migration 11–15, phụ thuộc nền 10. Chỉ dùng cho trạng thái phù hợp đã được kiểm tra; không chạy cả gói và từng migration riêng, không chạy lại trên môi trường đã có.

Nguồn hiện hành:

- [Database README](README.md): baseline, chuỗi đến 27 và verification.
- [Kiến trúc](../docs/ARCHITECTURE.md): phiên/quyền, read model, nháp/công bố và lịch sử.
- [Chuyên đề phụ huynh](../docs/PARENT_TOPICS.md): thư viện và chặng lớp.
- [Tra cứu số điện thoại](../docs/PARENT_PHONE_ACCESS.md): cơ chế truy cập hiện hành.
- [Email và CSATOJ](../docs/FUTURE_INTEGRATIONS.md): hợp đồng/điều kiện bật.
- [Setup](../docs/SETUP_VERCEL_SUPABASE.md), [tiến độ](../docs/PROJECT_STATUS.md): cấu hình và nghiệm thu.

Nhận xét tháng và kỳ học phí độc lập; cron không tự công bố/chốt sổ. Giữ lịch sử nhận xét, snapshot và các kỳ kế toán. Log kiểm thử từng đợt tra trong Git/kho nội bộ, không dùng làm chứng nhận deployment hiện tại.
