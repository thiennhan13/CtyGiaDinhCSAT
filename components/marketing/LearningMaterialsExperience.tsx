'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { CodeIcon, Reveal } from './PublicMotion';
import { PublicConsultation } from './PublicConsultation';
import { PracticeVideo } from './PracticeVideo';
import './home-experience.css';
import './learning-materials.css';

function OJPractice() {
  const [active, setActive] = useState(0);
  const items = [
    ['search', 'Chọn bài', 'Đọc yêu cầu, dữ liệu vào và giới hạn của bài toán. Xác định điều cần tìm trước khi bắt đầu.'],
    ['terminal', 'Viết lời giải', 'Từ ý tưởng đến chương trình C++: thử ví dụ, viết mã và tự kiểm tra những trường hợp khác nhau.'],
    ['loop', 'Nhận kết quả', 'Nộp bài để hệ thống chấm, đối chiếu kết quả và xem lại cách làm. Cùng gia sư tìm chỗ còn vướng để luyện tiếp.'],
  ];
  return <div className="oj-practice">
    <div className="oj-tabs" aria-label="Các bước luyện bài trên CSATOJ">{items.map(([, title], i) =>
      <button key={title} type="button" aria-pressed={active === i} aria-controls={`oj-practice-${i}`} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)}>0{i + 1}<span>{title}</span></button>
    )}</div>
    {items.map(([icon, title, text], i) => <div className="oj-practice-panel" id={`oj-practice-${i}`} key={title} hidden={active !== i}>
      <CodeIcon name={icon} /><h3>{title}</h3><p>{text}</p>
    </div>)}
  </div>;
}

export function LearningMaterialsExperience() {
  return <div className="home-page materials-page">
    <noscript><style>{'.csat-public .materials-page .oj-practice-panel[hidden]{display:block!important}.csat-public .materials-page .oj-tabs{display:none}'}</style></noscript>
    <section className="home-oj section" aria-labelledby="materials-title">
      <div className="wrap oj-layout">
        <Reveal className="oj-story" variant="left">
          <div className="oj-brand-lockup"><Image src="/icon/csatoj-logo-compact.svg" width={180} height={65} alt="CSATOJ" /><p className="eyebrow">Không gian luyện tập</p></div>
          <h1 id="materials-title">Học liệu<br /><span>miễn phí.</span></h1>
          <p className="oj-intro">Học một điều mới, thử ngay một bài. Cùng CSAT tìm tài liệu phù hợp với nền tảng của bạn và khám phá cách luyện tập trên máy chấm CSATOJ.</p>
          <OJPractice />
          <a className="text-link" href="https://csatoj.vn" target="_blank" rel="noopener noreferrer">Khám phá CSATOJ <ArrowUpRight /></a>
          <PracticeVideo />
        </Reveal>
        <Reveal variant="right" className="materials-card" id="nhan-tai-lieu">
          <div className="materials-top"><span className="materials-icon"><BookOpen aria-hidden="true" /></span><span className="mono">BẮT ĐẦU TỪ ĐIỀU BẠN MUỐN HỌC</span></div>
          <h2>Nhận tài liệu học<br /><span>cùng CSAT.</span></h2>
          <p>Chọn nội dung bạn quan tâm, kiểm tra thông tin rồi chủ động nhắn CSAT qua Zalo hoặc Facebook để trao đổi cách nhận tài liệu.</p>
          <PublicConsultation kind="materials" />
          <p className="materials-note">Không tạo tài khoản CSATOJ. Tài liệu và cách nhận sẽ được đội ngũ gia sư trao đổi trực tiếp cùng phụ huynh &lt;3</p>
        </Reveal>
      </div>
    </section>
  </div>;
}
