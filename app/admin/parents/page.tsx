'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ParentStudent } from '@/lib/parents';

interface Account {
  auth_uid: string; display_name: string; phone: string; active: boolean;
  parent_student_links: Array<{ student_id: string; students: { name: string } | null }>;
}
type Student = ParentStudent & { parent_number?: string | null; date_of_birth?: string | null };
type Editor = { authUid?: string; name: string; phone: string; active: boolean; students: Student[] };
type Credential = { message: string; phone: string; password: string };

async function send(body: object) {
  const res = await fetch('/api/admin/parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chưa thực hiện được yêu cầu.');
  return data;
}

export default function ParentAccountsPage() {
  const [parents, setParents] = useState<Account[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [credential, setCredential] = useState<Credential | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [studentError, setStudentError] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/parents?' + new URLSearchParams({ q: query, page: String(page) }), { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setParents(data.parents); setTotal(data.total);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không tải được tài khoản.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, version]);

  const isEditing = editor !== null;
  useEffect(() => {
    if (!isEditing) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true); setStudentError('');
      try {
        const res = await fetch('/api/admin/parents?' + new URLSearchParams({ view: 'students', q: studentQuery }), { signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data.students);
      } catch (err) { if (!controller.signal.aborted) setStudentError(err instanceof Error ? err.message : 'Không tải được học sinh.'); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [studentQuery, isEditing]);

  function openEditor(account?: Account) {
    setError(''); setNotice(''); setCredential(null); setResetTarget(null); setStudentQuery(''); setResults([]);
    setEditor(account ? { authUid: account.auth_uid, name: account.display_name, phone: account.phone, active: account.active,
      students: account.parent_student_links.map(link => ({ student_id: link.student_id, name: link.students?.name || 'Học sinh không còn hiển thị' })) }
      : { name: '', phone: '', active: true, students: [] });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy(true); setError(''); setNotice(''); setCredential(null);
    try {
      const data = await send({ action: editor.authUid ? 'update' : 'create', authUid: editor.authUid,
        name: editor.name, phone: editor.phone, active: editor.active, studentIds: editor.students.map(s => s.student_id) });
      if (data.password) setCredential(data); else setNotice(data.message);
      setEditor(null); setVersion(v => v + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa lưu được tài khoản.'); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!resetTarget || busy) return;
    setBusy(true); setError(''); setCredential(null); setNotice('');
    try {
      setCredential(await send({ action: 'reset_password', authUid: resetTarget.auth_uid }));
      setResetTarget(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa đặt lại được mật khẩu.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 max-w-6xl mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-heading text-2xl font-bold">Tài khoản phụ huynh</h1>
        <p className="text-sm text-muted-foreground mt-1">Cấp mật khẩu và chọn học sinh mà mỗi phụ huynh được phép xem.</p></div>
      <Button disabled={busy} onClick={() => openEditor()}>Cấp tài khoản</Button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-lg border p-4">{notice}</p>}
    {credential && <section aria-label="Thông tin đăng nhập vừa cấp" className="csat-card p-5 space-y-3 border-primary">
      <h2 className="font-bold">{credential.message}</h2>
      <p className="text-sm">Mật khẩu chỉ hiển thị lần này. Hãy chuyển cho đúng phụ huynh và hướng dẫn đổi mật khẩu sau khi đăng nhập.</p>
      <p>Số điện thoại: <strong>{credential.phone}</strong></p>
      <p className="break-all">Mật khẩu: <code className="select-all font-bold">{credential.password}</code></p>
      <Button variant="outline" onClick={() => setCredential(null)}>Đã lưu thông tin, ẩn mật khẩu</Button>
    </section>}
    {resetTarget && <section role="region" aria-label="Xác nhận đặt lại mật khẩu" className="csat-card p-5 space-y-3">
      <h2 className="font-bold">Đặt lại mật khẩu cho {resetTarget.display_name}?</h2>
      <p className="text-sm">Số điện thoại {resetTarget.phone}. Mật khẩu cũ sẽ không dùng để đăng nhập được nữa.</p>
      <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={resetPassword}>{busy ? 'Đang xử lý…' : 'Xác nhận đặt lại'}</Button>
        <Button variant="outline" disabled={busy} onClick={() => setResetTarget(null)}>Hủy</Button></div>
    </section>}
    {editor && <form onSubmit={save} className="csat-card p-5 space-y-5">
      <h2 className="font-bold text-lg">{editor.authUid ? 'Chỉnh sửa quyền truy cập' : 'Cấp tài khoản mới'}</h2>
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="parent-name">Tên phụ huynh</Label><Input id="parent-name" required maxLength={150} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="parent-phone">Số di động đăng nhập</Label><Input id="parent-phone" type="tel" required maxLength={30} readOnly={!!editor.authUid} value={editor.phone} onChange={e => setEditor({ ...editor, phone: e.target.value })} placeholder="0912 345 678" />
            {editor.authUid && <p className="text-xs text-muted-foreground">Số đăng nhập gắn với tài khoản Supabase hiện tại.</p>}</div>
        </div>
        {editor.authUid && <label className="flex gap-3 items-center"><input type="checkbox" checked={editor.active} onChange={e => setEditor({ ...editor, active: e.target.checked })} />Cho phép truy cập</label>}
        <div className="space-y-3">
          <Label htmlFor="student-search">Học sinh được phép xem ({editor.students.length}/50)</Label>
          <p className="text-sm text-muted-foreground">Kiểm tra tên, ngày sinh và người liên hệ trước khi liên kết. Tài khoản mới cần ít nhất một học sinh.</p>
          <div className="flex flex-wrap gap-2">{editor.students.map(child => <Button key={child.student_id} type="button" variant="outline" aria-label={'Bỏ liên kết ' + child.name}
            onClick={() => setEditor({ ...editor, students: editor.students.filter(s => s.student_id !== child.student_id) })}>{child.name} ×</Button>)}</div>
          <Input id="student-search" placeholder="Tìm theo tên hoặc số điện thoại phụ huynh" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} />
          {studentError && <p role="alert" className="text-destructive text-sm">{studentError}</p>}
          {searching ? <p role="status" className="text-sm">Đang tìm học sinh…</p> : <ul className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {results.map(child => <li key={child.student_id}><label className="flex items-start gap-3 p-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={editor.students.some(s => s.student_id === child.student_id)}
                disabled={editor.students.length >= 50 && !editor.students.some(s => s.student_id === child.student_id)}
                onChange={e => setEditor({ ...editor, students: e.target.checked ? [...editor.students, child] : editor.students.filter(s => s.student_id !== child.student_id) })} />
              <span><span className="font-medium">{child.name}</span><span className="block text-xs text-muted-foreground">Ngày sinh: {child.date_of_birth || 'Chưa có'} · SĐT liên hệ: {child.parent_number || 'Chưa có'}</span></span>
            </label></li>)}
            {!results.length && <li className="p-3 text-sm">Không tìm thấy học sinh.</li>}
          </ul>}
          <p className="text-xs text-muted-foreground">Hiển thị tối đa 20 kết quả. Nhập thêm để thu hẹp tìm kiếm.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!editor.authUid && !editor.students.length}>{busy ? 'Đang lưu…' : 'Lưu tài khoản'}</Button><Button type="button" variant="outline" onClick={() => setEditor(null)}>Hủy</Button></div>
      </fieldset>
    </form>}
    <div className="space-y-2"><Label htmlFor="account-search">Tìm tài khoản</Label><Input id="account-search" placeholder="Tên hoặc số điện thoại đăng nhập" value={query} onChange={e => { setQuery(e.target.value); setPage(0); setLoading(true); }} /></div>
    {loading ? <p role="status">Đang tải tài khoản…</p> : <div className="grid gap-4 md:grid-cols-2">
      {parents.map(account => <section key={account.auth_uid} className="csat-card p-5 space-y-3">
        <h2 className="font-bold">{account.display_name}</h2><p>{account.phone} · {account.active ? 'Đang hoạt động' : 'Đã khóa'}</p>
        <p className="text-sm text-muted-foreground">Học sinh: {account.parent_student_links.map(l => l.students?.name || 'Không còn hiển thị').join(', ') || 'Chưa liên kết'}</p>
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => openEditor(account)}>Chỉnh sửa</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setResetTarget(account); setEditor(null); setCredential(null); setError(''); }}>Đặt lại mật khẩu</Button></div>
      </section>)}
      {!parents.length && <p>Chưa có tài khoản phù hợp.</p>}
    </div>}
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={loading || page === 0} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Trang trước</Button>
      <span className="text-sm">Trang {page + 1} · {total} tài khoản</span><Button variant="outline" disabled={loading || (page + 1) * 25 >= total} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Trang sau</Button></div>
  </div>;
}
