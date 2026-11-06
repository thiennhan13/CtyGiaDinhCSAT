'use client';
import { LoadingSpinner, LoadingStatus } from '@/components/ui/LoadingStatus';
import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { OJSummary, OJParticipation, OJClassResults, OJActivity } from '@/lib/oj-grants';
import { SubmissionHeatmap, ActivityPeriodSelect } from './SubmissionHeatmap';
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
    </>}
  </article>)}{!items.length && <p>Chưa có lượt tham gia trong danh sách này.</p>}</div>;
}
type PanelProps = { studentId: string; month?: string; sessions?: { session_id: string; date: string; class_name?: string }[]; staff?: boolean };
type Kind = 'summary' | 'activity' | 'contests' | 'session' | 'organizations';
type RequestArgs = [kind?: Kind, cursor?: string, sessionId?: string, year?: string];
type Failure = { message: string; args: RequestArgs };

function useOJData({ studentId, staff = false }: PanelProps) {
  const root = useRef<HTMLElement>(null), resultsRoot = useRef<HTMLElement>(null);
  const controllers = useRef(new Map<Kind, AbortController>()), cooldown = useRef(0);
  const [pending, setPending] = useState<Partial<Record<Kind, boolean>>>({});
  const [failures, setFailures] = useState<Partial<Record<Kind, Failure>>>({});
  const [summary, setSummary] = useState<Envelope<OJSummary> | null>(null), [contests, setContests] = useState<Page | null>(null), [results, setResults] = useState<OJClassResults | null>(null), [organizations, setOrganizations] = useState<Organizations | null>(null);
  const [activity, setActivity] = useState<OJActivity | null>(null), [activityYear, setActivityYear] = useState('');
  const [session, setSession] = useState(''), [notice, setNotice] = useState('');
  const cancelAll = useCallback(() => {
    for (const request of controllers.current.values()) request.abort();
    controllers.current.clear();
  }, []);
  function selectSession(id: string) {
    controllers.current.get('session')?.abort();
    controllers.current.delete('session');
    setPending(prev => ({ ...prev, session: false }));
    setFailures(prev => ({ ...prev, session: undefined }));
    setSession(id); setResults(null); setNotice('');
  }
  const load = useCallback(async (...args: RequestArgs) => {
    const [kind = 'summary', cursor, sessionId, year] = args;
    const fail = (message: string) => setFailures(prev => ({ ...prev, [kind]: { message, args } }));
    if (Date.now() < cooldown.current) { fail('CSATOJ đang giới hạn tần suất. Vui lòng thử lại sau.'); return; }
    controllers.current.get(kind)?.abort();
    const controller = new AbortController();
    controllers.current.set(kind, controller);
    setPending(prev => ({ ...prev, [kind]: true }));
    setFailures(prev => ({ ...prev, [kind]: undefined }));
    if (kind === 'session') setNotice('');
    function clearAccount() {
      cancelAll(); setPending({}); setFailures({});
      setSummary(null); setActivity(null); setActivityYear(''); setResults(null);
      setContests(null); setOrganizations(null); setNotice('');
    }
    try {
      const query = new URLSearchParams({ student: studentId, kind, ...(cursor ? { cursor } : {}), ...(sessionId ? { session: sessionId } : {}), ...(year ? { year } : {}) });
      const res = await fetch((staff ? '/api/oj/accounts?' : '/api/parents/oj?') + query, { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) {
        if (res.status === 429) cooldown.current = Date.now() + Number(res.headers.get('Retry-After') || 60) * 1000;
        if ([401, 403, 409].includes(res.status) || ['account_unavailable', 'grant_revoked', 'grant_revision_mismatch'].includes(data.code)) {
          clearAccount();
          setFailures({ summary: { message: data.error || 'Quyền truy cập đã thay đổi.', args: ['summary'] } });
          return;
        }
        throw new Error(data.error || 'Chưa tải được dữ liệu CSATOJ.');
      }
      if (!data.connected) { clearAccount(); setSummary(data); return; }
      if (kind === 'summary') { setSummary(data); setActivity(data.data?.activity ?? null); setActivityYear(''); }
      else if (kind === 'activity') { setActivity(data.data?.activity ?? null); setActivityYear(year || ''); }
      else if (kind === 'contests') setContests(prev => cursor && prev ? { ...data.data, items: [...prev.items, ...data.data.items] } : data.data);
      else if (kind === 'organizations') setOrganizations(prev => cursor && prev ? { ...data.data, items: [...prev.items, ...data.data.items] } : data.data);
      else { setResults(data.data || null); if (data.no_contests) setNotice('Buổi học chưa được gắn cuộc thi trên CSATOJ.'); }
    } catch (error) {
      if (!controller.signal.aborted) fail(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'CSATOJ phản hồi chậm. Vui lòng thử lại.');
    } finally {
      if (controllers.current.get(kind) === controller) {
        controllers.current.delete(kind); setPending(prev => ({ ...prev, [kind]: false }));
      }
    }
  }, [studentId, staff, cancelAll]);
  useEffect(() => {
    // One fresh shared summary on each parent portal mount; no interval or focus polling.
    if (!staff) { void load(); return cancelAll; }
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && document.visibilityState === 'visible') { observer.disconnect(); void load(); } });
    if (root.current) observer.observe(root.current);
    if (resultsRoot.current) observer.observe(resultsRoot.current);
    return () => { observer.disconnect(); cancelAll(); };
  }, [load, staff, cancelAll]);
  return { root, resultsRoot, summary, contests, results, organizations, activity, activityYear, failures, pending, session, selectSession, notice, load };
}
const OJContext = createContext<ReturnType<typeof useOJData> | null>(null);
export function ParentOJProvider({ children, ...props }: PanelProps & { children: ReactNode }) {
  return <ScopedOJProvider key={props.studentId + String(props.staff)} {...props}>{children}</ScopedOJProvider>;
}
function ScopedOJProvider({ children, ...props }: PanelProps & { children: ReactNode }) {
  const value = useOJData(props);
  return <OJContext.Provider value={value}>{children}</OJContext.Provider>;
}
function useOJ() {
  const value = useContext(OJContext);
  if (!value) throw new Error('OJ provider missing');
  return value;
}
export function ParentOJActiveDays() {
  const { summary, pending } = useOJ();
  // This headline always describes the default trailing year, independent of the calendar filter.
  const activity = summary?.data?.activity;
  const days = activity?.status === 'unavailable' ? null : activity?.active_days;
  return <dl className="parent-profile-goal parent-active-days"><dt>CSAT cùng con luyện tập</dt><dd className="parent-active-number" aria-label={days == null ? 'Chưa có dữ liệu ngày nộp bài' : `${value(days)} ngày có nộp bài trong 12 tháng gần nhất`}>{pending.summary && !summary ? 'Đang tải…' : value(days)}</dd><dd className="parent-active-unit">ngày</dd></dl>;
}
function LoadFailure({ failure, load }: { failure?: Failure; load: (...args: RequestArgs) => Promise<void> }) {
  if (!failure) return null;
  return <div><p role="alert" className="text-destructive">{failure.message}</p><button type="button" className={styles.action} onClick={() => load(...failure.args)}>Thử lại</button></div>;
}
export function ParentOJActivity() {
  const { root, summary, activity, activityYear, pending, failures, load } = useOJ();
  const busy = !!(pending.summary || pending.activity);
  return <section ref={root} id="practice" className="parent-card parent-practice">
    <div className={styles.header}><h2 className="parent-section-title parent-section-title--lime">Nhịp luyện tập của con</h2>{activity && <div className={styles.yearControl}><ActivityPeriodSelect activity={activity} year={activityYear} busy={busy} onYearChange={year => void load('activity', undefined, undefined, year)}/><span role="status" className={styles.yearIndicator}>{pending.activity && <><LoadingSpinner compact /><span className="sr-only">Đang tải lịch hoạt động…</span></>}</span></div>}</div>
    {pending.summary && !summary && <LoadingStatus>Đang tải hoạt động…</LoadingStatus>}
    <LoadFailure failure={failures.activity || failures.summary} load={load}/>
    {summary?.connected === false ? <p>Học sinh chưa có liên kết CSATOJ đang hoạt động. Vui lòng liên hệ CSAT.</p> : summary && <SubmissionHeatmap key={activity?.start_date + ':' + activity?.end_date} activity={activity} year={activityYear} busy={busy} onYearChange={year => void load('activity', undefined, undefined, year)} standalone={false} showActiveDays={false} showControls={false} learningTotals={summary.data?.learning.learning_total}/>}
  </section>;
}
export function ParentOJPanel(props: PanelProps) {
  const context = useContext(OJContext);
  return context ? <OJResults {...props} split/> : <ParentOJProvider {...props}><OJResults {...props}/></ParentOJProvider>;
}
function OJResults({ sessions = [], staff = false, split = false }: PanelProps & { split?: boolean }) {
  const { root, resultsRoot, summary, contests, results, organizations, activity, activityYear, failures, pending, session, selectSession, notice, load } = useOJ();
  const data = summary?.data;
  return <section ref={split ? resultsRoot : root} id={staff ? undefined : 'oj'} className="parent-card space-y-6"><div className={styles.header}><div><h2 className="parent-section-title parent-section-title--blue text-2xl font-bold">Kết quả CSATOJ</h2></div>{staff && <button type="button" className={styles.action} disabled={pending.summary || pending.activity} onClick={() => load()}>Làm mới</button>}</div>
    {pending.summary && <LoadingStatus>Đang tải dữ liệu CSATOJ…</LoadingStatus>}<LoadFailure failure={failures.summary} load={load}/>
    {summary?.connected === false && <p>Học sinh chưa có liên kết CSATOJ đang hoạt động. Vui lòng liên hệ CSAT.</p>}
    {data && <><div><h3 className="text-lg font-bold">Tài khoản · {data.account.username}</h3></div>
      <dl className={styles.metrics}>{[
        ['Bài đã làm thử', data.learning.learning_total.attempted_count],
        ['Bài giải đúng', data.learning.learning_total.solved_count],
        ['Lượt nộp', data.learning.learning_total.submission_count],
      ].map(([label, n]) => <div key={String(label)} className={styles.metric}><dt>{label}</dt><dd>{value(n as number | null)}</dd></div>)}</dl>
      {data.learning.learning_total.status === 'limited' && <p role="status">Số liệu chưa đầy đủ: một phần kết quả cuộc thi đang ẩn hoặc chưa được công bố.</p>}
      {!split && <SubmissionHeatmap key={activity?.start_date + ':' + activity?.end_date} activity={activity} year={activityYear} busy={!!(pending.activity || pending.summary)} onYearChange={year => void load('activity', undefined, undefined, year)}/>}
      {!split && <LoadFailure failure={failures.activity} load={load}/>}
      <LoadFailure failure={failures.organizations} load={load}/>
      <CompetitionDetails data={data} staff={staff} busy={!!pending.organizations} load={load} organizations={organizations}/>
      {sessions.length > 0 && <section className="space-y-3"><h3 className={styles.subheading}>Kết quả và xếp hạng theo buổi</h3><label className="block text-sm">Buổi học<select aria-label="Buổi học" className="mt-2 block min-h-11 w-full rounded-lg border bg-background p-2" value={session} onChange={e => selectSession(e.target.value)}><option value="">Chọn buổi</option>{sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.date} · {s.class_name || 'Buổi học'}</option>)}</select></label><button className={styles.action} aria-busy={!!pending.session} disabled={pending.session || !session} onClick={() => load('session', undefined, session)}>{pending.session ? <><LoadingSpinner compact /> Đang tải kết quả buổi…</> : 'Xem kết quả buổi'}</button>
        <LoadFailure failure={failures.session} load={load}/>{notice && <p role="status">{notice}</p>}
        {results && <><p>{labels[results.totals.status || 'available'] || 'Dữ liệu chưa đầy đủ'} · {value(results.totals.solved_count)} bài giải đúng / {value(results.totals.attempted_count)} bài đã làm thử</p>{!results.roster_complete && <p>Chưa đủ liên kết học sinh của buổi này để tính hạng trong lớp. Hạng toàn cuộc thi vẫn hiển thị nếu được công bố.</p>}<ContestRows items={results.contests}/></>}
      </section>}
      <div className={styles.actions}><button className={`${styles.action} ${styles.contestAction}`} aria-busy={!!pending.contests} disabled={pending.contests} onClick={() => load('contests')}>{pending.contests ? <>Đang tải lịch sử thi… <LoadingSpinner compact /></> : <>Lịch sử cuộc thi <span aria-hidden="true">↗</span></>}</button></div>
      <LoadFailure failure={failures.contests} load={load}/>
      {contests && <section className="space-y-3"><h3 className={styles.subheading}>Các lượt tham gia cuộc thi</h3><ContestRows items={contests.items}/>{contests.next_cursor && <button className={styles.action} disabled={pending.contests} aria-busy={!!pending.contests} onClick={() => load('contests', contests.next_cursor!)}>{pending.contests ? 'Đang tải…' : 'Xem thêm lượt tham gia'}</button>}</section>}
    </>}
  </section>;
}
function CompetitionDetails({ data, staff, busy, load, organizations }: { data: OJSummary; staff: boolean; busy: boolean } & Pick<ReturnType<typeof useOJData>, 'load' | 'organizations'>) {
  return <details className={styles.competition} open={!staff}><summary>Chi tiết thi đấu</summary><dl>
    <div><dt>Điểm thi đấu (rating)</dt><dd>{data.site.rating === null ? 'Chưa có điểm thi đấu' : value(data.site.rating)}</dd></div>
    <div><dt>Hạng theo điểm thi đấu</dt><dd>{data.site.rank_status === 'unlisted' ? 'Không tham gia bảng xếp hạng' : data.site.rating_rank === null ? 'Chưa được xếp hạng' : `Hạng ${value(data.site.rating_rank)}`}</dd></div>
  </dl><p>{value(data.counts.live_contests)} cuộc thi chính thức · {value(data.counts.virtual_participations)} lượt thi thử</p>
    {staff && <><button className={styles.action} disabled={busy} onClick={() => load('organizations')}>Xem tổ chức đang tham gia</button>{organizations && <section className="my-3 space-y-3"><h3 className="font-bold">Tổ chức trên CSATOJ</h3><ul className="list-disc pl-5">{organizations.items.map(o => <li key={o.organization_id}>{o.name}</li>)}</ul>{organizations.next_cursor && <button className={styles.action} disabled={busy} onClick={() => load('organizations', organizations.next_cursor!)}>Xem thêm tổ chức</button>}</section>}</>}
  </details>;
}
