import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import './marketing.css';
export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="csat-public"><a className="public-skip" href="#noi-dung">Đến nội dung chính</a><CsatNavbar variant="guest" /><main id="noi-dung">{children}</main>
    <footer className="public-footer public-wrap"><div><Link href="/" className="public-wordmark">CSAT<span> / TUTOR</span></Link><p>C++ · Thuật toán · Lập trình thi đấu</p></div>
      <div className="public-footer-links"><Link href="/lo-trinh">Lộ trình học tập</Link><Link href="/lo-trinh#tu-van">Tư vấn học tập</Link><Link href="/login">Cổng phụ huynh</Link><Link href="/tutor">Cổng gia sư</Link></div>
      <div className="public-footer-links"><a href="https://csatoj.vn" target="_blank" rel="noopener noreferrer">CSATOJ <ArrowUpRight size={16} /></a><a href="https://csatoj.vn/awards/" target="_blank" rel="noopener noreferrer">Vinh danh</a><a href="https://csatoj.vn/users/" target="_blank" rel="noopener noreferrer">Bảng xếp hạng</a><a href="https://facebook.com/csat.tutor" target="_blank" rel="noopener noreferrer">Facebook CSAT Tutor</a></div>
    </footer></div>;
}
export function ConsultationCTA() {
  return <section className="public-wrap public-section"><div className="public-cta"><div><p className="public-kicker">Bắt đầu từ chính bạn</p><h2>Mục tiêu của bạn.<br />Lộ trình cùng CSAT.</h2><p>Chia sẻ cấp học, điều đã học và mục tiêu sắp tới. CSAT sẽ cùng bạn tìm hướng học phù hợp.</p></div><Link className="public-button" href="/lo-trinh#tu-van">Trao đổi cùng CSAT <ArrowUpRight size={20} /></Link></div></section>;
}
