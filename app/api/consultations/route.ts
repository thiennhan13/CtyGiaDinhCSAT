import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/service';
import { consultationSchema } from '@/lib/consultations';
import { recommendedProgram } from '@/lib/learning-guidance';
import { consultationMailPayload, sendConsultationEmail } from '@/lib/consultation-email';
export const runtime='nodejs';
export const maxDuration=30;
function reply(body:object,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
async function boundedJson(request:Request){
 if(Number(request.headers.get('content-length'))>16000)throw new Error('large');
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>16000){await reader.cancel();throw new Error('large');}chunks.push(chunk.value);}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function POST(request:Request){
 const deadline=Date.now()+26000;
 const origin=request.headers.get('origin');
 const expected=process.env.APP_ORIGIN||new URL(request.url).origin;
 if(!origin||origin!==expected||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply({error:'Dữ liệu không hợp lệ.'},415);
 let raw:unknown;try{raw=await boundedJson(request);}catch(e){return reply({error:'Dữ liệu không hợp lệ hoặc vượt giới hạn.'},e instanceof Error&&e.message==='large'?413:422);}
 const parsed=consultationSchema.safeParse(raw);if(!parsed.success)return reply({error:'Vui lòng kiểm tra tên, số điện thoại, email và các mục bắt buộc.',fields:parsed.error.issues.map(i=>i.path[0])},422);
 const input=parsed.data;
 if(input.program!==recommendedProgram(input.level,input.goal))return reply({error:'Vui lòng chọn lại hướng học.'},422);
 if(process.env.CONSULTATIONS_ENABLED!=='true'||!process.env.CONSULTATIONS_HASH_KEY)return reply({error:'Form tư vấn đang được chuẩn bị. Vui lòng liên hệ Facebook CSAT Tutor hoặc thử lại sau.'},503);
 // Vercel overwrites x-vercel-forwarded-for. Ignore client-supplied forwarding headers elsewhere.
 const ip=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown':'local';
 const sourceHash=createHmac('sha256',process.env.CONSULTATIONS_HASH_KEY).update(ip).digest('hex');
 const {request_id,website,...data}=input;void website;
 try{
  const db=createAdminClient();
  const result=await db.rpc('submit_consultation',{p_id:request_id,p_data:data,p_source_hash:sourceHash,p_payload:consultationMailPayload(input)}).abortSignal(AbortSignal.timeout(7000));
  if(result.error){if(result.error.code==='P0429')return reply({error:'Bạn đã gửi nhiều yêu cầu gần đây. Vui lòng thử lại sau một giờ.'},429);if(result.error.code==='23505')return reply({error:'Mã yêu cầu đã được dùng cho nội dung khác. Vui lòng tải lại trang.'},409);return reply({error:'Chưa lưu được yêu cầu. Thông tin vẫn được giữ để bạn thử lại.'},503);}
  // A mail failure must not turn a successfully saved consultation into a failed form submission.
  try{await sendConsultationEmail(request_id,deadline);}catch{/* Retained in outbox for the admin; never log personal data. */}
  return reply({ok:true,request_id},201);
 }catch{return reply({error:'Chưa lưu được yêu cầu. Vui lòng thử lại.'},503);}
}
