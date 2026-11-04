'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OJSummary, OJParticipation, OJClassResults } from '@/lib/oj-grants';
type Envelope<T> = { connected: boolean; as_of?: string; data?: T; no_contests?: boolean };
type Page = { items: OJParticipation[]; next_cursor: string | null };
type Organizations = { items: { organization_id: number; name: string }[]; next_cursor: string | null };
const value = (n: number | null | undefined) => n == null ? 'Chưa có dữ liệu' : new Intl.NumberFormat('vi-VN').format(n);
const labels: Record<string, string> = { available: 'Đã công bố', frozen: 'Bảng điểm đóng băng', withheld: 'Dữ liệu chưa được công bố', limited: 'Dữ liệu chưa đầy đủ', not_participated: 'Chưa tham gia', disqualified: 'Không được xếp hạng', completed: 'Đã kết thúc', registered: 'Đã đăng ký', not_started: 'Chưa bắt đầu', in_progress: 'Đang tham gia', live: 'Thi chính thức', virtual: 'Thi ảo', spectate: 'Theo dõi' };
export function ContestRows({ items }: { items: OJParticipation[] }) {
  return <div className="space-y-3">{items.map((item, i) => <article key={item.contest.contest_id + ':' + (item.participation?.participation_id ?? i)} className="rounded-lg border p-4 space-y-2">
    <h4 className="font-bold">{item.contest.name}</h4><p className="text-sm">{labels[item.status] || item.status} · {labels[item.participation?.mode || ''] || item.participation?.mode} · {labels[item.participation?.state || ''] || item.participation?.state}</p>
    {item.metrics && <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt>Điểm</dt><dd>{value(item.metrics.score)}</dd></div><div><dt>Bài AC / đã thử</dt><dd>{value(item.metrics.solved_count)} / {value(item.metrics.attempted_count)}</dd></div><div><dt>Hạng toàn contest</dt><dd>{item.metrics.rank_scope === 'unranked_virtual' ? 'Thi ảo, không xếp hạng LIVE' : value(item.metrics.contest_rank) + ' / ' + value(item.metrics.contest_participants)}</dd></div><div><dt>Hạng trong lớp</dt><dd>{value(item.metrics.class_rank)} / {value(item.metrics.class_participants)}</dd></div></dl>}
  </article>)}{!items.length && <p>Chưa có lượt tham gia trong danh sách này.</p>}</div>;
}
export function ParentOJPanel({ studentId, month: _month, sessions = [], staff = false }: { studentId: string; month?: string; sessions?: { session_id: string; date: string; class_name?: string }[]; staff?: boolean }) {
  const root = useRef<HTMLElement>(null), controller = useRef<AbortController | null>(null), cooldown = useRef(0);
  const [summary, setSummary] = useState<Envelope<OJSummary> | null>(null), [contests, setContests] = useState<Page | null>(null), [organizations, setOrganizations] = useState<Organizations | null>(null), [results, setResults] = useState<OJClassResults | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [session, setSession] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async (kind = 'summary', cursor?: string, sessionId?: string) => {
    if (Date.now() < cooldown.current) { setError('CSATOJ đang giới hạn tần suất. Vui lòng thử lại sau.'); return; }
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setNotice('');
    try {
      const query = new URLSearchParams({ student: studentId, kind, ...(cursor ? { cursor } : {}), ...(sessionId ? { session: sessionId } : {}) });
      const res = await fetch((staff ? '/api/oj/accounts?' : '/api/parents/oj?') + query, { cache: 'no-store', signal: abort.signal });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) cooldown.current = Date.now() + Number(res.headers.get('Retry-After') || 60) * 1000;
        if ([401, 403, 409].includes(res.status) || ['account_unavailable', 'grant_revoked', 'grant_revision_mismatch'].includes(data.code)) { setSummary(null); setContests(null); setOrganizations(null); setResults(null); }
        throw new Error(data.error || 'Chưa tải được dữ liệu CSATOJ.');
      }
      if (!data.connected) { setSummary(data); setContests(null); setOrganizations(null); setResults(null); return; }
      if (kind === 'summary') setSummary(data);
      else if (kind === 'contests') setContests(data.data);
      else if (kind === 'organizations') setOrganizations(data.data);
      else { setResults(data.data || null); if (data.no_contests) setNotice('Buổi học chưa được gắn contest.'); }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa kết nối được CSATOJ.'); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }, [studentId, staff]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && document.visibilityState === 'visible') { observer.disconnect(); void load(); } });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); controller.current?.abort(); };
  }, [load]);
  const data = summary?.data;
  return <section ref={root} id={staff ? undefined : 'oj'} className="parent-card space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">Kết quả CSATOJ</h2><button type="button" className="csat-btn" disabled={busy} onClick={() => load()}>Làm mới</button></div>
    {busy && <p role="status">Đang tải dữ liệu CSATOJ…</p>}{error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    {summary?.connected === false && <p>Học sinh chưa có liên kết CSATOJ đang hoạt động. Vui lòng liên hệ CSAT.</p>}
    {data && <><div><h3 className="text-lg font-bold">{data.account.username}</h3><p className="text-sm text-muted-foreground">Cập nhật: {summary?.as_of ? new Date(summary.as_of).toLocaleString('vi-VN') : 'Chưa có'}</p></div>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[['Bài đã thử', data.learning.learning_total.attempted_count], ['Bài AC', data.learning.learning_total.solved_count], ['Lượt nộp', data.learning.learning_total.submission_count], ['Rating', data.site.rating], ['Hạng rating', data.site.rating_rank], ['Hạng performance', data.site.performance_rank], ['Contest chính thức', data.counts.live_contests], ['Lượt thi ảo', data.counts.virtual_participations]].map(([label, n]) => <div key={String(label)} className="rounded-lg border p-3"><dt className="text-sm">{label}</dt><dd className="mt-2 text-xl font-bold">{value(n as number | null)}</dd></div>)}</dl>
      <p className="text-sm">{labels[data.learning.learning_total.status || 'available'] || data.learning.learning_total.status}. Ngoài contest: {value(data.learning.practice.solved_count)} bài AC. Đăng ký chưa thi: {value(data.counts.registered_contests)}.</p>
      <div className="flex flex-wrap gap-3"><button className="csat-btn" disabled={busy} onClick={() => load('organizations')}>Tổ chức</button><button className="csat-btn" disabled={busy} onClick={() => load('contests')}>Lịch sử contest</button></div>
    </>}
    {organizations && <section className="space-y-3"><h3 className="font-bold">Tổ chức tham gia</h3><ul className="list-disc pl-5">{organizations.items.map(o => <li key={o.organization_id}>{o.name}</li>)}</ul>{organizations.next_cursor && <button className="csat-btn" disabled={busy} onClick={() => load('organizations', organizations.next_cursor!)}>Trang tổ chức tiếp</button>}</section>}
    {contests && <section className="space-y-3"><h3 className="font-bold">Lượt tham gia contest</h3><ContestRows items={contests.items}/>{contests.next_cursor && <button className="csat-btn" disabled={busy} onClick={() => load('contests', contests.next_cursor!)}>Trang contest tiếp</button>}</section>}
    {data && sessions.length > 0 && <section className="space-y-3"><h3 className="font-bold">Kết quả theo buổi</h3><label className="block text-sm">Buổi học<select aria-label="Buổi học" className="mt-2 block min-h-11 w-full rounded-lg border bg-background p-2" value={session} onChange={e => { setSession(e.target.value); setResults(null); }}><option value="">Chọn buổi</option>{sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.date} · {s.class_name || 'Buổi học'}</option>)}</select></label><button className="csat-btn" disabled={busy || !session} onClick={() => load('session', undefined, session)}>Xem kết quả buổi</button>
      {results && <><p>{labels[results.totals.status || 'available']} · {value(results.totals.solved_count)} bài AC / {value(results.totals.attempted_count)} bài đã thử</p>{!results.roster_complete && <p>Chưa đủ liên kết trong lớp để tính hạng lớp.</p>}<ContestRows items={results.contests}/></>}
    </section>}
  </section>;
}
