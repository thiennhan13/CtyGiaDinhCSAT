import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession,businessError } from '@/lib/business-api';
import { previewParentImport, type ParentSource, type ExistingParent } from '@/lib/parent-import';
async function snapshot(db:NonNullable<Awaited<ReturnType<typeof businessSession>>['supabase']>){
 const students:ParentSource[]=[],parents:ExistingParent[]=[];
 for(let offset=0;;offset+=500){const r=await db.from('students').select('student_id,name,parent_name,parent_number').not('is_deleted','is',true).order('student_id').range(offset,offset+499);if(r.error)throw r.error;students.push(...r.data);if(r.data.length<500)break;}
 for(let offset=0;;offset+=500){const r=await db.from('parent_accounts').select('parent_id,display_name,phone,active').order('parent_id').range(offset,offset+499);if(r.error)throw r.error;parents.push(...r.data);if(r.data.length<500)break;}
 const rows=previewParentImport(students,parents);
 return {rows,token:createHash('sha256').update(JSON.stringify([students,parents])).digest('hex')};
}
export async function GET(){
 const session=await businessSession();if(session.response)return session.response;
 try{return NextResponse.json(await snapshot(session.supabase),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return businessError(e);}
}
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const input=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),student_ids:z.array(z.string().uuid()).min(1).max(1000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Danh sách nhập không hợp lệ.'},{status:422});
 try{
  const current=await snapshot(session.supabase);
  if(current.token!==input.data.token)return NextResponse.json({error:'Thông tin nguồn đã thay đổi. Xem lại bản xem trước.'},{status:409});
  const selected=current.rows.filter(r=>input.data.student_ids.includes(r.student_id));
  if(selected.length!==input.data.student_ids.length || selected.some(r=>r.status==='review'))return NextResponse.json({error:'Có dòng cần kiểm tra riêng trước khi nhập.'},{status:422});
  const {data,error}=await session.supabase.rpc('admin_import_parent_contacts',{p_rows:selected.map(r=>({student_id:r.student_id,parent_name:r.parent_name,parent_number:r.parent_number,phone:r.phone}))});
  return error?businessError(error):NextResponse.json(data);
 }catch(e){return businessError(e);}
}
