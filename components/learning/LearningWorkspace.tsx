'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/use-dialog';
import { defaultProgram, emptyLearningBody, PROGRAMS, type LearningBody, type LearningWorkspace as Workspace, type LearningRecord } from '@/lib/learning';
import { REVIEW_TAGS } from '@/lib/student-reviews';
import { getVietnamMonthRange } from '@/lib/calendar';
import { Roadmap } from './Roadmap';
import { AdminClassReviews } from './AdminClassReviews';
const control = 'min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm';
export function LearningWorkspace({ admin = false, initialMonth }: { admin?: boolean; initialMonth?: string }) {
 const { class_id: classId } = useParams<{class_id:string}>();
 const [data,setData] = useState<Workspace | null>(null);
 const [record,setRecord] = useState<LearningRecord | null>(null);
 const [body,setBody] = useState<LearningBody>(emptyLearningBody);
 const [baseline,setBaseline] = useState('');
 const [target,setTarget] = useState('class');
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [notice,setNotice] = useState('');
 const [retry,setRetry] = useState(0);
 const [search,setSearch] = useState('');
 const { confirm, ConfirmDialog } = useConfirm();
 const month = initialMonth || getVietnamMonthRange().startDate.slice(0,7);
 const dirty = !!baseline && baseline !== JSON.stringify(body);
 function initial(next: Workspace, key: string) {
   const [kind,id] = key.split(':');
   const found = next.records.find(r => r.kind===kind && (kind==='class' || r.student_id===id || r.session_id===id)) || null;
   const form = found ? found.draft : emptyLearningBody();
   if (!found && kind==='class') {
     form.program=defaultProgram(next.class.class_type);
     form.template_id=next.defaults.find(d=>d.program===form.program)?.template_id || null;
   }
   setRecord(found); setBody(form); setBaseline(JSON.stringify(form));
 }
 useEffect(() => {
   const abort = new AbortController();
   setData(null); setError('');
   fetch('/api/learning?class_id='+classId+'&month='+month,{cache:'no-store',signal:abort.signal}).then(async r=>{
     const next = await r.json(); if(!r.ok) throw new Error(next.error);
     if(!abort.signal.aborted) {setData(next); initial(next,'class'); setTarget('class');setError('');}
   }).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
   return ()=>abort.abort();
 },[classId,month,retry]);
 useEffect(()=>{ if(!dirty)return; const protect=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';}; window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty]);
 async function choose(key: string) {
   if(busy || !data)return;
   if(dirty && !await confirm({title:'Nội dung chưa lưu',description:'Lưu bản nháp trước khi chuyển hoặc bỏ các thay đổi đang nhập.',confirmText:'Bỏ thay đổi',cancelText:'Tiếp tục viết',variant:'destructive'}))return;
   setTarget(key);initial(data,key);setError('');setNotice('');
 }
 function update(patch:Partial<LearningBody>){setBody(v=>({...v,...patch}));setNotice('');}
 const kind = target.split(':')[0] as LearningRecord['kind'];
 const subject = target.split(':')[1] || null;
 const template = data?.templates.find(t=>t.template_id===body.template_id);
 async function save(publish:boolean) {
  if(busy || !data)return;
  if(publish && !await confirm({title:'Công bố cho phụ huynh',description:'Nội dung đang xem trước sẽ thay thế bản công bố hiện tại. Lịch sử các lần lưu vẫn được giữ.',confirmText:'Công bố',cancelText:'Xem lại'}))return;
  setBusy(true);setError('');setNotice('');
  try {
    const response=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      class_id:classId,kind,student_id:kind==='student'?subject:null,session_id:kind==='session'?subject:null,
      expected_revision:record?.revision || 0,publish,body
    })});
    const next=await response.json();if(!response.ok)throw new Error(next.error);
    setRecord(next);setBaseline(JSON.stringify(body));setData({...data,records:[...data.records.filter(r=>r.record_id!==next.record_id),next]});
    setNotice(publish?'Đã công bố thông tin cho phụ huynh.':'Đã lưu nháp. Nội dung phụ huynh đang xem được giữ nguyên.');
  }catch(e){setError(e instanceof Error?e.message:'Chưa lưu được nội dung.');}finally{setBusy(false);}
 }
 if(!data)return <div className="space-y-4"><p role={error?'alert':'status'}>{error || 'Đang tải lộ trình lớp…'}</p>{error && <Button onClick={()=>setRetry(n=>n+1)}>Thử lại</Button>}</div>;
 return <div className="space-y-6 [&_button]:min-h-11"><ConfirmDialog />
  <header><Link className="text-sm text-primary underline" href={admin?'/admin/learning':'/tutor/classes/'+classId}>Về {admin?'quản lý chương trình':'lớp học'}</Link><h1 className="mt-4 text-3xl font-black">{data.class.name}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Khung lớp định hướng việc học. Gia sư điều chỉnh mục tiêu, trọng tâm và nội dung thực tế; nhận xét học sinh thực hiện một lần trong tháng.</p></header>
  <nav className="flex flex-wrap gap-3" aria-label="Nội dung lớp"><Button variant={kind==='class'?'default':'outline'} onClick={()=>choose('class')} disabled={busy}>Lộ trình lớp</Button><Button variant={kind==='student'?'default':'outline'} disabled={busy || !data.students.length} onClick={()=>choose('student:'+data.students[0]?.student_id)}>Học sinh</Button><Button variant={kind==='session'?'default':'outline'} disabled={busy || !data.sessions.length} onClick={()=>choose('session:'+data.sessions[data.sessions.length-1]?.session_id)}>Nội dung buổi</Button><Link className="csat-btn text-sm" href={admin?'/admin/learning#monthly':'/tutor/reviews'}>Nhận xét tháng</Link></nav>
  {kind==='student' && <label className="block space-y-2 text-sm">Học sinh<select className={control} disabled={busy} value={subject||''} onChange={e=>choose('student:'+e.target.value)}>{data.students.map(s=><option key={s.student_id} value={s.student_id}>{s.name}</option>)}</select></label>}
  {kind==='session' && <label className="block space-y-2 text-sm">Buổi học<select className={control} disabled={busy} value={subject||''} onChange={e=>choose('session:'+e.target.value)}>{data.sessions.map(s=><option key={s.session_id} value={s.session_id}>{s.date} · {s.status==='cancelled'?'Đã hủy':s.status==='completed'?'Đã hoàn thành':'Theo lịch'}</option>)}</select></label>}
  {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
  {notice && <p role="status" className="rounded-lg border border-primary/25 p-4 text-sm">{notice}</p>}
  <div className="grid items-start gap-6 lg:grid-cols-2">
   <fieldset disabled={busy} className="min-w-0 space-y-5 rounded-2xl border bg-card p-5"><legend className="sr-only">Soạn nội dung</legend>
    {kind==='class' && <>
      <label className="block space-y-2 text-sm font-medium">Chương trình<select className={control} value={body.program||''} onChange={e=>{const program=e.target.value as LearningBody['program'];update({program,template_id:data.defaults.find(d=>d.program===program)?.template_id||null,stage_index:null});}}><option value="">Chưa xác nhận</option>{Object.entries(PROGRAMS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="block space-y-2 text-sm font-medium">Hình thức học<select className={control} value={body.format||''} onChange={e=>update({format:e.target.value as LearningBody['format']})}><option value="">Chọn hình thức</option><option value="group">Học nhóm</option><option value="individual">Học 1–1</option></select></label>
      <label className="block space-y-2 text-sm font-medium">Phiên bản giáo án<select className={control} value={body.template_id||''} onChange={e=>update({template_id:e.target.value||null,stage_index:null})}><option value="">Chưa có phiên bản</option>{data.templates.filter(t=>t.program===body.program).map(t=><option key={t.template_id} value={t.template_id}>{t.title} · v{t.version}</option>)}</select></label>
      <p className="text-xs leading-6 text-muted-foreground">Đổi template chỉ áp dụng khi bạn lưu. Lớp khác tiếp tục dùng phiên bản đã chọn.</p>
      <label className="block space-y-2 text-sm font-medium">Chặng đang tập trung<select className={control} value={body.stage_index ?? ''} onChange={e=>update({stage_index:e.target.value===''?null:Number(e.target.value)})}><option value="">Chưa ghi nhận</option>{template?.stages.map((s,i)=><option key={i} value={i}>{i+1}. {s.title}</option>)}</select></label>
    </>}
    {kind!=='session' ? <>
      <label className="block space-y-2 text-sm font-medium">Mục tiêu học tập<Textarea value={body.goal} maxLength={2000} onChange={e=>update({goal:e.target.value})} placeholder="Mục tiêu đã trao đổi và căn cứ lựa chọn…" /></label>
      <label className="block space-y-2 text-sm font-medium">Tìm trọng tâm<Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên kiến thức hoặc kỹ năng" /></label>
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">{REVIEW_TAGS.filter(t=>['knowledge','skill'].includes(t.group) && t.label.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(t=><label key={t.id} className="flex min-h-11 items-center gap-3 text-xs"><input type="checkbox" checked={body.focus_tags.includes(t.id)} onChange={e=>update({focus_tags:e.target.checked?[...body.focus_tags,t.id]:body.focus_tags.filter(id=>id!==t.id)})}/>{t.label}</label>)}</div>
      <label className="block space-y-2 text-sm font-medium">Bước rèn luyện tiếp theo<Textarea maxLength={2000} value={body.next_step} onChange={e=>update({next_step:e.target.value})}/></label>
      <p className="text-xs text-muted-foreground">Trọng tâm là nội dung cần luyện; không phải kết luận học sinh đã thành thạo.</p>
    </> : <>
      <label className="block space-y-2 text-sm font-medium">Chọn nội dung từ khung lớp<select className={control} value="" onChange={e=>{const t=data.records.find(r=>r.kind==='class');const tId=t?.draft.template_id;const selected=data.templates.find(x=>x.template_id===tId)?.stages.flatMap(s=>s.lessons)[Number(e.target.value)];if(selected)update({title:selected.title,content:selected.description});}}><option value="">Chọn để điền nội dung, sau đó điều chỉnh</option>{data.templates.find(t=>t.template_id===data.records.find(r=>r.kind==='class')?.draft.template_id)?.stages.flatMap(s=>s.lessons).map((l,i)=><option key={i} value={i}>Buổi {l.range} · {l.title}</option>)}</select></label>
      <label className="block space-y-2 text-sm font-medium">Tên nội dung<Input maxLength={200} value={body.title} onChange={e=>update({title:e.target.value})}/></label>
      <label className="block space-y-2 text-sm font-medium">Nội dung học và luyện tập<Textarea className="min-h-40" maxLength={5000} value={body.content} onChange={e=>update({content:e.target.value})}/></label>
      <label className="block space-y-2 text-sm font-medium">Nội dung cần tiếp tục<Textarea maxLength={2000} value={body.continuation} onChange={e=>update({continuation:e.target.value})}/></label>
      <p className="text-xs leading-6 text-muted-foreground">Ghi nội dung chung của buổi. Điểm danh được quản lý ở trang buổi học; không cần gắn thẻ đánh giá từng học sinh tại đây.</p>
    </>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={()=>save(false)}>Lưu bản nháp</Button><Button onClick={()=>save(true)}>Công bố cho phụ huynh</Button></div>
    <p className="text-xs text-muted-foreground">{busy?'Đang lưu…':dirty?'Có thay đổi chưa lưu.':record?.published_at?'Đã có bản công bố.':'Chưa công bố.'}</p>
   </fieldset>
   <aside className="min-w-0 space-y-5 rounded-2xl border border-foreground bg-card p-5 shadow-neo"><h2 className="font-bold">Phụ huynh sẽ thấy · Xem trước</h2>{kind==='class'?<Roadmap body={body} template={template}/>:kind==='student'?<div className="space-y-3"><h3 className="font-bold">{data.students.find(s=>s.student_id===subject)?.name}</h3><p className="whitespace-pre-wrap text-sm leading-7">{body.goal}</p><div className="flex flex-wrap gap-2">{body.focus_tags.map(id=><span className="rounded-lg bg-secondary p-2 text-xs" key={id}>{REVIEW_TAGS.find(t=>t.id===id)?.label}</span>)}</div><p className="whitespace-pre-wrap text-sm leading-7">{body.next_step}</p></div>:<div className="space-y-3"><h3 className="font-bold">{body.title || 'Chưa có tên nội dung'}</h3><p className="whitespace-pre-wrap text-sm leading-7">{body.content}</p>{body.continuation && <p className="whitespace-pre-wrap text-sm leading-7"><strong>Học tiếp: </strong>{body.continuation}</p>}</div>}</aside>
  </div>
 {admin && <AdminClassReviews classId={classId} month={month}/>}
 </div>;
}
