import {NextResponse} from 'next/server';
import {z} from 'zod';
import {businessSession,businessError} from '@/lib/business-api';
import {monthSchema} from '@/lib/learning';
export async function GET(request:Request){
 const session=await businessSession();if(session.response)return session.response;
 const p=z.object({class_id:z.string().uuid(),month:monthSchema}).safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!p.success)return NextResponse.json({error:'Lớp hoặc tháng không hợp lệ.'},{status:422});
 const r=await session.supabase.rpc('admin_class_reviews',{p_class_id:p.data.class_id,p_month:p.data.month});
 return r.error?businessError(r.error):NextResponse.json(r.data,{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const p=z.object({action:z.enum(['correction','reassign_draft']),review_id:z.string().uuid(),request_id:z.string().uuid(),message:z.string().trim().max(3000).default('')}).strict().safeParse(await request.json().catch(()=>null));
 if(!p.success || p.data.action==='correction'&&!p.data.message)return NextResponse.json({error:'Cần nội dung đính chính và nhận xét hợp lệ.'},{status:422});
 const r=await session.supabase.rpc('admin_review_followup',{p_action:p.data.action,p_review_id:p.data.review_id,p_request_id:p.data.request_id,p_message:p.data.message});
 return r.error?businessError(r.error):NextResponse.json(r.data);
}
