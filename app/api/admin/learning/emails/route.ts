import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { mailConfiguration, processReviewEmails } from '@/lib/review-email';
export const runtime='nodejs';
export const maxDuration=60;
const month=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('drain')}).strict(),
 z.object({action:z.literal('preview'),month}).strict(),
 z.object({action:z.literal('prepare'),month,request_id:z.uuid(),token:z.string().regex(/^[a-f0-9]{32}$/)}).strict(),
]);
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const session=await businessSession();if(session.response)return session.response;
 const result=await session.supabase.rpc('review_email_overview');
 return result.error?businessError(result.error):reply(result.data);
}
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const raw=await request.text();
 let body:unknown;try{body=raw?JSON.parse(raw):{action:'drain'};}catch{return reply({error:'Dữ liệu không hợp lệ.'},422);}
 const parsed=schema.safeParse(body);if(!parsed.success)return reply({error:'Dữ liệu không hợp lệ.'},422);
 const input=parsed.data;
 if(input.action==='preview'){
  const result=await session.supabase.rpc('review_email_work',{p_action:'preview',p_data:{month:input.month}});
  return result.error?businessError(result.error):reply(result.data);
 }
 if(process.env.VERCEL_ENV!=='production')return reply({error:'Gửi email chỉ được bật trên production.'},422);
 try{
  if(input.action==='prepare'){
   const config=mailConfiguration();
   const result=await session.supabase.rpc('review_email_work',{p_action:'prepare_manual',p_data:{...input,origin:config.origin,sender:config.sender,reply_to:config.replyTo}});
   return result.error?businessError(result.error):reply(result.data);
  }
  return reply(await processReviewEmails(false));
 }catch{return reply({error:'Chưa xử lý được email. Kiểm tra cấu hình và nhật ký.'},503);}
}
