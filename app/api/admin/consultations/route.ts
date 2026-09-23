import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { sendConsultationEmail } from '@/lib/consultation-email';
export const runtime='nodejs';
export const maxDuration=30;
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('status'),request_id:z.uuid(),status:z.enum(['new','contacted','completed']),revision:z.number().int().positive()}).strict(),
 z.object({action:z.literal('retry'),request_id:z.uuid()}).strict(),
]);
export async function GET(request:Request){
 const session=await businessSession();if(session.response)return session.response;
 const params=new URL(request.url).searchParams,status=params.get('status'),mail=params.get('mail');
 const offset=Math.max(0,Math.min(100000,Number(params.get('offset'))||0));
 let query=session.supabase.from('consultation_requests').select(`request_id,data,created_at,status,revision,updated_at,consultation_email_outbox${mail?'!inner':''}(status,attempts,error_code,accepted_at,next_attempt_at,email_reconciliations(outcome,note,created_at))`,{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+49);
 if(status&&['new','contacted','completed'].includes(status))query=query.eq('status',status);
 if(mail&&['queued','sending','accepted','failed','manual_review'].includes(mail))query=query.eq('consultation_email_outbox.status',mail);
 const [result,newCount,contactedCount]=await Promise.all([query,session.supabase.from('consultation_requests').select('request_id',{count:'exact',head:true}).eq('status','new'),session.supabase.from('consultation_requests').select('request_id',{count:'exact',head:true}).eq('status','contacted')]);
 if(result.error)return businessError(result.error);
 return NextResponse.json({data:result.data,total:result.count,newCount:newCount.count,contactedCount:contactedCount.count,configurationMissing:['CSAT_EMAIL_FROM','RESEND_API_KEY'].filter(k=>!process.env[k]),emailEnabled:process.env.VERCEL_ENV==='production'&&process.env.CONSULTATIONS_EMAIL_ENABLED==='true'&&!!process.env.RESEND_API_KEY&&!!process.env.CSAT_EMAIL_FROM},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Yêu cầu không hợp lệ.'},{status:422});
 const data=parsed.data;
 if(data.action==='status'){
  const result=await session.supabase.rpc('update_consultation_status',{p_id:data.request_id,p_status:data.status,p_revision:data.revision});
  return result.error?businessError(result.error):NextResponse.json({ok:true});
 }
 try{return NextResponse.json(await sendConsultationEmail(data.request_id));}catch{return NextResponse.json({error:'Chưa xử lý được email. Vui lòng tải lại trạng thái trước khi thử tiếp.'},{status:503});}
}
