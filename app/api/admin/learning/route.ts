import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { templateSchema } from '@/lib/learning';
const settings=z.object({action:z.literal('settings'),revision:z.number().int(),contact_label:z.string().trim().max(100),contact_url:z.union([z.literal(''),z.url().refine(u=>u.startsWith('https://'))]),admin_emails:z.array(z.email()).max(20),email_enabled:z.boolean()}).strict();
const schema=z.discriminatedUnion('action',[
 settings,z.object({action:z.literal('template'),template:templateSchema}).strict(),
 z.object({action:z.literal('default'),template_id:z.string().uuid()}).strict(),
 z.object({action:z.literal('profile'),tutor_id:z.string().uuid(),introduction:z.string().trim().max(2000)}).strict()
]);
export async function GET(){
 const session=await businessSession();if(session.response)return session.response;
 const results=await Promise.all([
 session.supabase.from('learning_templates').select('*').order('program').order('version',{ascending:false}),
 session.supabase.from('learning_defaults').select('*'),
 session.supabase.from('parent_portal_settings').select('*').single(),
 session.supabase.from('tutors').select('tutor_id,name').not('is_deleted','is',true).order('name'),
 session.supabase.from('tutor_public_profiles').select('tutor_id,introduction'),
 session.supabase.from('class_current_state').select('class_id,name,class_type').order('name'),
 session.supabase.from('review_email_outbox').select('outbox_id,month,kind,recipient,status,attempts,error_code,accepted_at').order('created_at',{ascending:false}).limit(100)
 ]);
 const error=results.find(r=>r.error)?.error;if(error)return businessError(error);
 return NextResponse.json({templates:results[0].data,defaults:results[1].data,settings:results[2].data,tutors:results[3].data,profiles:results[4].data,classes:results[5].data,emails:results[6].data,emailConfigured:!!(process.env.RESEND_API_KEY && process.env.CSAT_EMAIL_FROM && process.env.APP_ORIGIN && process.env.CRON_SECRET)},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0].message},{status:422});
 const v=parsed.data;
 if(v.action==='settings' && v.email_enabled && (!v.admin_emails.length || !process.env.RESEND_API_KEY || !process.env.CSAT_EMAIL_FROM || !process.env.APP_ORIGIN || !process.env.CRON_SECRET))
  return NextResponse.json({error:'Cần email admin và cấu hình gửi mail trên Vercel trước khi kích hoạt.'},{status:422});
 const result=v.action==='template'?await session.supabase.rpc('admin_create_learning_template',{p_program:v.template.program,p_title:v.template.title,p_source:v.template.source,p_stages:v.template.stages}):await session.supabase.rpc('admin_learning_settings',{p_action:v.action,p_data:v});
 return result.error?businessError(result.error):NextResponse.json({ok:true,data:result.data});
}
