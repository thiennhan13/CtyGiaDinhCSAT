'use client';

import { useSearchParams } from 'next/navigation';
import { BookOpen, MessageCircle, Route, Users } from 'lucide-react';
import { CsatBackground } from '@/components/CsatBackground';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { CodeIcon } from '@/components/marketing/PublicMotion';
import { ParentLoginForm } from './ParentLoginForm';
import { TutorLoginForm } from './TutorLoginForm';
import './contact-entry.css';

type EntryRole = 'parent' | 'tutor';
export function ContactEntry({ initialRole = 'parent' }: { initialRole?: EntryRole }) {
  const search = useSearchParams();
  const role: EntryRole = search ? (search.get('role') === 'tutor' ? 'tutor' : 'parent') : initialRole;
  function select(next: EntryRole) {
    window.history.replaceState(null, '', next === 'tutor' ? '/login?role=tutor' : '/login');
  }
  return <div className="contact-entry-page relative min-h-screen">
    <CsatBackground />
    <PublicHeader />
    <main id="noi-dung" className="contact-entry-main" tabIndex={-1}>
      <section className="contact-entry-copy" aria-labelledby="contact-title">
        <p className="contact-eyebrow">CSAT PORTAL / TRANG LIÊN LẠC</p>
        <h1 id="contact-title">CÙNG HIỂU.<br/><span>CÙNG ĐỒNG HÀNH.</span></h1>
        <p>Một nơi để phụ huynh theo dõi việc học của con, gia sư cập nhật buổi học và trung tâm cùng đồng hành.</p>
        <div className="contact-entry-art" aria-hidden="true"><CodeIcon name="brackets"/><span><BookOpen/>Buổi học</span><span><MessageCircle/>Nhận xét</span><span><Route/>Lộ trình</span></div>
      </section>
      <section className="contact-entry-card" aria-label="Chọn kênh đăng nhập">
        <div className="contact-card-mark" aria-hidden="true"><Users/></div>
        <h2>TRANG LIÊN LẠC</h2>
        <fieldset className="contact-role-switch">
          <legend className="sr-only">Bạn đăng nhập với vai trò nào?</legend>
          {(['parent', 'tutor'] as const).map(value => <label key={value} className={role === value ? 'is-selected' : ''}>
            <input type="radio" name="entry-role" value={value} checked={role === value} onChange={() => select(value)} aria-controls={`entry-${value}`}/>
            <span>{value === 'parent' ? 'Phụ huynh' : 'Gia sư / Admin'}</span>
          </label>)}
        </fieldset>
        <div className="contact-entry-forms">
          <div id="entry-parent" hidden={role !== 'parent'}><p className="contact-form-intro">Theo dõi nhận xét, nội dung học và học phí của con.</p><ParentLoginForm/></div>
          <div id="entry-tutor" hidden={role !== 'tutor'}><p className="contact-form-intro">Dành cho gia sư và quản trị viên của trung tâm.</p><TutorLoginForm/></div>
        </div>
        <p className="contact-entry-help">Cần hỗ trợ? <a href="https://zalo.me/0916246867" target="_blank" rel="noopener noreferrer">Nhắn CSAT qua Zalo ↗</a></p>
        <noscript><style>{'.contact-entry-forms,.contact-role-switch{display:none!important}'}</style><p>Vui lòng bật JavaScript để đăng nhập, hoặc liên hệ CSAT để được hỗ trợ.</p></noscript>
      </section>
    </main>
  </div>;
}
