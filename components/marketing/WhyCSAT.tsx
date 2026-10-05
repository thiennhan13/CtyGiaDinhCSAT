import { ArrowUpRight } from 'lucide-react';
import { CodeIcon, Reveal } from './PublicMotion';
import { EcosystemIcon } from './EcosystemIcon';
import './why-csat.css';

const branches = [
  { key: 'practice', label: '01', title: 'Kho bài & máy chấm', code: 'practice(problem);', points: [
    ['Chọn bài có hướng.', 'Kho đề chọn lọc theo dạng và cấp độ; gia sư hướng dẫn phần nên luyện.'],
    ['Chấm và chữa bài.', 'Nộp bài trên CSATOJ, nhận kết quả và cùng gia sư nhìn lại lời giải.'],
    ['Cập nhật, cọ xát.', 'Bổ sung bài mới và contest để thử sức với nhiều cách tiếp cận.'],
  ] },
  { key: 'community', label: '02', title: 'Nhóm học nhỏ', code: 'learn.together();', points: [
    ['Nhóm học phù hợp.', 'Trao đổi nền tảng, lứa tuổi và mục tiêu; E tuyển từ C, nhóm 3–4 học sinh.'],
    ['Cùng học, cùng thi đua.', 'Chia sẻ cách giải, gỡ bài khó và hướng tới các kỳ thi Tin học thường niên.'],
    ['Giữ nhịp học.', 'Chuẩn bị trước buổi học, tự luyện và xác định phần cần củng cố.'],
  ] },
  { key: 'mentors', label: '03', title: 'Gia sư chuyên Phan', code: 'discuss(solution);', points: [
    ['Kinh nghiệm học và thi.', 'Cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu chia sẻ từ hành trình của mình.'],
    ['Hiểu cách giải.', 'Cùng phân tích ý tưởng, kiểm tra tính đúng và thử hướng khác.'],
    ['Gần gũi, dễ trao đổi.', 'Mạnh dạn hỏi, trình bày ý tưởng và bảo vệ lời giải bằng lập luận.'],
  ] },
  { key: 'parents', label: '04', title: 'Đồng hành sát sao', code: 'connect.parent(tutor);', points: [
    ['Kết nối trực tiếp.', 'Phụ huynh trao đổi cùng gia sư để hiểu việc học và những phần con cần hỗ trợ.'],
    ['Nhìn lại kết quả.', 'Cùng gia sư trao đổi bài đã làm, số bài và điểm thi trên CSATOJ; theo dõi nội dung học trên Portal.'],
    ['Nhận xét và định hướng.', 'Nhận xét hằng tháng đi cùng tư vấn lộ trình, giúp gia đình cùng con xác định bước tiếp theo.'],
  ] },
] as const;

export function WhyCSAT() {
  return <section className="home-why section" id="csatoj" aria-label="Hệ sinh thái CSAT">
    <div className="why-background" aria-hidden="true"><i /><i /><i /></div>
    <div className="wrap">
      <div className="why-tree">
        <Reveal variant="rise" className="why-root">
          <div className="why-terminal-bar" aria-hidden="true"><span><i /><i /><i /></span><small>CSAT / LEARNING SYSTEM</small><CodeIcon name="terminal" /></div>
          <div className="why-root-body"><span className="why-root-symbol" aria-hidden="true"><CodeIcon name="terminal" /></span><div><strong>CSAT TUTOR</strong><span className="why-root-code" aria-hidden="true"><b>learn</b>(); <b>practise</b>(); <b>grow</b>();</span></div></div>
          <span className="why-root-port" aria-hidden="true" /><span className="why-root-port port-bottom" aria-hidden="true" />
        </Reveal>
        <div className="why-wires" aria-hidden="true"><svg viewBox="0 0 1200 260" preserveAspectRatio="none">
          <path className="why-wire-practice" d="M600 112H366L300 46V0" /><path className="why-wire-community" d="M600 112H850L900 62V24" />
          <path className="why-wire-mentors" d="M600 148H366L300 214V260" /><path className="why-wire-parents" d="M600 148H850L900 198V284" />
          <path className="why-wire-trace" d="M300 0V70L360 130H440M900 24V86L856 130H760M300 260V190L340 150H440M900 284V222L848 170H760" />
          <rect className="why-wire-junction" x="295" y="-4" width="10" height="10" /><rect className="why-wire-junction" x="895" y="20" width="10" height="10" /><rect className="why-wire-junction" x="295" y="254" width="10" height="10" /><rect className="why-wire-junction" x="895" y="278" width="10" height="10" />
          <path className="why-wire-chip" d="M333 76h16v12h-16zM854 98h12v12h-12zM335 178h12v12h-12zM852 212h16v12h-16z" />
        </svg></div>
        <div className="why-branches">{branches.map(branch => <Reveal key={branch.key} variant="rise" className={`why-branch why-${branch.key}`}>
          <div className="why-branch-terminal" aria-hidden="true"><span>CSAT::{branch.key}</span><span>{'{ }'}</span></div>
          <div className="why-branch-heading"><span className="why-branch-icon" aria-hidden="true"><EcosystemIcon kind={branch.key} /><i /></span><div><span className="why-branch-number" aria-hidden="true">{branch.label} /</span><h3>{branch.title}</h3></div></div>
          <ul>{branch.points.map(([lead, text]) => <li key={lead}><strong>{lead}</strong> {text}</li>)}</ul>
          {branch.key === 'practice' && <a className="btn secondary why-practice-link" href="https://csatoj.vn/" target="_blank" rel="noopener noreferrer">Trải nghiệm ngay <ArrowUpRight aria-hidden="true" /><span className="sr-only"> trên CSATOJ (mở tab mới)</span></a>}
          <div className="why-branch-code" aria-hidden="true"><span>↳</span>{branch.code}</div>
          <span className="why-branch-watermark" aria-hidden="true"><EcosystemIcon kind={branch.key} /></span>
        </Reveal>)}</div>
      </div>
    </div>
  </section>;
}
