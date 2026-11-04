'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ParentOJPanel } from './ParentOJPanel';
type Workspace = { classes: { class_id: string; name: string; organization_id: number | null; revision: number }[]; students: { student_id: string; name: string; username: string | null; state: string | null; revision: number; pending_request: string | null }[]; sessions: { session_id: string; date: string; start_time: string; contest_ids: number[]; revision: number }[] };
export function OJWorkspace({ admin }: { admin: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace>({ classes: [], students: [], sessions: [] });
  const [classId, setClassId] = useState(''), [studentId, setStudentId] = useState(''), [sessionId, setSessionId] = useState(''), [search, setSearch] = useState('');
  const [code, setCode] = useState(''), [reason, setReason] = useState(''), [organization, setOrganization] = useState(''), [contests, setContests] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const request = useRef<{ id: string; student: string; revision: number } | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/oj/links?' + new URLSearchParams({ ...(classId ? { class: classId } : {}), q: search }), { cache: 'no-store', signal });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); setWorkspace(data);
  }, [classId, search]);
  useEffect(() => { const abort = new AbortController(); const timer = setTimeout(() => { void load(abort.signal).catch(e => { if (!abort.signal.aborted) setError(e.message); }); }, 250); return () => { clearTimeout(timer); abort.abort(); }; }, [load]);
  const student = workspace.students.find(s => s.student_id === studentId), selectedClass = workspace.classes.find(c => c.class_id === classId), session = workspace.sessions.find(s => s.session_id === sessionId);
  async function send(body: object) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/oj/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setNotice('Đã cập nhật liên kết.'); setCode(''); request.current = null;
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa xác nhận kết quả. Dùng đối soát để kiểm tra thao tác đang chờ.'); }
    finally { try { await load(); } catch { setError('Chưa tải lại được trạng thái.'); } setBusy(false); }
  }
  function exchange() {
    if (!student) return;
    if (!request.current || request.current.student !== studentId) request.current = { id: student.pending_request || crypto.randomUUID(), student: studentId, revision: student.revision };
    void send({ action: 'exchange', studentId, code, reason, requestId: request.current.id, revision: request.current.revision });
  }
  return <main className="mx-auto max-w-6xl space-y-6"><h1 className="text-2xl font-bold">Kết nối CSATOJ</h1><p>Liên kết tài khoản học sinh, tổ chức của lớp và contest của từng buổi.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label className="block">Lớp<select aria-label="Lớp" className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={classId} onChange={e => { setClassId(e.target.value); setStudentId(''); setSessionId(''); }}><option value="">{admin ? 'Tất cả học sinh' : 'Chọn lớp đang phụ trách'}</option>{workspace.classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}</select></label>
    {admin && <label className="block">Tìm học sinh<input className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={search} onChange={e => setSearch(e.target.value)}/></label>}
    <label className="block">Học sinh<select aria-label="Học sinh" className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={studentId} onChange={e => { setStudentId(e.target.value); setCode(''); request.current = null; }}><option value="">Chọn học sinh</option>{workspace.students.map(s => <option key={s.student_id} value={s.student_id}>{s.name} · {s.username || 'Chưa liên kết'}</option>)}</select></label>
    {admin && student && <section className="csat-card space-y-3 p-5"><h2 className="font-bold">Tài khoản học sinh OJ</h2><p>Hiện tại: {student.username || 'Chưa có'} · {student.state === 'active' ? 'Đang hoạt động' : student.pending_request ? 'Đang chờ đối soát' : 'Chưa hoạt động'}</p>
      <label className="block">Mã kết nối từ admin OJ<input type="password" autoComplete="off" maxLength={43} className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={code} onChange={e => setCode(e.target.value)}/></label>
      <label className="block">Lý do liên kết<input maxLength={500} className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={reason} onChange={e => setReason(e.target.value)}/></label>
      <button className="csat-btn" disabled={busy || code.length !== 43 || !reason.trim()} onClick={exchange}>Đổi mã / thử lại cùng thao tác</button>
      {student.pending_request && <div className="space-y-3"><p>Chưa xác nhận xong. Đối soát trước khi thay mã; không tìm thấy receipt chưa có nghĩa thao tác thất bại.</p><div className="flex flex-wrap gap-3"><button className="csat-btn" disabled={busy} onClick={() => send({ action: 'recover', requestId: student.pending_request })}>Đối soát receipt</button><button className="csat-btn" disabled={busy} onClick={() => send({ action: 'abandon', requestId: student.pending_request })}>Dừng thao tác để nhập mã mới</button></div></div>}
    </section>}
    {selectedClass && <section className="csat-card space-y-4 p-5"><h2 className="font-bold">Mapping lớp và buổi</h2>
      {admin && <div className="space-y-2"><p>Organization ID hiện tại: {selectedClass.organization_id ?? 'Chưa có'}</p><label className="block">Organization ID mới<input type="number" min={1} value={organization} onChange={e => setOrganization(e.target.value)} className="ml-3 min-h-11 rounded border bg-background p-2"/></label><button className="csat-btn" disabled={busy || !organization} onClick={() => send({ action: 'mapping', kind: 'class', id: classId, values: [Number(organization)], revision: selectedClass.revision })}>Lưu tổ chức</button></div>}
      <label className="block">Buổi học<select aria-label="Buổi học" className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={sessionId} onChange={e => { setSessionId(e.target.value); setContests(workspace.sessions.find(s => s.session_id === e.target.value)?.contest_ids.join(', ') || ''); }}><option value="">Chọn buổi</option>{workspace.sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.date} · {s.start_time}</option>)}</select></label>
      {session && <><label className="block">Contest IDs, phân cách bằng dấu phẩy<input className="mt-2 block min-h-11 w-full rounded border bg-background p-2" value={contests} onChange={e => setContests(e.target.value)}/></label><button className="csat-btn" disabled={busy} onClick={() => send({ action: 'mapping', kind: 'session', id: sessionId, values: contests.trim() ? contests.split(',').map(s => Number(s.trim())) : [], revision: session.revision })}>Lưu contest của buổi</button></>}
    </section>}
    {student && <ParentOJPanel key={student.student_id + ':' + student.revision} studentId={student.student_id} sessions={workspace.sessions} staff/>}
  </main>;
}
