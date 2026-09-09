'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card';
import { postBusiness } from '@/lib/business-client';
import type { BillingReport,BillingPayment } from '@/lib/billing-report';
type Preview={previewToken:string;tuition_delta:number;csat_delta:number;net_delta:number};
type Adjustment={adjustment_id:string;item_id:string;reason:string;tuition_delta:number;created_at:string;reversal_of:string|null};
type Event={event_id:string;kind:string;amount:number;reason:string;occurred_at:string;reversal_of:string|null};
export function BillingLedgerTools({report,payments,onUpdated}:{report:BillingReport&{adjustments?:Adjustment[]};payments:BillingPayment[];onUpdated:()=>void}){
 const rows=report.sessions.flatMap(s=>s.attendance.filter(a=>a.item_id).map(a=>({...a,date:s.date,class_name:s.class_name})));
 const [itemId,setItemId]=useState(''),[status,setStatus]=useState<'attended'|'absent'>('attended'),[fee,setFee]=useState('0');
 const [reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[reverseId,setReverseId]=useState<string>();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const money=(n:number)=>n.toLocaleString('vi-VN')+' đồng';
 async function prepare(reverse?:Adjustment){
   setBusy(true);setMessage('');setPreview(null);
   try{
    const target=reverse?.item_id??itemId;if(!target)throw new Error('Chọn dòng cần điều chỉnh.');
    const row=rows.find(r=>r.item_id===target);if(!row)throw new Error('Chi tiết không còn khả dụng.');
    if(reverse){setItemId(target);setStatus(row.status);setFee(String(row.fee));setReverseId(reverse.adjustment_id);}
    const result=await postBusiness<Preview>('/api/admin/billing/adjustments',{action:'preview',itemId:target,
      status:reverse?row.status:status,fee:reverse?row.fee:Number(fee),reverseId:reverse?.adjustment_id??reverseId});
    setPreview(result);
   }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 async function apply(){
   if(!preview||!reason.trim())return;setBusy(true);setMessage('');
   try{await postBusiness('/api/admin/billing/adjustments',{action:'apply',itemId,status,fee:Number(fee),reason,previewToken:preview.previewToken,reverseId});
     setPreview(null);setReason('');setReverseId(undefined);onUpdated();setMessage('Đã ghi nhận điều chỉnh; dữ liệu gốc được giữ nguyên.');
   }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 async function reverseReceipt(payment:BillingPayment,event:Event){
   if(!reason.trim()){setMessage('Nhập lý do trước khi đảo giao dịch ghi nhận sai.');return;}
   setBusy(true);setMessage('');
   try{await postBusiness('/api/admin/billing/payments',{paymentId:payment.payment_id,expectedBalance:payment.balance,reverseEventId:event.event_id,reason});onUpdated();}
   catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 return <Card><CardHeader><CardTitle>Điều chỉnh và lịch sử giao dịch</CardTitle></CardHeader><CardContent className="space-y-4">
  <div className="space-y-2"><Label htmlFor="ledger-reason">Lý do điều chỉnh hoặc đảo giao dịch</Label>
   <Input id="ledger-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000}/></div>
  {report.period?.source==='ledger'&&<>
   <div className="grid gap-3 md:grid-cols-3">
    <div><Label htmlFor="ledger-item">Buổi học và học sinh</Label><select id="ledger-item" className="mt-2 w-full rounded border bg-background p-2" value={itemId}
     onChange={e=>{const row=rows.find(r=>r.item_id===e.target.value);setItemId(e.target.value);setStatus(row?.status??'attended');setFee(String(row?.fee??0));setPreview(null);setReverseId(undefined);}}>
     <option value="">Chọn chi tiết</option>{rows.map(r=><option key={r.item_id} value={r.item_id!}>{r.date} · {r.class_name} · {r.student_name}</option>)}</select></div>
    <div><Label htmlFor="ledger-status">Trạng thái đúng</Label><select id="ledger-status" className="mt-2 w-full rounded border bg-background p-2" value={status}
     onChange={e=>{setStatus(e.target.value as 'attended'|'absent');setPreview(null);setReverseId(undefined);}}><option value="attended">Có mặt</option><option value="absent">Vắng</option></select></div>
    <div><Label htmlFor="ledger-fee">Đơn giá đúng</Label><Input id="ledger-fee" className="mt-2" type="number" min="0" step="0.01" value={fee}
     onChange={e=>{setFee(e.target.value);setPreview(null);setReverseId(undefined);}}/></div>
   </div>
   <Button variant="outline" disabled={busy||!itemId} onClick={()=>prepare()}>Xem trước điều chỉnh</Button>
   {preview&&<div className="rounded border p-3 space-y-2" aria-live="polite">
     <p>Học phí: {money(preview.tuition_delta)} · CSAT: {money(preview.csat_delta)} · Lương gia sư: {money(preview.net_delta)}</p>
     <Button disabled={busy||!reason.trim()} onClick={apply}>Xác nhận {reverseId?'đảo khoản điều chỉnh':'điều chỉnh'}</Button></div>}
   {(report.adjustments??[]).map((a,index,all)=><div key={a.adjustment_id} className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
     <span>{a.reason} · {money(a.tuition_delta)}</span>
     {!a.reversal_of&&!all.slice(0,index).some(other=>other.item_id===a.item_id)&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>prepare(a)}>Xem trước đảo khoản</Button>}
   </div>)}
  </>}
  {payments.map(payment=><div key={payment.payment_id} className="space-y-2">
   {((payment as BillingPayment&{events?:Event[]}).events??[]).map((event,_index,all)=><div key={event.event_id} className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
    <span>{payment.students.name??'Không còn liên kết học sinh'} · {event.reason} · {money(event.amount)} · {new Date(event.occurred_at).toLocaleString('vi-VN')}</span>
    {event.kind!=='reversal'&&!all.some(e=>e.reversal_of===event.event_id)&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>reverseReceipt(payment,event)}>Đảo ghi nhận sai</Button>}
   </div>)}
  </div>)}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </CardContent></Card>;
}
