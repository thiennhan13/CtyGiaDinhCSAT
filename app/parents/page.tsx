import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoadingStatus } from '@/components/ui/LoadingStatus';
import Link from 'next/link';
import { z } from 'zod';
import { ParentLinkForm } from '@/components/auth/ParentLinkForm';
import { parentSession } from '@/lib/parent-auth';
import { monthSchema } from '@/lib/learning';
import type { ParentLearningData } from '@/lib/parent-learning';
import { ParentShell } from '@/components/learning/ParentShell';
import { ParentLogoutButton } from './logout-button';
import { ParentPortalView } from '@/components/learning/ParentPortalView';
export const dynamic = 'force-dynamic';
type PortalProps = { searchParams: Promise<{student?:string;month?:string;page?:string}> };
export default async function ParentPortal(props: PortalProps) {
 // A full document must remain readable without the script that reveals streamed HTML.
 if ((await headers()).get('sec-fetch-dest') !== 'empty') return <ParentOverview {...props} />;
 return <Suspense fallback={<LoadingStatus>Đang mở cổng phụ huynh…</LoadingStatus>}><ParentOverview {...props} /></Suspense>;
}
async function ParentOverview({searchParams}: PortalProps){
 const session=await parentSession();if(!session)redirect('/login');
 if(session.access.state==='unlinked')return <ParentShell navigationEnabled={false}><ParentLinkForm/></ParentShell>;
 if(session.access.state!=='active')return <AccessMessage message="Liên kết đã bị khóa. Vui lòng liên hệ CSAT để kiểm tra."/>;
 const params=await searchParams;
 const parsed=z.object({student:z.string().uuid().optional(),month:monthSchema.optional(),page:z.coerce.number().int().min(0).max(10000).default(0)}).safeParse(params);
 if(!parsed.success)redirect('/parents');
 const {data,error}=await session.supabase.rpc('parent_portal',{p_student_id:parsed.data.student||null,p_month:parsed.data.month||null,p_review_page:parsed.data.page});
 if(error){
  if(error.code==='42501')return <AccessMessage message="Phiên tra cứu đã hết hạn hoặc học sinh không còn được liên kết. Vui lòng đăng nhập lại bằng Google." />;
  return <AccessMessage message="Chưa tải được đầy đủ thông tin. Vui lòng thử lại sau hoặc liên hệ CSAT." />;
 }
 const portal=data as ParentLearningData;
 if(!portal?.student)return <AccessMessage message="Hồ sơ chưa được liên kết với học sinh. Vui lòng liên hệ CSAT để kiểm tra." />;
 return <ParentPortalView portal={portal}/>;
}
function AccessMessage({message}:{message:string}){return <ParentShell navigationEnabled={false}><div className="parent-card space-y-5"><h1 className="text-2xl font-bold">Tra cứu phụ huynh</h1><p role="status">{message}</p><div className="flex gap-3"><Link className="csat-btn" href="/parents">Thử lại</Link><ParentLogoutButton/></div></div></ParentShell>;}
