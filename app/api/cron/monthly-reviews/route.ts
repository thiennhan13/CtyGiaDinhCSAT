import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processReviewEmails } from '@/lib/review-email';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const received=Buffer.from(request.headers.get('authorization') || '');
 const expected=Buffer.from('Bearer '+(secret || ''));
 if(!secret || received.length!==expected.length || !timingSafeEqual(received,expected))
  return NextResponse.json({error:'Không có quyền truy cập.'},{status:401});
 if(process.env.VERCEL_ENV!=='production')return NextResponse.json({skipped:'production_only'});
 try{return NextResponse.json(await processReviewEmails(true),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Chưa xử lý được email. Kiểm tra cấu hình và nhật ký.'},{status:503});}
}
