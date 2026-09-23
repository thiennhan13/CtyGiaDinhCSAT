'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MAX_AVATAR_BYTES, type TutorProfile, type TutorProfileInput } from '@/lib/tutor-profile';
import { TutorProfileCard } from './TutorProfileCard';

export function TutorProfileEditor({ tutorId }: { tutorId?: string }) {
  const endpoint = tutorId ? `/api/admin/tutors/${tutorId}/profile` : '/api/tutor/profile';
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [latest, setLatest] = useState<TutorProfile | null>(null);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [action, setAction] = useState<TutorProfileInput['avatar_action']>('keep');
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [conflict, setConflict] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    fetch(endpoint, { cache: 'no-store' }).then(async r => { const p = await r.json(); if (!r.ok) throw Error(p.error); if (alive) setProfile(p.profile); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [endpoint]);
  useEffect(() => { if (!file) { setPreview(null); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function change(key: keyof TutorProfile, value: string) { setProfile(p => p ? { ...p, [key]: value } : p); setDirty(true); setNotice(''); }
  function selectFile(selected?: File) {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > MAX_AVATAR_BYTES) { setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 3 MB.'); if (picker.current) picker.current.value = ''; return; }
    setFile(selected); setAction('replace'); setDirty(true); setError(''); setNotice('');
  }
  async function loadLatest() {
    setBusy(true); setError('');
    try { const r = await fetch(endpoint, { cache: 'no-store' }); const p = await r.json(); if (!r.ok) throw Error(p.error); if (!profile) setProfile(p.profile); else setLatest(p.profile); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data: TutorProfileInput = { revision: profile.revision, introduction: profile.introduction, major: profile.major, university: profile.university, achievements: profile.achievements, avatar_action: action, ...(tutorId ? { background: profile.background } : {}) };
      const form = new FormData(); form.set('profile', JSON.stringify(data)); if (file && action === 'replace') form.set('avatar', file);
      const r = await fetch(endpoint, { method: 'PUT', body: form }); const p = await r.json();
      if (!r.ok) { if (r.status === 409) setConflict(true); throw Error(p.error); }
      setProfile(p.profile); setFile(null); setAction('keep'); setDirty(false); setConflict(false); setLatest(null);
      if (picker.current) picker.current.value = '';
      setNotice('Đã lưu. Hồ sơ được hiển thị cho phụ huynh khi tải lại trang.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được. Nội dung đang nhập được giữ nguyên.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border bg-card p-5 [&_button]:min-h-11 [&_input]:min-h-11">
    <div><h2 className="text-xl font-bold">Hồ sơ hiển thị cho phụ huynh</h2><p className="mt-2 text-sm text-muted-foreground">Kiểm tra thông tin trước khi lưu. Cập nhật được hiển thị ngay, không qua bước duyệt.</p></div>
    {error && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    {!profile ? <Button disabled={busy} onClick={async () => { await loadLatest(); }}>Tải lại hồ sơ</Button> : <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="min-w-0 space-y-4"><fieldset disabled={busy} className="space-y-4">
        <p className="font-bold">{profile.name}</p>
        {tutorId ? <label className="block space-y-2 text-sm">Thông tin nền<Input maxLength={300} value={profile.background} onChange={e => change('background', e.target.value)} /></label> : <p className="rounded-lg bg-secondary p-3 text-sm">{profile.background || 'Chưa có thông tin nền.'}<span className="mt-2 block text-xs text-muted-foreground">Liên hệ admin nếu cần điều chỉnh thông tin này.</span></p>}
        <div className="space-y-2 text-sm"><label htmlFor="tutor-introduction">Giới thiệu bản thân</label><Textarea id="tutor-introduction" value={profile.introduction} maxLength={2000} rows={5} onChange={e => change('introduction', e.target.value)} aria-describedby="tutor-introduction-help" /></div>
        <p id="tutor-introduction-help" className="text-xs leading-6 text-muted-foreground">Viết 2–4 câu, khoảng 300–600 ký tự, về bản thân, cách hướng dẫn và đồng hành với học sinh. {profile.introduction.length}/2.000 ký tự.</p>
        <label className="block space-y-2 text-sm">Ngành học<Input value={profile.major} maxLength={200} onChange={e => change('major', e.target.value)} /></label>
        <label className="block space-y-2 text-sm">Trường đại học<Input value={profile.university} maxLength={200} onChange={e => change('university', e.target.value)} /></label>
        <div className="space-y-2 text-sm"><label htmlFor="tutor-achievements">Thành tích cá nhân · mỗi dòng một thành tích</label><Textarea id="tutor-achievements" rows={4} maxLength={2000} value={profile.achievements} onChange={e => change('achievements', e.target.value)} /></div>
        <label className="block space-y-2 text-sm">Ảnh đại diện<Input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => selectFile(e.target.files?.[0])} /></label>
        <p className="text-xs leading-6 text-muted-foreground">Ảnh vuông 512 × 512, cắt giữa ảnh. JPG, PNG hoặc WebP tối đa 3 MB. Ảnh có đường dẫn công khai: ai có link đều có thể xem.</p>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setAction('remove'); setFile(null); setDirty(true); if (picker.current) picker.current.value = ''; }}>Gỡ ảnh</Button>{action !== 'keep' && <Button type="button" variant="ghost" onClick={() => { setFile(null); setAction('keep'); if (picker.current) picker.current.value = ''; }}>Giữ ảnh đã lưu</Button>}</div>
        <Button type="submit" disabled={busy || conflict}>{busy ? 'Đang lưu…' : 'Lưu và hiển thị'}</Button>
      </fieldset></form>
      <div className="min-w-0 space-y-3"><h3 className="font-bold">Xem trước</h3><TutorProfileCard profile={{ ...profile, avatar_url: action === 'remove' ? null : action === 'replace' ? preview : profile.avatar_url }} /><p className="text-xs text-muted-foreground">Các mục để trống sẽ không hiển thị cho phụ huynh.</p></div>
    </div>}
    <div className="space-y-3"><Button variant="outline" disabled={busy} onClick={loadLatest}>Tải bản đã lưu để đối chiếu</Button>{latest && <><h3 className="font-bold">Bản đang hiển thị cho phụ huynh</h3><TutorProfileCard profile={latest} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setProfile(latest); setFile(null); setAction('keep'); setDirty(false); setConflict(false); setLatest(null); }}>Dùng bản đã lưu, bỏ nội dung đang nhập</Button>{profile && <Button variant="outline" onClick={() => { setProfile({ ...profile, revision: latest.revision, avatar_path: latest.avatar_path, avatar_url: latest.avatar_url, ...(!tutorId ? { background: latest.background } : {}) }); setConflict(false); setLatest(null); setDirty(true); setNotice('Đã đối chiếu phiên bản. Kiểm tra nội dung rồi chọn Lưu và hiển thị.'); }}>Giữ nội dung đang nhập để lưu lại</Button>}</div></>}</div>
  </section>;
}
