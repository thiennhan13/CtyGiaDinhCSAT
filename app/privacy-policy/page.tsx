import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { publicZaloUrl } from '@/lib/public-contact';
import { privacyPolicy } from '@/lib/public-privacy';
import { publicPageMetadata } from '@/lib/public-seo';
import styles from './privacy.module.css';

export const metadata: Metadata = publicPageMetadata({
  path: '/privacy-policy',
  title: `${privacyPolicy.title} — CSAT Tutor`,
  description: privacyPolicy.introduction,
});

export default function PrivacyPolicyPage() {
  return <PublicShell>
    <div className={`wrap ${styles.page}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Về trang chủ CSAT</Link>
        <h1>{privacyPolicy.title}</h1>
        <p className={styles.introduction}>{privacyPolicy.introduction}</p>
        <p className={styles.updated}>Cập nhật ngày <time dateTime="2026-11-04">{privacyPolicy.updatedAt}</time></p>
      </header>
      <div className={styles.layout}>
        <nav className={styles.contents} aria-label="Mục lục chính sách">
          <h2>Trong chính sách này</h2>
          <ol>{privacyPolicy.sections.map(section => <li key={section.id}>
            <a href={`#${section.id}`}>{section.title}</a>
          </li>)}</ol>
          <a className={styles.contactLink} href="#contact">Liên hệ về dữ liệu</a>
        </nav>
        <article className={styles.article} aria-label="Nội dung chính sách quyền riêng tư">
          {privacyPolicy.sections.map((section, index) => <section id={section.id} key={section.id} className={styles.section} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            {section.id === 'recipients' && <p><a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Đọc chính sách quyền riêng tư của Meta (mở tab mới)</a></p>}
          </section>)}
          <section id="contact" className={styles.contact} aria-labelledby="contact-heading">
            <h2 id="contact-heading">Liên hệ về dữ liệu</h2>
            <p>Gửi yêu cầu trực tiếp đến CSAT Tutor qua email hoặc Zalo.</p>
            <div className={styles.actions}>
              <a href={`mailto:${privacyPolicy.email}`}>{privacyPolicy.email}</a>
              <a href={publicZaloUrl} target="_blank" rel="noopener noreferrer">Zalo: 0917 791 599 <span className={styles.srOnly}>(mở tab mới)</span></a>
            </div>
          </section>
        </article>
      </div>
    </div>
  </PublicShell>;
}
