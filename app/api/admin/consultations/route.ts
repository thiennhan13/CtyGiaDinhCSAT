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
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const filters=z.object({
 status:z.enum(['','new','contacted','completed']).default(''),
 course:z.enum(['','undecided','A','B','C','E','K']).default(''),
 source:z.enum(['','enrollment','roadmap','legacy']).default(''),
 q:z.string().trim().max(100).regex(/^[\p{L}\p{M}\d\s+.-]*$/u).default(''),
 from:day.or(z.literal('')).default(''),to:day.or(z.literal('')).default(''),
 offset:z.coerce.number().int().min(0).max(100000).default(0),
}).strict().refine(v=>!v.from||!v.to||v.from<=v.to,{message:'Khoảng thời gian không hợp lệ.'});
export async function GET(request:Request){
 const session=await businessSession();if(session.response)return session.response;
 const parsed=filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!parsed.success)return NextResponse.json({error:'Bộ lọc không hợp lệ. Kiểm tra từ khóa và khoảng ngày.'},{status:422,headers:{'Cache-Control':'private, no-store'}});
 const {status,course,source,q,from,to,offset}=parsed.data;
 let query=session.supabase.from('consultation_requests').select('request_id,data,created_at,status,revision,updated_at,consultation_status_history(old_status,new_status,revision,created_at)',{count:'exact'}).order('created_at',{ascending:false}).order('request_id').range(offset,offset+49);
 if(status&&['new','contacted','completed'].includes(status))query=query.eq('status',status);
 if(course&&['undecided','A','B','C','E','K'].includes(course))query=query.eq('data->>course',course);
 if(source==='enrollment')query=query.eq('data->>source_path','/dang-ky-hoc');
 if(source==='roadmap')query=query.like('data->>source_path','/lo-trinh%');
 if(source==='legacy')query=query.is('data->>source_path',null);
 if(q){
  // Whitelist above excludes PostgREST expression delimiters and wildcard injection.
  const digits=q.replace(/[\s+.-]/g,'').replace(/^(?:0084|84)(?=\d{9}$)/,'0');
  query=/^\d+$/.test(digits)?query.ilike('data->>phone',`%${digits}%`):query.ilike('data->>name',`%${q}%`);
 }
 if(from)query=query.gte('created_at',from+'T00:00:00+07:00');
 if(to)query=query.lt('created_at',new Date(Date.parse(to+'T00:00:00+07:00')+86400000).toISOString());
 const count=(status:string)=>session.supabase.from('consultation_requests').select('request_id',{count:'exact',head:true}).eq('status',status);
 const [result,newCount,contactedCount,completedCount]=await Promise.all([query,count('new'),count('contacted'),count('completed')]);
 const error=[result,newCount,contactedCount,completedCount].find(r=>r.error)?.error;
 if(error)return businessError(error);
 return NextResponse.json({data:result.data,total:result.count,newCount:newCount.count,contactedCount:contactedCount.count,completedCount:completedCount.count},{headers:{'Cache-Control':'private, no-store'}});
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
