import Link from 'next/link';
import Image from 'next/image';
import { PublicNavigation } from './PublicNavigation';
import { PublicFeedback } from './PublicFeedback';
import './public-design.css';
export function PublicShell({ children }: {
    children: React.ReactNode;
}) {
    return <div className="csat-public"><PublicFeedback /><a className="skip-link" href="#noi-dung">Đến nội dung chính</a><div className="site-bg" aria-hidden="true"><div className="bg-blob"/><div className="bg-blob second"/><Image className="bg-word bg-kvant" src="/icon/csat-watermark.svg" alt="" width={1103} height={344} /></div><PublicNavigation /><main id="noi-dung" tabIndex={-1}>{children}</main>
    <noscript><style>{'.csat-public .nav-links{display:flex;position:static;flex-wrap:wrap;flex-direction:row;max-height:none}.csat-public .navbar{flex-wrap:wrap}.csat-public .nav-links{flex-basis:100%}.csat-public .menu-button,.csat-public .contact-dock{display:none}'}</style></noscript>
    <footer className="site-footer"><div className="wrap"><div className="footer-top"><div className="footer-copy"><Link href="/" className="brand"><Image src="/icon/csat-logo-compact.svg" alt="CSAT" width={91} height={40}/></Link><p>Lập trình thi đấu &amp; Tư duy thuật toán. Cùng gia sư chuyên Phan, học để hiểu và luyện để tự mình tìm lời giải.</p></div><div className="footer-nav"><div><strong>Tìm hiểu CSAT</strong><Link href="/lo-trinh">Lộ trình học tập</Link><Link href="/gia-su">Đội ngũ gia sư</Link><Link href="/bai-dang">Góc học Tin</Link><Link href="/#khoa-hoc">Các khóa học</Link><Link href="/#buoi-hoc">Một buổi học</Link></div><div><strong>Cùng đồng hành</strong><Link href="/login">Kênh phụ huynh</Link><Link href="/tutor">Kênh gia sư</Link><Link href="/lo-trinh#tu-van">Tư vấn học tập</Link></div></div></div><div className="footer-bottom"><span>CSAT TUTOR · Lập trình thi đấu &amp; Tư duy thuật toán</span><a href="https://csatoj.vn/awards/" target="_blank" rel="noopener noreferrer">Thành tích trên CSATOJ ↗</a></div></div></footer></div>;
}
