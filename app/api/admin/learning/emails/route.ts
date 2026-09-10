import { NextResponse } from 'next/server';
import { businessSession } from '@/lib/business-api';
import { processReviewEmails } from '@/lib/review-email';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const session=await businessSession(true,request);if(session.response)return session.response;
 if(process.env.VERCEL_ENV!=='production')return NextResponse.json({error:'Gửi email chỉ được bật trên production.'},{status:422});
 try{return NextResponse.json(await processReviewEmails(false));}
 catch{return NextResponse.json({error:'Chưa xử lý được email. Kiểm tra cấu hình và nhật ký.'},{status:503});}
}
