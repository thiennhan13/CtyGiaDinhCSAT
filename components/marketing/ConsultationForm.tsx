'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { consultationSchema, consultationRoles } from '@/lib/consultations';
import { levels, goals, recommendedProgram } from '@/lib/learning-guidance';
export function ConsultationForm({ level, goal, onSelection }: {level:string; goal:string; onSelection:(key:string,value:string)=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const requestRef=useRef<{id:string;fingerprint:string}|null>(null),messageRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const scrollToForm=()=>{if(window.location.hash==='#tu-van')requestAnimationFrame(()=>document.getElementById('tu-van')?.scrollIntoView({block:'start'}));};
  scrollToForm();window.addEventListener('hashchange',scrollToForm);
  return()=>window.removeEventListener('hashchange',scrollToForm);
 },[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault(); if(busy)return;
  const form=event.currentTarget, data=Object.fromEntries(new FormData(form));
  const payload={...data,level:level||'undecided',goal,program:recommendedProgram(level,goal),consent:data.consent==='on'};
  const fingerprint=JSON.stringify(payload);
  if(!requestRef.current || requestRef.current.fingerprint!==fingerprint)requestRef.current={id:crypto.randomUUID(),fingerprint};
  const parsed=consultationSchema.safeParse({...payload,request_id:requestRef.current.id});
  if(!parsed.success){setError(parsed.error.issues[0].message);setTimeout(()=>messageRef.current?.focus(),0);return;}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/consultations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data),signal:AbortSignal.timeout(20000)});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Chưa gửi được yêu cầu. Vui lòng thử lại.');
   setSuccess(body.request_id);setTimeout(()=>messageRef.current?.focus(),0);
  }catch(e){setError(e instanceof Error && e.name!=='TimeoutError' && e.name!=='TypeError'?e.message:'Kết nối gián đoạn. Thông tin vẫn được giữ; bạn có thể gửi lại.');setTimeout(()=>messageRef.current?.focus(),0);}
  finally{setBusy(false);}
 }
 return <section id="tu-van" className="public-wrap public-section public-consultation"><div><p className="public-kicker">Cùng chọn bước tiếp theo</p><h2>Cá nhân hóa lộ trình<br />của bạn với CSAT.</h2><p>Chia sẻ điều bạn đang học và mục tiêu muốn hướng tới. CSAT sẽ liên hệ để trao đổi về điểm bắt đầu, nội dung cần củng cố và hướng học phù hợp.</p><p>Thông tin chỉ dùng để tiếp nhận và liên hệ tư vấn học tập. Bạn không cần tạo tài khoản.</p><p className="public-section-note">Các mục có dấu * là bắt buộc. Chưa có mục tiêu cụ thể? Hãy chọn “Chưa rõ, cần tư vấn”.</p></div>
 {success?<div className="public-success" ref={messageRef} tabIndex={-1} role="status"><CheckCircle2 size={36}/><h3>CSAT đã nhận yêu cầu tư vấn của bạn.</h3><p>Trung tâm sẽ liên hệ qua thông tin bạn đã cung cấp.</p><p>Mã yêu cầu: <span className="break-all">{success}</span></p></div>:<form onSubmit={submit} aria-label="Thông tin tư vấn học tập">
 {error&&<div ref={messageRef} tabIndex={-1} role="alert" className="public-form-message public-form-error">{error}</div>}
 <fieldset disabled={busy} className="public-form-grid border-0 p-0 m-0 min-w-0">
 <label className="public-field">Bạn là *<select name="role" required defaultValue="parent">{Object.entries(consultationRoles).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label className="public-field">Tên liên hệ *<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
 <label className="public-field">Số điện thoại *<input name="phone" aria-label="Số điện thoại *" aria-describedby="consultation-phone-hint" type="tel" autoComplete="tel" required maxLength={30} placeholder="0912 345 678"/><small id="consultation-phone-hint">Số di động Việt Nam để CSAT liên hệ.</small></label>
 <label className="public-field">Email (không bắt buộc)<input name="email" type="email" autoComplete="email" maxLength={254}/></label>
 <label className="public-field">Cấp học *<select required value={level||'undecided'} onChange={e=>onSelection('level',e.target.value)}><option value="undecided">Cần trao đổi thêm</option>{Object.entries(levels).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label className="public-field">Mục tiêu ôn luyện *<select required value={goal} onChange={e=>onSelection('goal',e.target.value)}>{Object.entries(goals).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label className="public-field public-form-full">Lớp / năm học hiện tại (không bắt buộc)<input name="school_year" maxLength={50} placeholder="Ví dụ: lớp 8, lớp 10, năm 1"/></label>
 <label className="public-field public-form-full">Bạn đã học gì và muốn được hỗ trợ điều gì?<textarea name="message" aria-label="Bạn đã học gì và muốn được hỗ trợ điều gì?" aria-describedby="consultation-message-hint" maxLength={2000} rows={5} placeholder="Kinh nghiệm lập trình, mục tiêu kỳ thi, phần còn vướng hoặc câu hỏi dành cho CSAT…"/><small id="consultation-message-hint">Tối đa 2.000 ký tự. Không cần cung cấp giấy tờ hay địa chỉ nhà.</small></label>
 <div className="public-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <label className="public-consent public-form-full"><input type="checkbox" name="consent" required/><span>Tôi đồng ý để CSAT lưu thông tin và liên hệ tư vấn học tập theo yêu cầu này. *</span></label>
 <button type="submit" className="public-button public-form-full">{busy?'Đang gửi yêu cầu…':'Gửi yêu cầu tư vấn'}<ArrowRight size={18}/></button>
 </fieldset></form>}
 </section>;
}
