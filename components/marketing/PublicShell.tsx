import Link from 'next/link';
import Image from 'next/image';
import { Mail, MessageCircle } from 'lucide-react';
import { publicContactChannels, publicContactEmail } from '@/lib/public-contact';
import { PublicNavigation } from './PublicNavigation';
import { PublicFeedback } from './PublicFeedback';
import { PublicSectionNavigation } from './PublicSectionNavigation';
import './public-design.css';
import './course-e-theme.css';
export function PublicShell({ children }: {
    children: React.ReactNode;
}) {
    return <div className="csat-public"><PublicFeedback /><a className="skip-link" href="#noi-dung">Đến nội dung chính</a><div className="site-bg" aria-hidden="true"><div className="bg-blob"/><div className="bg-blob second"/><Image className="bg-word bg-kvant" src="/icon/csat-watermark.svg" alt="" width={1103} height={344} /></div><PublicNavigation /><main id="noi-dung" tabIndex={-1}>{children}</main><PublicSectionNavigation />
    <noscript><style>{'.csat-public .nav-links{display:flex;position:static;flex-wrap:wrap;flex-direction:row;max-height:none}.csat-public .navbar{flex-wrap:wrap}.csat-public .nav-links{flex-basis:100%}.csat-public .menu-button,.csat-public .contact-dock{display:none}'}</style></noscript>
    <footer className="site-footer"><div className="wrap">
      <div className="footer-top">
        <div className="footer-copy"><Link href="/" className="brand"><Image src="/icon/csat-logo-compact.svg" alt="CSAT" width={91} height={40}/></Link><p>Gia sư chuyên Phan, cùng học sinh học lập trình thi đấu và tư duy thuật toán.</p></div>
        <div className="footer-nav"><div><strong>Tìm hiểu CSAT</strong><Link href="/lo-trinh">Lộ trình học tập</Link><Link href="/dang-ky-hoc">Đăng ký học</Link><Link href="/gia-su">Đội ngũ gia sư</Link><Link href="/bai-dang">Góc học Tin</Link><Link href="/hoc-lieu-mien-phi">Học liệu miễn phí</Link><Link href="/#khoa-hoc">Các khóa học</Link><Link href="/#buoi-hoc">Một buổi học</Link></div><div><strong>Cùng đồng hành</strong><Link href="/login">Kênh phụ huynh</Link><Link href="/login?role=tutor">Kênh gia sư</Link><Link href="/lo-trinh#tu-van">Tư vấn học tập</Link></div></div>
        <address className="footer-contact" aria-label="Liên hệ CSAT Tutor"><strong>Liên hệ CSAT Tutor</strong><a href={`mailto:${publicContactEmail}`}><Mail size={17} aria-hidden="true" />{publicContactEmail}</a>{publicContactChannels.filter(channel => channel.name === 'Zalo').map(channel => <a key={channel.name} href={channel.url} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" />Zalo: {channel.label}</a>)}<div className="footer-socials">{publicContactChannels.filter(channel => channel.name !== 'Zalo').map(channel => <a key={channel.name} href={channel.url} target="_blank" rel="noopener noreferrer">{channel.name}</a>)}</div></address>
      </div>
      <div className="footer-bottom"><span>CSAT TUTOR · Lập trình thi đấu &amp; Tư duy thuật toán</span><Link href="/thanh-tich">Thành tích CSAT</Link></div>
    </div></footer></div>;
}
