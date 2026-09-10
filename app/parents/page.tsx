import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/service';
import { readLookupHash } from '@/lib/parent-lookup';
import { monthSchema } from '@/lib/learning';
import type { ParentLearningData } from '@/lib/parent-learning';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import { ParentLogoutButton } from './logout-button';
import { ParentPortalView } from '@/components/learning/ParentPortalView';
export const dynamic = 'force-dynamic';
export default async function ParentPortal({searchParams}:{searchParams:Promise<{student?:string;month?:string;page?:string}>}){
 const hash=await readLookupHash();if(!hash)redirect('/login');
 const params=await searchParams;
 const parsed=z.object({student:z.string().uuid().optional(),month:monthSchema.optional(),page:z.coerce.number().int().min(0).max(10000).default(0)}).safeParse(params);
 if(!parsed.success)redirect('/parents');
 const {data,error}=await createAdminClient().rpc('parent_learning_portal',{p_token_hash:hash,p_student_id:parsed.data.student||null,p_month:parsed.data.month||null,p_review_page:parsed.data.page});
 if(error){
  if(error.code==='42501')return <AccessMessage message="Phiên tra cứu đã hết hạn hoặc học sinh không còn được liên kết. Vui lòng đóng tra cứu và nhập lại số điện thoại." />;
  return <AccessMessage message="Chưa tải được đầy đủ thông tin. Vui lòng thử lại sau hoặc liên hệ CSAT." />;
 }
 const portal=data as ParentLearningData;
 if(!portal?.student)return <AccessMessage message="Hồ sơ chưa được liên kết với học sinh. Vui lòng liên hệ CSAT để kiểm tra." />;
 return <ParentPortalView portal={portal}/>;
}
function AccessMessage({message}:{message:string}){return <div className="min-h-screen bg-background"><CsatNavbar variant="guest"/><main className="mx-auto max-w-xl space-y-5 px-4 pt-28"><h1 className="text-2xl font-bold">Tra cứu phụ huynh</h1><p role="status">{message}</p><div className="flex gap-3"><Link className="csat-btn" href="/parents">Thử lại</Link><ParentLogoutButton/></div></main></div>;}
