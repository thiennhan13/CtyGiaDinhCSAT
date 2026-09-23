import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession,businessError } from '@/lib/business-api';
const schema=z.object({kind:z.enum(['review','consultation']),id:z.uuid(),outcome:z.enum(['checked','handled_elsewhere','provider_confirmed']),note:z.string().trim().min(3).max(1000)}).strict();
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Vui lòng nhập kết quả và ghi chú đối chiếu.'},{status:422});
 const v=parsed.data,result=await session.supabase.rpc('reconcile_email',{p_kind:v.kind,p_id:v.id,p_outcome:v.outcome,p_note:v.note});
 return result.error?businessError(result.error):NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
}
