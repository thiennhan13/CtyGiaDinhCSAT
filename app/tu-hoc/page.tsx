import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Braces } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { KnowledgeMap } from '@/components/marketing/KnowledgeMap';
import { knowledgeStages } from '@/lib/knowledge-map';
import { publicPageMetadata } from '@/lib/public-seo';
import '@/components/marketing/knowledge-map.css';

export const metadata: Metadata = publicPageMetadata({
  path: '/tu-hoc',
  title: 'Tự học C++ và thuật toán — CSAT',
  description: 'Tìm hướng tự học qua 43 chủ đề C++ và thuật toán. Xem nền tảng liên quan, cách tiếp cận và bài luyện CSATOJ từ nhập môn đến quy hoạch động.',
});

export default function KnowledgeMapPage() {
  return <PublicShell><div className="knowledge-page wrap">
    <header className="km-hero">
      <div>
        <p className="km-eyebrow"><Braces size={20} aria-hidden="true" /> CSAT / KHÔNG GIAN TỰ HỌC</p>
        <h1>Tự học<br /><span>cùng CSAT.</span></h1>
        <p className="km-intro">Hiểu mình đang học gì.<br />Tìm điều muốn khám phá tiếp.</p>
        <p className="km-lead">Từ dòng C++ đầu tiên đến cách xây dựng một lời giải thuật toán. Chọn một chủ đề để xem nền tảng liên quan, hướng học và bài luyện tập.</p>
        <a className="km-primary" href="#kham-pha">Khám phá bản đồ <ArrowDown size={18} aria-hidden="true" /></a>
      </div>
      <div className="km-route" aria-label="Ba phần kiến thức">
        <p className="km-route-label">MỖI KIẾN THỨC MỞ MỘT HƯỚNG ĐI</p>
        <a href="#nhom-A"><b>A</b><span><strong>Viết được ý tưởng</strong><small>C++ · Mảng · Hàm · Xâu</small></span><span className="km-count">09</span></a>
        <span className="km-route-connector" aria-hidden="true">↓</span>
        <a href="#nhom-B"><b>B</b><span><strong>Chọn cách giải</strong><small>Số học · Sắp xếp · Tìm kiếm</small></span><span className="km-count">15</span></a>
        <span className="km-route-connector" aria-hidden="true">↓</span>
        <a href="#nhom-C"><b>C</b><span><strong>Đào sâu lập luận</strong><small>Cấu trúc dữ liệu · Chiến lược · QHĐ</small></span><span className="km-count">19</span></a>
        <p className="km-route-note">43 chủ đề · 13 chặng kiến thức<br />Phần C gồm cả các mã D01–D07.</p>
      </div>
    </header>
    <section className="km-method" aria-labelledby="cach-tu-hoc">
      <h2 id="cach-tu-hoc">Một vòng tự học</h2>
      <ol><li><b>01 / Hiểu</b><span>Đọc mục tiêu, ôn nền tảng còn thiếu.</span></li><li><b>02 / Thử</b><span>Tự phân tích, viết mã và luyện bài.</span></li><li><b>03 / Nhìn lại</b><span>Giải thích vì sao đúng, thử dữ liệu biên.</span></li></ol>
    </section>
    <KnowledgeMap stages={knowledgeStages} />
    <section className="km-end" aria-labelledby="km-next">
      <div><p className="km-eyebrow">HỌC THEO NHỊP CỦA BẠN</p><h2 id="km-next">Một bản đồ, nhiều cách đi.</h2><p>Các liên kết kiến thức gợi ý phần nên ôn và hướng có thể tìm hiểu tiếp. Bạn có thể quay lại bất cứ lúc nào; số bài đã làm không tự xác nhận mức độ thành thạo.</p></div>
      <Link href="/lo-trinh" className="km-secondary">Tìm hiểu các lớp CSAT <ArrowUpRight size={18} aria-hidden="true" /></Link>
    </section>
  </div></PublicShell>;
}
