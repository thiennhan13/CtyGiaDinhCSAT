import 'server-only';
import { createAdminClient } from '@/lib/supabase/service';
type MailJob = {outbox_id:string;lease_id:string;payload:Record<string,unknown>};
export function mailConfiguration(){
 const origin=process.env.APP_ORIGIN?.replace(/\/$/,'');
 if(!origin || !/^https:\/\/[^/]+$/.test(origin) || !process.env.CSAT_EMAIL_FROM || !process.env.RESEND_API_KEY)
  throw new Error('Chưa đủ cấu hình gửi email.');
 return {origin,sender:process.env.CSAT_EMAIL_FROM,key:process.env.RESEND_API_KEY};
}
export async function processReviewEmails(prepare=false){
 const db=createAdminClient();
 async function work(action:string,data:Record<string,unknown>={}){
  const result=await db.rpc('review_email_work',{p_action:action,p_data:data});
  if(result.error)throw new Error('Không xử lý được hàng đợi email.');
  return result.data;
 }
 if((await work('status'))?.disabled)return {accepted:0,failed:0,disabled:true};
 const config=mailConfiguration();
 if(prepare)await work('prepare',{origin:config.origin,sender:config.sender});
 const started=Date.now();let accepted=0,failed=0;
 // Bounded processing; remaining jobs stay in the database for an authenticated retry.
 for(let i=0;i<35 && Date.now()-started<45000;i++){
  await work('admin');
  const job=await work('claim') as MailJob|null;
  if(!job || !job.outbox_id)break;
  let providerId:string|null=null,errorCode:string|null=null;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',
    headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'csat-review-'+job.outbox_id},
    body:JSON.stringify(job.payload),signal:AbortSignal.timeout(10000)});
   const body=await response.json().catch(()=>null);
   if(response.ok && typeof body?.id==='string')providerId=body.id;
   else errorCode='provider_http_'+response.status;
  }catch{errorCode='transport_uncertain';}
  await work('finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:providerId?'accepted':'failed',provider_id:providerId,error_code:errorCode});
  if(providerId)accepted++;else failed++;
  await new Promise(resolve=>setTimeout(resolve,550));
 }
 return {accepted,failed};
}
