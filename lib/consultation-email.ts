import 'server-only';
import { createAdminClient } from '@/lib/supabase/service';
import type { ConsultationInput } from './consultations';
import { consultationRoles } from './consultations';
import { levels, goals, programs } from './public-learning';
export function consultationMailPayload(input:ConsultationInput) {
 const level=input.level==='undecided'?'Cần trao đổi thêm':levels[input.level];
 const program=input.program==='consultation'?'Tư vấn riêng':input.program==='hsgqg'?'Định hướng HSG Quốc gia':programs[input.program].name;
 const submitted=new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
 return {to:['csattutor@gmail.com'],subject:`[CSAT] Yêu cầu tư vấn ${input.request_id}`,
  text:[`Mã yêu cầu: ${input.request_id}`,`Thời gian: ${submitted} (Việt Nam)`,`Người gửi: ${consultationRoles[input.role]}`,`Tên liên hệ: ${input.name}`,`Điện thoại: ${input.phone}`,`Email: ${input.email||'Không cung cấp'}`,`Cấp học: ${level}`,`Lớp / năm học: ${input.school_year||'Chưa cung cấp'}`,`Mục tiêu: ${goals[input.goal]}`,`Hướng học: ${program}`,'',input.message||'Chưa có lời nhắn.','','Người gửi đã đồng ý lưu thông tin và liên hệ tư vấn.',...(/^https:\/\/[^/]+$/.test(process.env.APP_ORIGIN||'')?['Quản lý yêu cầu: '+process.env.APP_ORIGIN+'/admin/consultations']:[])].join('\n'),
  ...(input.email?{reply_to:input.email}:{}),
 };
}
export async function sendConsultationEmail(requestId:string,deadline=Date.now()+20000) {
 // Explicit release switches: local and Vercel previews can never send real email.
 if(process.env.VERCEL_ENV!=='production'||process.env.CONSULTATIONS_EMAIL_ENABLED!=='true')return {state:'disabled'};
 const sender=process.env.CSAT_EMAIL_FROM,key=process.env.RESEND_API_KEY;
 if(!sender||!key)return {state:'unconfigured'};
 if(Date.now()+18000>deadline)return {state:'deferred'};
 const db=createAdminClient();
 const claim=await db.rpc('claim_consultation_email',{p_id:requestId,p_sender:sender}).abortSignal(AbortSignal.timeout(3000));
 if(claim.error)throw new Error('Email claim failed');
 if(!claim.data)return {state:'not_claimed'};
 const job=claim.data as {lease_id:string;payload:Record<string,unknown>};
 let provider:string|null=null,error:string|null=null;
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`csat-consultation-${requestId}`},body:JSON.stringify(job.payload),signal:AbortSignal.timeout(10000)});
  const body=await response.json().catch(()=>null);
  if(response.ok&&typeof body?.id==='string')provider=body.id;else error=`provider_http_${response.status}`;
 }catch{error='transport_uncertain';}
 const finished=await db.rpc('finish_consultation_email',{p_id:requestId,p_lease:job.lease_id,p_provider:provider,p_error:error}).abortSignal(AbortSignal.timeout(4000));
 if(finished.error||!finished.data)throw new Error('Email result persistence failed');
 return {state:provider?'accepted':'failed'};
}
