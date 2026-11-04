'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OJSummary, OJParticipation, OJClassResults, OJActivity } from '@/lib/oj-grants';
import { SubmissionHeatmap } from './SubmissionHeatmap';
import styles from './parent-oj.module.css';
type Envelope<T> = { connected: boolean; as_of?: string; data?: T; no_contests?: boolean };
type Page = { items: OJParticipation[]; next_cursor: string | null };
type Organizations = { items: { organization_id: number; name: string }[]; next_cursor: string | null };
const value = (n: number | null | undefined) => n == null ? 'Chưa có dữ liệu' : new Intl.NumberFormat('vi-VN').format(n);
const rank = (n: number | null, total: number | null) => n === null ? 'Chưa có hạng' : total === null ? `Hạng ${value(n)}` : `${value(n)} / ${value(total)}`;
const labels: Record<string, string> = { available: 'Đã công bố', frozen: 'Bảng điểm tạm thời, đang đóng băng', withheld: 'Kết quả chưa được công bố', limited: 'Dữ liệu chưa đầy đủ', not_participated: 'Chưa tham gia', disqualified: 'Không được xếp hạng', completed: 'Đã kết thúc', registered: 'Đã đăng ký', not_started: 'Chưa bắt đầu', in_progress: 'Đang tham gia', live: 'Thi chính thức', virtual: 'Thi thử (ảo)', spectate: 'Theo dõi' };
export function ContestRows({ items }: { items: OJParticipation[] }) {
  return <div className="space-y-3">{items.map((item, i) => <article key={item.contest.contest_id + ':' + (item.participation?.participation_id ?? i)} className={styles.result}>
    <h4>{item.contest.name}</h4><p className={styles.hint}>{[labels[item.status] || 'Chưa rõ trạng thái', item.participation && labels[item.participation.mode], item.participation && labels[item.participation.state]].filter(Boolean).join(' · ')}</p>
    {item.metrics && <><dl><div><dt>Điểm bài thi</dt><dd>{value(item.metrics.score)}</dd></div><div><dt>Bài giải đúng / bài đã làm thử</dt><dd>{item.metrics.solved_count === null && item.metrics.attempted_count === null ? item.status === 'frozen' ? 'Chưa công bố' : 'Chưa có dữ liệu' : `${value(item.metrics.solved_count)} / ${value(item.metrics.attempted_count)}`}</dd></div>
      <div><dt>Xếp hạng trong lớp</dt><dd>{item.metrics.rank_scope === 'unranked_virtual' ? 'Không xếp hạng thi chính thức' : rank(item.metrics.class_rank, item.metrics.class_participants)}</dd></div>
      <div><dt>Xếp hạng toàn cuộc thi</dt><dd>{item.metrics.rank_scope === 'unranked_virtual' ? 'Không xếp hạng thi chính thức' : rank(item.metrics.contest_rank, item.metrics.contest_participants)}</dd></div></dl>
      <p className={styles.hint}>{item.metrics.rank_scope === 'unranked_virtual' ? 'Thi thử có điểm riêng, không so vào bảng xếp hạng chính thức.' : 'Hạng gắn với cuộc thi này; số đứng sau dấu / là số bạn thi chính thức được tính hạng trong nhóm tương ứng.'}</p>
    </>}
  </article>)}{!items.length && <p>Chưa có lượt tham gia trong danh sách này.</p>}</div>;
}
export function ParentOJPanel({ studentId, month: _month, sessions = [], staff = false }: { studentId: string; month?: string; sessions?: { session_id: string; date: string; class_name?: string }[]; staff?: boolean }) {
  const root = useRef<HTMLElement>(null), controller = useRef<AbortController | null>(null), cooldown = useRef(0);
  const [summary, setSummary] = useState<Envelope<OJSummary> | null>(null), [contests, setContests] = useState<Page | null>(null), [organizations, setOrganizations] = useState<Organizations | null>(null), [results, setResults] = useState<OJClassResults | null>(null);
  const [activity, setActivity] = useState<OJActivity | null>(null), [activityYear, setActivityYear] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [session, setSession] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async (kind = 'summary', cursor?: string, sessionId?: string, year?: string) => {
    if (Date.now() < cooldown.current) { setError('CSATOJ đang giới hạn tần suất. Vui lòng thử lại sau.'); return; }
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setNotice('');
    try {
      const query = new URLSearchParams({ student: studentId, kind, ...(cursor ? { cursor } : {}), ...(sessionId ? { session: sessionId } : {}), ...(year ? { year } : {}) });
      const res = await fetch((staff ? '/api/oj/accounts?' : '/api/parents/oj?') + query, { cache: 'no-store', signal: abort.signal });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) cooldown.current = Date.now() + Number(res.headers.get('Retry-After') || 60) * 1000;
        if ([401, 403, 409].includes(res.status) || ['account_unavailable', 'grant_revoked', 'grant_revision_mismatch'].includes(data.code)) { setSummary(null); setContests(null); setOrganizations(null); setResults(null); setActivity(null); }
        throw new Error(data.error || 'Chưa tải được dữ liệu CSATOJ.');
      }
      if (!data.connected) { setSummary(data); setContests(null); setOrganizations(null); setResults(null); setActivity(null); setActivityYear(''); return; }
      if (kind === 'summary') { setSummary(data); setActivity(data.data?.activity ?? null); setActivityYear(''); }
      else if (kind === 'activity') { setActivity(data.data?.activity ?? null); setActivityYear(year || ''); }
      else if (kind === 'contests') setContests(data.data);
      else if (kind === 'organizations') setOrganizations(data.data);
      else { setResults(data.data || null); if (data.no_contests) setNotice('Buổi học chưa được gắn cuộc thi trên CSATOJ.'); }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa kết nối được CSATOJ.'); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }, [studentId, staff]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && document.visibilityState === 'visible') { observer.disconnect(); void load(); } });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); controller.current?.abort(); };
  }, [load]);
  const data = summary?.data;
  return <section ref={root} id={staff ? undefined : 'oj'} className="parent-card space-y-6"><div className={styles.header}><div><h2 className="parent-section-title parent-section-title--blue text-2xl font-bold">Kết quả CSATOJ</h2><p className={styles.intro}>Theo dõi việc làm bài và thi đấu của con, đọc cùng nhận xét của gia sư.</p></div><button type="button" className={styles.action} disabled={busy} onClick={() => load()}>Làm mới</button></div>
    {busy && <p role="status">Đang tải dữ liệu CSATOJ…</p>}{error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    {summary?.connected === false && <p>Học sinh chưa có liên kết CSATOJ đang hoạt động. Vui lòng liên hệ CSAT.</p>}
    {data && <><div><h3 className="text-lg font-bold">Tài khoản · {data.account.username}</h3><p className={styles.hint}>Cập nhật: {summary?.as_of ? new Date(summary.as_of).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có'}. Số liệu tích lũy trong phạm vi CSATOJ cho phép xem.</p></div>
      <dl className={styles.metrics}>{[
        ['Bài đã làm thử', data.learning.learning_total.attempted_count, 'Số bài khác nhau con đã nộp, gồm cả bài đã giải đúng.'],
        ['Bài giải đúng', data.learning.learning_total.solved_count, 'Bài đã được chấm đúng hoàn toàn. Mỗi bài chỉ tính một lần.'],
        ['Lượt nộp', data.learning.learning_total.submission_count, 'Một bài có thể nộp nhiều lần; lượt nộp khác với số bài.'],
      ].map(([label, n, hint]) => <div key={String(label)} className={styles.metric}><dt>{label}</dt><dd>{value(n as number | null)}</dd><p>{hint}</p></div>)}</dl>
      {data.learning.learning_total.status === 'limited' && <p role="status">Số liệu chưa đầy đủ: một phần kết quả cuộc thi đang ẩn hoặc chưa được công bố.</p>}
      <SubmissionHeatmap key={activity?.start_date + ':' + activity?.end_date} activity={activity} year={activityYear} busy={busy} onYearChange={year => void load('activity', undefined, undefined, year)}/>
      {sessions.length > 0 && <section className="space-y-3"><h3 className={styles.subheading}>Kết quả và xếp hạng theo buổi</h3><p className={styles.hint}>So sánh trong cùng cuộc thi: hạng trong lớp và hạng toàn cuộc thi là hai phạm vi khác nhau.</p><label className="block text-sm">Buổi học<select aria-label="Buổi học" className="mt-2 block min-h-11 w-full rounded-lg border bg-background p-2" value={session} onChange={e => { setSession(e.target.value); setResults(null); }}><option value="">Chọn buổi</option>{sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.date} · {s.class_name || 'Buổi học'}</option>)}</select></label><button className={styles.action} disabled={busy || !session} onClick={() => load('session', undefined, session)}>Xem kết quả buổi</button>
        {results && <><p>{labels[results.totals.status || 'available'] || 'Dữ liệu chưa đầy đủ'} · {value(results.totals.solved_count)} bài giải đúng / {value(results.totals.attempted_count)} bài đã làm thử</p>{!results.roster_complete && <p>Chưa đủ liên kết học sinh của buổi này để tính hạng trong lớp. Hạng toàn cuộc thi vẫn hiển thị nếu được công bố.</p>}<ContestRows items={results.contests}/></>}
      </section>}
      <div className={styles.actions}><button className={styles.action} disabled={busy} onClick={() => load('contests')}>Lịch sử cuộc thi</button></div>
      {contests && <section className="space-y-3"><h3 className={styles.subheading}>Các lượt tham gia cuộc thi</h3><ContestRows items={contests.items}/>{contests.next_cursor && <button className={styles.action} disabled={busy} onClick={() => load('contests', contests.next_cursor!)}>Xem thêm lượt tham gia</button>}</section>}
      <details className={styles.competition}><summary>Chi tiết thi đấu</summary><dl>
        <div><dt>Điểm thi đấu (rating)</dt><dd>{data.site.rating === null ? 'Chưa có điểm thi đấu' : value(data.site.rating)}</dd><p>Chỉ số được cập nhật qua các cuộc thi có tính rating; đây là điểm, không phải thứ hạng.</p></div>
        <div><dt>Xếp hạng theo điểm thi đấu</dt><dd>{data.site.rank_status === 'unlisted' ? 'Không tham gia bảng xếp hạng' : data.site.rating_rank === null ? 'Chưa được xếp hạng' : `Hạng ${value(data.site.rating_rank)}`}</dd><p>Vị trí trên CSATOJ khi so điểm rating với các tài khoản được xếp hạng. Số hạng nhỏ hơn nghĩa là vị trí cao hơn.</p></div>
      </dl><p>Đã tham gia {value(data.counts.live_contests)} cuộc thi chính thức · {value(data.counts.virtual_participations)} lượt thi thử (ảo).</p>
        <button className={styles.action} disabled={busy} onClick={() => load('organizations')}>Xem tổ chức đang tham gia</button>
        {organizations && <section className="my-3 space-y-3"><h3 className="font-bold">Tổ chức trên CSATOJ</h3><ul className="list-disc pl-5">{organizations.items.map(o => <li key={o.organization_id}>{o.name}</li>)}</ul>{organizations.next_cursor && <button className={styles.action} disabled={busy} onClick={() => load('organizations', organizations.next_cursor!)}>Xem thêm tổ chức</button>}</section>}
      </details>
    </>}
  </section>;
}
