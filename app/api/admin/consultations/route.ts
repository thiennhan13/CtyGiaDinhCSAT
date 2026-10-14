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
 const params=new URL(request.url).searchParams;
 const status=params.get('status'),course=params.get('course');
 const offset=Math.max(0,Math.min(100000,Math.floor(Number(params.get('offset'))||0)));
 let query=session.supabase.from('consultation_requests').select('request_id,data,created_at,status,revision,updated_at,consultation_status_history(old_status,new_status,revision,created_at)',{count:'exact'}).order('created_at',{ascending:false}).order('request_id').range(offset,offset+49);
 if(status&&['new','contacted','completed'].includes(status))query=query.eq('status',status);
 if(course&&['undecided','A','B','C','E','K'].includes(course))query=query.eq('data->>course',course);
 const [result,newCount,contactedCount]=await Promise.all([query,session.supabase.from('consultation_requests').select('request_id',{count:'exact',head:true}).eq('status','new'),session.supabase.from('consultation_requests').select('request_id',{count:'exact',head:true}).eq('status','contacted')]);
 if(result.error)return businessError(result.error);
 return NextResponse.json({data:result.data,total:result.count,newCount:newCount.count,contactedCount:contactedCount.count},{headers:{'Cache-Control':'private, no-store'}});
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
