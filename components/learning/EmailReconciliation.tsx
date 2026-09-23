'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
export type Reconciliation={outcome:string;note:string;created_at:string};
export function EmailReconciliation({kind,id,notes=[],onSaved}:{kind:'review'|'consultation';id:string;notes?:Reconciliation[];onSaved:()=>Promise<void>}){
 const [note,setNote]=useState(''),[outcome,setOutcome]=useState('checked'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const resolved=notes.some(n=>n.outcome!=='checked');
 return <details className="w-full text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{resolved?'Đã đối chiếu và xử lý':'Đối chiếu email'}</summary>
 <p className="mb-3 text-muted-foreground">Kiểm tra Portal và Resend trước khi ghi kết quả. Ghi chú không gửi thêm email và giữ nguyên nhật ký gửi.</p>
 {notes.map((n,i)=><p key={i} className="my-2 whitespace-pre-wrap break-words border-l-2 pl-3">{new Date(n.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (VN) · {n.outcome==='checked'?'Đã kiểm tra, còn theo dõi':n.outcome==='handled_elsewhere'?'Đã xử lý qua kênh khác':'Đã xác nhận với nhà cung cấp'}<br/>{n.note}</p>)}
 {!resolved&&<fieldset disabled={busy} className="space-y-3"><label className="block">Kết quả<select aria-label="Kết quả đối chiếu" className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3" value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="checked">Đã kiểm tra, tiếp tục theo dõi</option><option value="handled_elsewhere">Đã xử lý qua kênh khác, dừng thử gửi</option><option value="provider_confirmed">Đã xác nhận thư trên Resend, dừng thử gửi</option></select></label><label className="block">Ghi chú<Textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="Kết quả kiểm tra và cách đã xử lý"/></label><Button disabled={busy||note.trim().length<3} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/admin/emails/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id,outcome,note})});const p=await r.json();if(!r.ok)throw Error(p.error);setNote('');await onSaved();}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được.');}finally{setBusy(false);}}}>Lưu đối chiếu</Button></fieldset>}
 {error&&<p role="alert">{error}</p>}</details>;
}
