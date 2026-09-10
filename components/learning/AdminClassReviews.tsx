'use client';
import {useEffect,useState,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useConfirm} from '@/components/ui/use-dialog';
import {ReviewContent} from '@/components/reviews/ReviewContent';
import type {StudentReview} from '@/lib/student-reviews';
export function AdminClassReviews({classId,month}:{classId:string;month:string}){
 const [rows,setRows]=useState<(StudentReview & {student_name:string;tutor_name:string})[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[messages,setMessages]=useState<Record<string,string>>({});
 const keys=useRef(new Map<string,string>());
 const {confirm,ConfirmDialog}=useConfirm();
 async function load(){const r=await fetch('/api/admin/learning/reviews?class_id='+classId+'&month='+month,{cache:'no-store'});const p=await r.json();if(!r.ok)throw Error(p.error);setRows(p);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[classId,month]);
 async function save(row:StudentReview,action:'correction'|'reassign_draft'){
  const message=messages[row.review_id]||'';
  if(!await confirm({title:action==='correction'?'Công bố đính chính':'Chuyển bản nháp cho gia sư hiện tại',description:action==='correction'?'Nội dung đính chính sẽ hiển thị cùng nhận xét gốc cho phụ huynh. Lịch sử được giữ nguyên.':'Giữ nội dung nháp và ghi lại việc đổi người phụ trách; gia sư hiện tại có thể tiếp tục hoàn thiện.',confirmText:'Xác nhận',cancelText:'Xem lại'}))return;
  const signature=JSON.stringify([row.review_id,action,message]);const requestId=keys.current.get(signature)||crypto.randomUUID();keys.current.set(signature,requestId);
  setBusy(true);setError('');try{const r=await fetch('/api/admin/learning/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,review_id:row.review_id,request_id:requestId,message})});const p=await r.json();if(!r.ok)throw Error(p.error);await load();setMessages(v=>({...v,[row.review_id]:''}));}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được.');}finally{setBusy(false);}
 }
 return <section className="space-y-4 rounded-2xl border bg-card p-5"><ConfirmDialog/><h2 className="text-xl font-bold">Nhận xét và đính chính · {month}</h2>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{rows.map(r=><details className="rounded-xl border p-4" key={r.review_id}><summary className="cursor-pointer text-sm font-bold">{r.student_name} · {r.review_status==='published'?'Đã gửi':'Bản nháp'} · {r.tutor_name}</summary><div className="mt-4 space-y-4"><ReviewContent review={r}/>{r.review_status==='published'?<><label className="block space-y-2 text-sm">Thông tin đính chính cho phụ huynh<Textarea maxLength={3000} value={messages[r.review_id]||''} onChange={e=>setMessages(v=>({...v,[r.review_id]:e.target.value}))}/></label><Button disabled={busy || !messages[r.review_id]?.trim()} onClick={()=>save(r,'correction')}>Công bố đính chính</Button></>:<Button variant="outline" disabled={busy} onClick={()=>save(r,'reassign_draft')}>Chuyển nháp cho gia sư hiện tại</Button>}</div></details>)}{!rows.length && <p className="text-sm text-muted-foreground">Chưa có nhận xét trong tháng đã chọn.</p>}</section>;
}
