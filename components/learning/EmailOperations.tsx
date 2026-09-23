'use client';
import { useCallback,useEffect,useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmailReconciliation,type Reconciliation } from './EmailReconciliation';
import { mailStatuses } from '@/lib/consultations';
type Job={outbox_id:string;month:string;kind:string;recipient:string;status:string;error_code:string|null;attempts:number;next_attempt_at?:string;email_reconciliations?:Reconciliation[]};
type Run={month:string;created_at:string;total:number;accepted:number;pending:number;needs_review:number;digest_missing:boolean};
type Overview={month:string;recovery_month:string;missing_run:boolean;runs:Run[]};
type Preview={month:string;token:string;allowed:boolean;existing:boolean;disabled:boolean;previewed_at:string;queue:{class_id:string;student_id:string;student_name:string;class_name:string;tutor_name:string|null;status:string;actionable:boolean}[]};
export function EmailOperations({emails,onRefresh}:{emails:Job[];onRefresh:()=>Promise<void>}){
 const [overview,setOverview]=useState<Overview|null>(null),[month,setMonth]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const r=await fetch('/api/admin/learning/emails',{cache:'no-store'}),p=await r.json();if(!r.ok)throw Error(p.error);setOverview(p);setMonth(v=>v||p.recovery_month);},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 async function refresh(){await Promise.all([load(),onRefresh()]);}
 async function act(action:'preview'|'prepare'|'drain'){
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/admin/learning/emails',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='drain'?{}:{month}),...(action==='prepare'?{token:preview?.token,request_id:requestId}:{})})}),p=await r.json();if(!r.ok)throw Error(p.error);
   if(action==='preview'){setPreview(p);setRequestId(crypto.randomUUID());}
   else{setPreview(null);setNotice(p.disabled?'Email đang tắt; chưa xử lý hàng đợi.':action==='prepare'?(p.existing?'Đợt đã tồn tại. Có thể tiếp tục xử lý thư đang chờ.':'Đã tạo đợt. Chọn “Xử lý thư đang chờ” để gửi.'):`Nhà cung cấp tiếp nhận ${p.accepted} thư; ${p.failed} lần gửi lỗi. Xem nhật ký bên dưới.`);await refresh();}
  }catch(e){setError(e instanceof Error?e.message:'Chưa xử lý được.');}finally{setBusy(false);}
 }
 return <section className="space-y-4 rounded-2xl border bg-card p-5"><h2 className="text-xl font-bold">Đợt nhắc và nhật ký email</h2>
 <p className="text-sm text-muted-foreground">Ngày 28, dự kiến từ 08:00–08:59 giờ Việt Nam trên Hobby. Admin kiểm tra sau 09:00. Nhà cung cấp tiếp nhận chưa có nghĩa thư đã tới hộp thư hoặc được đọc.</p>
 {overview?.missing_run&&<p role="status" className="rounded-lg border p-3">Chưa có đợt nhắc tháng {overview.month}. Xem trước để phục hồi nếu đủ điều kiện.</p>}
 <div className="space-y-2">{overview?.runs.map(r=><p key={r.month} className="border-b py-2 text-sm">{r.month} · {r.needs_review?'Cần kiểm tra':r.pending||r.digest_missing?'Đang xử lý':'Đã xử lý hết'} · {r.accepted}/{r.total} thư được tiếp nhận · {r.pending} thư chờ xử lý{r.digest_missing?' · Chưa đủ tổng hợp admin':''}<br/><span className="text-muted-foreground">Lập lúc {new Date(r.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (VN)</span></p>)}</div>
 <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Tháng cần kiểm tra<input type="month" className="mt-2 block min-h-11 rounded-lg border bg-background px-3" value={month} onChange={e=>{setMonth(e.target.value);setPreview(null);}}/></label><Button variant="outline" disabled={busy||!month} onClick={()=>void act('preview')}>Xem trước đợt nhắc</Button><Button disabled={busy} onClick={()=>void act('drain')}>Xử lý thư đang chờ</Button></div>
 {preview&&<div className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">Danh sách hiện tại · {preview.month}</h3><p className="text-sm">{preview.queue.length} học sinh/lớp · {preview.queue.filter(x=>x.status!=='published'&&x.actionable).length} nhận xét cần nhắc. Danh sách sẽ được kiểm tra lại khi tạo đợt.</p><div className="max-h-72 overflow-auto">{preview.queue.map(x=><p className="border-b py-2 text-sm" key={x.class_id+x.student_id}>{x.student_name} · {x.class_name} · {x.tutor_name||'Chưa phân gia sư'} · {!x.actionable?'Cần kiểm tra phân công':x.status==='published'?'Đã công bố':x.status==='draft'?'Bản nháp':'Chưa viết'}</p>)}</div>{preview.existing?<p>Đợt đã tồn tại; tiếp tục xử lý hàng đợi, không tạo lại.</p>:!preview.allowed?<p>Chỉ phục hồi từ 08:00 ngày 28 đến cuối tháng, hoặc tháng liền trước trong ngày 1–7.</p>:preview.disabled?<p>Bật cấu hình email tháng trước khi tạo đợt.</p>:<><p className="text-sm">Xác nhận sẽ lưu đợt với danh sách hiện tại. Thao tác này chưa gửi email; gửi qua nút xử lý hàng đợi.</p><Button disabled={busy} onClick={()=>void act('prepare')}>Xác nhận tạo đợt {preview.month}</Button></>}</div>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {emails.map(e=><div key={e.outbox_id} className="flex flex-wrap justify-between gap-2 border-b py-3 text-sm"><span className="break-all">{e.month} · {e.kind==='tutor'?'Gia sư':'Admin'} · {e.recipient}</span><span>{e.status==='skipped'?'Bỏ qua':mailStatuses[e.status as keyof typeof mailStatuses]||e.status} · {e.attempts} lần{e.error_code&&' · '+e.error_code}</span>{e.next_attempt_at&&e.status==='failed'&&<p className="w-full text-muted-foreground">Có thể thử lại từ {new Date(e.next_attempt_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (VN), nếu còn đủ điều kiện.</p>}{['failed','manual_review','skipped'].includes(e.status)&&e.error_code!=='already_completed'&&<EmailReconciliation kind="review" id={e.outbox_id} notes={e.email_reconciliations} onSaved={refresh}/>}</div>)}{!emails.length&&<p className="text-sm">Chưa phát sinh lượt gửi email.</p>}
 </section>;
}
