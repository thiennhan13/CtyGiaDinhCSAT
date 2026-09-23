import 'server-only';
import { createAdminClient } from '@/lib/supabase/service';
type MailJob = {outbox_id:string;lease_id:string;payload:Record<string,unknown>};
export function mailConfiguration(){
 const origin=process.env.APP_ORIGIN?.replace(/\/$/,'');
 const sender=process.env.CSAT_EMAIL_FROM,replyTo=process.env.CSAT_EMAIL_REPLY_TO;
 if(!origin || !/^https:\/\/[^/]+$/.test(origin) || !sender || /[\r\n]/.test(sender) || !replyTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) || !process.env.RESEND_API_KEY)
  throw new Error('Chưa đủ cấu hình gửi email.');
 return {origin,sender,replyTo,key:process.env.RESEND_API_KEY};
}
export async function processReviewEmails(prepare=false){
 // Defense in depth: callers cannot enable delivery from local or Preview.
 if(process.env.VERCEL_ENV!=='production')return {accepted:0,failed:0,disabled:true};
 const started=Date.now(),deadline=started+50000;
 const db=createAdminClient();
 async function work(action:string,data:Record<string,unknown>={}){
  const result=await db.rpc('review_email_work',{p_action:action,p_data:data}).abortSignal(AbortSignal.timeout(5000));
  if(result.error)throw new Error('Không xử lý được hàng đợi email.');
  return result.data;
 }
 if((await work('status'))?.disabled)return {accepted:0,failed:0,disabled:true};
 const config=mailConfiguration();
 if(prepare)await work('prepare',{origin:config.origin,sender:config.sender,reply_to:config.replyTo});
 let accepted=0,failed=0,processed=0,emptyPass=false;
 // Reserve 26s for admin reconciliation, claim, provider timeout and final persistence.
 while(processed<35 && Date.now()+26000<deadline){
  await work('admin');
  const job=await work('claim') as MailJob|null;
  if(!job?.outbox_id){
   // Claim can skip the last obsolete tutor job; materialize its digest in this pass.
   await work('admin');
   if(emptyPass)break;
   emptyPass=true;
   continue;
  }
  emptyPass=false;
  let providerId:string|null=null,errorCode:string|null=null;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',
    headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'csat-review-'+job.outbox_id},
    body:JSON.stringify(job.payload),signal:AbortSignal.timeout(10000)});
   const body=await response.json().catch(()=>null);
   if(response.ok && typeof body?.id==='string')providerId=body.id;
   else errorCode='provider_http_'+response.status;
  }catch{errorCode='transport_uncertain';}
  const finished=await work('finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:providerId?'accepted':'failed',provider_id:providerId,error_code:errorCode});
  if(!finished?.updated)throw new Error('Chưa ghi được kết quả email; tải lại trạng thái trước khi thử tiếp.');
  if(providerId)accepted++;else failed++;
  processed++;
  await new Promise(resolve=>setTimeout(resolve,550));
 }
 if(Date.now()+5000<deadline)await work('admin');
 // Counts only; never log recipients, payloads, keys or provider bodies.
 console.info('review_email_batch',{accepted,failed,processed,duration_ms:Date.now()-started});
 return {accepted,failed,processed};
}
